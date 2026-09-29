"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [phoneNumberClient(), convexClient()],
});

function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();
  const normalized = trimmed.startsWith("00")
    ? `+${trimmed.slice(2).replace(/[\s().-]/g, "")}`
    : trimmed.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error("Enter a phone number with its country code.");
  }
  return normalized;
}

export async function requestOtp(phoneNumber: string): Promise<void> {
  const { error } = await authClient.phoneNumber.sendOtp({
    phoneNumber: normalizePhoneNumber(phoneNumber),
  });
  if (error) throw new Error("Could not send a verification code.");
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
  const { data, error } = await authClient.phoneNumber.verify({
    phoneNumber: normalizePhoneNumber(phoneNumber),
    code: code.trim(),
  });
  if (error) throw new Error("The verification code is invalid or expired.");
  return data.status;
}
