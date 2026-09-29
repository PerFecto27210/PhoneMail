import { authClient } from "../../../lib/auth-client";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(phoneNumber: string): string | null {
  const trimmed = phoneNumber.trim();
  const normalized = trimmed.startsWith("00")
    ? `+${trimmed.slice(2).replace(/[\s().-]/g, "")}`
    : trimmed.replace(/[\s().-]/g, "");

  return E164_PATTERN.test(normalized) ? normalized : null;
}

export async function requestOtp(phoneNumber: string): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) throw new Error("Enter a valid phone number with its country code.");

  let result: Awaited<ReturnType<typeof authClient.phoneNumber.sendOtp>>;
  try {
    result = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized });
  } catch {
    throw new Error("We could not send a verification code. Check the number and try again.");
  }
  const { error } = result;
  if (error) {
    throw new Error(
      error.status === 429
        ? "Too many requests. Wait a little before requesting another code."
        : "We could not send a verification code. Check the number and try again.",
    );
  }
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) throw new Error("Enter a valid phone number with its country code.");
  if (!/^\d{6}$/.test(code.trim())) {
    throw new Error("Enter the six-digit verification code.");
  }

  let result: Awaited<ReturnType<typeof authClient.phoneNumber.verify>>;
  try {
    result = await authClient.phoneNumber.verify({
      phoneNumber: normalized,
      code: code.trim(),
    });
  } catch {
    throw new Error("That code is invalid or expired. Check it and try again.");
  }
  const { data, error } = result;
  if (error) throw new Error("That code is invalid or expired. Check it and try again.");
  return data.status;
}

export async function signOut(): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error("We could not sign you out. Please try again.");
}
