export type VerificationRecord = { value: string; expiresAt: Date | number };

export type VerificationAdapter = {
  findVerificationValue: (identifier: string) => Promise<VerificationRecord | null>;
  createVerificationValue: (record: {
    identifier: string;
    value: string;
    expiresAt: Date;
  }) => Promise<unknown>;
  updateVerificationByIdentifier: (
    identifier: string,
    update: { value: string; expiresAt?: Date },
  ) => Promise<unknown>;
  consumeVerificationValue: (identifier: string) => Promise<VerificationRecord | null>;
};

const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_REQUESTS_PER_HOUR = 5;

function expirationTimestamp(expiresAt: Date | number): number | null {
  const timestamp = expiresAt instanceof Date ? expiresAt.getTime() : expiresAt;
  return Number.isFinite(timestamp) ? timestamp : null;
}

export async function keyedHash(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function storeOtpHash(
  adapter: VerificationAdapter,
  secret: string,
  phoneNumber: string,
  code: string,
): Promise<void> {
  const stored = await adapter.findVerificationValue(phoneNumber);
  if (!stored) throw new Error("Could not save verification state.");
  const hash = await hashOtpValue(secret, phoneNumber, code);
  await adapter.updateVerificationByIdentifier(phoneNumber, { value: `${hash}:0` });
}

export async function hashOtpValue(
  secret: string,
  phoneNumber: string,
  code: string,
): Promise<string> {
  return keyedHash(secret, `phonemail-otp:${phoneNumber}:${code}`);
}

export async function consumeRequestBudget(
  adapter: VerificationAdapter,
  secret: string,
  phoneNumber: string,
  now: number,
): Promise<void> {
  const identifier = `phonemail-otp-request:${await keyedHash(secret, phoneNumber)}`;
  const current = await adapter.findVerificationValue(identifier);
  let windowStartedAt = now;
  let requestCount = 0;
  let lastRequestedAt = 0;

  if (current) {
    const expiresAt = expirationTimestamp(current.expiresAt);
    if (expiresAt === null) {
      throw new Error("Could not validate the verification request limit.");
    }
    if (expiresAt > now) {
      const parts = current.value.split(":").map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isSafeInteger(part))) {
        throw new Error("Could not validate the verification request limit.");
      }
      windowStartedAt = parts[0] ?? now;
      requestCount = parts[1] ?? 0;
      lastRequestedAt = parts[2] ?? 0;
      if (now - lastRequestedAt < OTP_RESEND_COOLDOWN_MS) {
        throw new Error("Please wait before requesting another verification code.");
      }
      if (requestCount >= OTP_MAX_REQUESTS_PER_HOUR) {
        throw new Error("Too many verification code requests. Try again later.");
      }
    }
  }

  const next = {
    identifier,
    value: `${windowStartedAt}:${requestCount + 1}:${now}`,
    expiresAt: new Date(windowStartedAt + 60 * 60 * 1000),
  };
  if (current) await adapter.updateVerificationByIdentifier(identifier, next);
  else await adapter.createVerificationValue(next);
}

export async function verifyAndConsumeOtp(
  adapter: VerificationAdapter,
  secret: string,
  phoneNumber: string,
  code: string,
  now: number,
  maxAttempts: number,
): Promise<boolean> {
  const stored = await adapter.consumeVerificationValue(phoneNumber);
  if (!stored) return false;
  const expiresAt = expirationTimestamp(stored.expiresAt);
  if (expiresAt === null || expiresAt <= now) return false;

  const [storedHash, attemptCount = "0"] = stored.value.split(":");
  const attempts = Number(attemptCount);
  if (!storedHash || !Number.isInteger(attempts) || attempts >= maxAttempts) return false;

  const candidateHash = await hashOtpValue(secret, phoneNumber, code);
  if (constantTimeEqual(candidateHash, storedHash)) return true;

  await adapter.createVerificationValue({
    identifier: phoneNumber,
    value: `${storedHash}:${attempts + 1}`,
    expiresAt: new Date(expiresAt),
  });
  return false;
}

export async function ensurePhoneUser<T>(
  findExisting: () => Promise<T | null>,
  create: () => Promise<unknown>,
): Promise<boolean> {
  if (await findExisting()) return false;
  await create();
  return true;
}
