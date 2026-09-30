import { createClient, type CreateAuth } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import { betterAuth } from "better-auth";
import { makeFunctionReference, type FunctionReference } from "convex/server";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { GenericCtx } from "@convex-dev/better-auth";
import { normalizePhoneNumber } from "./phone";
import {
  consumeRequestBudget,
  ensurePhoneUser,
  hashOtpValue,
  storeOtpHash,
  verifyAndConsumeOtp,
} from "./otpState";
import { extractOtpFromTwilioResponse } from "./twilioOtp";

const OTP_EXPIRATION_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;
type TriggerArgs = { model: string; doc: Record<string, unknown> };

function internalTrigger(name: string): FunctionReference<"mutation", "internal", TriggerArgs> {
  return makeFunctionReference<"mutation", TriggerArgs>(name) as unknown as FunctionReference<
    "mutation",
    "internal",
    TriggerArgs
  >;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  if (name === "BETTER_AUTH_SECRET" && value.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  return value;
}

async function sendSms(phoneNumber: string): Promise<string> {
  const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
  const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
  const from = requiredEnv("TWILIO_PHONE_NUMBER");
  // Twilio's configured 2FA messaging flow interprets this template key and
  // returns the generated verification code in the message response body.
  // The Better Auth-generated code is intentionally not sent or used.
  const message = new URLSearchParams({
    To: phoneNumber,
    From: from,
    Body: "sms_2fa",
  });
  let response: Response;
  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: message,
      },
    );
  } catch (error) {
    console.error("Twilio OTP request failed before an HTTP response was received.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new Error("Failed to send verification code.");
  }

  if (!response.ok) {
    let twilioCode: number | undefined;
    try {
      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "code" in result &&
        typeof result.code === "number"
      ) {
        twilioCode = result.code;
      }
    } catch {
      // Twilio errors can have an empty or non-JSON response body.
    }

    // Log only provider status/code, never the phone number, OTP, or response body.
    console.error("Twilio rejected the PhoneMail OTP SMS.", {
      httpStatus: response.status,
      twilioCode,
    });
    throw new Error("Failed to send verification code.");
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error("Twilio response did not include a verification message.");
  }
  const responseCode = extractOtpFromTwilioResponse(result);
  if (!responseCode) throw new Error("Twilio response did not include a verification code.");
  return responseCode;
}

export const authComponent: ReturnType<typeof createClient<DataModel>> = createClient<DataModel>(components.betterAuth, {
  authFunctions: {
    onCreate: internalTrigger("auth:onCreate"),
    onUpdate: internalTrigger("auth:onUpdate"),
    onDelete: internalTrigger("auth:onDelete"),
  },
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        const phoneNumber = normalizePhoneNumber(user.phoneNumber ?? "");
        if (!phoneNumber || phoneNumber !== user.phoneNumber || !user.phoneNumberVerified) return;
        await ensurePhoneUser(
          () => ctx.db
            .query("users")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
            .first(),
          () => ctx.db.insert("users", {
            phoneNumber,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        );
      },
      onUpdate: async (ctx, user) => {
        const phoneNumber = normalizePhoneNumber(user.phoneNumber ?? "");
        if (!phoneNumber || phoneNumber !== user.phoneNumber || !user.phoneNumberVerified) return;
        await ensurePhoneUser(
          () => ctx.db
            .query("users")
            .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
            .first(),
          () => ctx.db.insert("users", {
            phoneNumber,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        );
      },
    },
  },
});

function createAuthInstance(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.WEBCHAT_URL,
      process.env.WEBMAIL_URL,
    ].filter((origin): origin is string => Boolean(origin)),
    user: {
      deleteUser: { enabled: true },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/phone-number/send-otp": { window: 60, max: 10 },
        "/phone-number/verify": { window: 60, max: 30 },
      },
    },
    plugins: [
      convex({ authConfig: { providers: [getAuthConfigProvider()] } }),
      phoneNumber({
        otpLength: 6,
        expiresIn: OTP_EXPIRATION_SECONDS,
        allowedAttempts: OTP_MAX_ATTEMPTS,
        phoneNumberValidator: (phoneNumber) => normalizePhoneNumber(phoneNumber) === phoneNumber,
        signUpOnVerification: {
          getTempEmail: (phoneNumber) =>
            `${phoneNumber.replace(/\D/g, "")}@users.phonemail.invalid`,
          getTempName: () => "PhoneMail user",
        },
        sendOTP: async ({ phoneNumber }, endpointContext) => {
          if (!endpointContext) throw new Error("Could not access OTP storage.");
          const normalized = normalizePhoneNumber(phoneNumber);
          if (!normalized || normalized !== phoneNumber) {
            throw new Error("A valid E.164 phone number is required.");
          }

          const adapter = endpointContext.context.internalAdapter;
          await consumeRequestBudget(
            adapter,
            requiredEnv("BETTER_AUTH_SECRET"),
            normalized,
            Date.now(),
          );
          const responseCode = await sendSms(normalized);
          // Persist only the keyed hash in Better Auth's verification table.
          await storeOtpHash(
            adapter,
            requiredEnv("BETTER_AUTH_SECRET"),
            normalized,
            responseCode,
          );
        },
        verifyOTP: async ({ phoneNumber, code }, endpointContext) => {
          if (!endpointContext) return false;
          const normalized = normalizePhoneNumber(phoneNumber);
          if (!normalized || normalized !== phoneNumber || !/^\d{6}$/.test(code)) return false;

          return verifyAndConsumeOtp(
            endpointContext.context.internalAdapter,
            requiredEnv("BETTER_AUTH_SECRET"),
            normalized,
            code,
            Date.now(),
            OTP_MAX_ATTEMPTS,
          );
        },
      }),
    ],
    databaseHooks: {
      verification: {
        create: {
          before: async (verification) => {
            const phoneNumber = normalizePhoneNumber(verification.identifier);
            const [code, attempts = "0"] = verification.value.split(":");
            if (
              !phoneNumber ||
              phoneNumber !== verification.identifier ||
              !code ||
              !/^\d{6}$/.test(code)
            ) {
              return;
            }

            const codeHash = await hashOtpValue(
              requiredEnv("BETTER_AUTH_SECRET"),
              phoneNumber,
              code,
            );
            return { data: { ...verification, value: `${codeHash}:${attempts}` } };
          },
        },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  });
}

export const createAuth: CreateAuth<DataModel> = createAuthInstance;

export async function deleteCurrentAuthUser(ctx: GenericCtx<DataModel>): Promise<void> {
  const auth = createAuthInstance(ctx);
  const headers = await authComponent.getHeaders(ctx);
  await auth.api.deleteUser({ body: {}, headers });
}

export async function requestPhoneNumberOtp(
  ctx: GenericCtx<DataModel>,
  phoneNumber: string,
): Promise<void> {
  await createAuthInstance(ctx).api.sendPhoneNumberOTP({ body: { phoneNumber } });
}

export async function verifyPhoneNumberOtp(
  ctx: GenericCtx<DataModel>,
  phoneNumber: string,
  code: string,
): Promise<boolean> {
  const result = await createAuthInstance(ctx).api.verifyPhoneNumber({
    body: { phoneNumber, code, disableSession: true },
  });
  return result.status;
}

export const { getAuthUser } = authComponent.clientApi();
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
