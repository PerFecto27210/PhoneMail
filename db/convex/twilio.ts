import { httpAction } from "./_generated/server";
import { requestPhoneNumberOtp, verifyPhoneNumberOtp } from "./auth";
import { normalizePhoneNumber } from "./phone";

type TwilioForm = Map<string, string[]>;

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
}

function xmlResponse(xml: string, status = 200): Response {
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function say(text: string): string {
  return `<Say>${escapeXml(text)}</Say>`;
}

function gather(action: string, digits: number, prompt: string): string {
  return `<Gather input="dtmf" action="${escapeXml(action)}" method="POST" numDigits="${digits}" timeout="8">${say(prompt)}</Gather>`;
}

function failureResponse(): Response {
  return xmlResponse(`<Response>${say("We could not complete your request. Please call again later.")}<Hangup/></Response>`);
}

function verificationFailureResponse(): Response {
  return xmlResponse(
    `<Response>${say("That code was incorrect, expired, or has reached its attempt limit. Please call again to request a new code.")}<Hangup/></Response>`,
  );
}

async function readAndValidateTwilioForm(request: Request): Promise<TwilioForm | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("X-Twilio-Signature");
  if (
    !authToken ||
    !signature ||
    !request.headers.get("Content-Type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")
  ) {
    return null;
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return null;
  }

  const parameters = new Map<string, string[]>();
  for (const [key, value] of incoming.entries()) {
    if (typeof value !== "string") return null;
    const values = parameters.get(key) ?? [];
    values.push(value);
    parameters.set(key, values);
  }

  let signedPayload = request.url;
  for (const key of [...parameters.keys()].sort()) {
    const values = parameters.get(key)!.sort();
    for (const value of values) signedPayload += key + value;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(signedPayload)),
  );
  const expected = btoa(String.fromCharCode(...digest));
  if (!constantTimeEqual(expected, signature)) return null;
  return parameters;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function field(form: TwilioForm, name: string): string | undefined {
  return form.get(name)?.[0];
}

function actionUrl(request: Request, path: string): string {
  return new URL(path, request.url).toString();
}

export const handleWelcome = httpAction(async (_ctx, request) => {
  if (!(await readAndValidateTwilioForm(request))) {
    return new Response("Forbidden", { status: 403 });
  }
  const xml = `<Response>${gather(
    actionUrl(request, "/ivr/menu"),
    1,
    "Welcome to PhoneMail. Press 1 to create or verify your PhoneMail account.",
  )}${say("We did not receive a selection. Goodbye.")}<Hangup/></Response>`;
  return xmlResponse(xml);
});

export const handleMenu = httpAction(async (ctx, request) => {
  const form = await readAndValidateTwilioForm(request);
  if (!form) return new Response("Forbidden", { status: 403 });

  const digits = field(form, "Digits");
  const phoneNumber = normalizePhoneNumber(field(form, "From") ?? "");
  if (!phoneNumber) return failureResponse();
  if (digits !== "1") {
    const xml = `<Response>${gather(
      actionUrl(request, "/ivr/menu"),
      1,
      "Invalid selection. Press 1 to create or verify your PhoneMail account.",
    )}${say("We did not receive a valid selection. Goodbye.")}<Hangup/></Response>`;
    return xmlResponse(xml);
  }

  try {
    await requestPhoneNumberOtp(ctx, phoneNumber);
  } catch {
    return failureResponse();
  }

  const xml = `<Response>${gather(
    actionUrl(request, "/ivr/verify"),
    6,
    "We sent a verification code by text message. Enter the six digit code now.",
  )}${say("We did not receive a verification code. Please call again.")}<Hangup/></Response>`;
  return xmlResponse(xml);
});

export const handleVerification = httpAction(async (ctx, request) => {
  const form = await readAndValidateTwilioForm(request);
  if (!form) return new Response("Forbidden", { status: 403 });

  const code = field(form, "Digits") ?? "";
  const phoneNumber = normalizePhoneNumber(field(form, "From") ?? "");
  if (!phoneNumber || !/^\d{6}$/.test(code)) return failureResponse();

  try {
    if (!(await verifyPhoneNumberOtp(ctx, phoneNumber, code))) {
      return verificationFailureResponse();
    }
  } catch {
    // Better Auth owns expiry and failed-attempt state for this OTP.
    return verificationFailureResponse();
  }

  return xmlResponse(
    `<Response>${say("Your PhoneMail phone number is verified. You can now sign in to the PhoneMail applications.")}<Hangup/></Response>`,
  );
});

export const handleTwilioWebhook = httpAction(async (_ctx, request) => {
  const form = await readAndValidateTwilioForm(request);
  if (!form) return new Response("Forbidden", { status: 403 });

  // Status callbacks are acknowledged only after signature verification. No
  // callback fields are currently needed by the product's database model.
  return new Response(null, { status: 204 });
});
