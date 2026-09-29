export function extractVerificationCodeFromMessageBody(body: string): string | null {
  const match = /\bverification\s+code\s+(?:is\s+)?(\d{6})\b/i.exec(body);
  return match?.[1] ?? null;
}

export function extractOtpFromTwilioResponse(response: unknown): string | null {
  if (typeof response !== "object" || response === null || !("body" in response)) {
    return null;
  }

  const body = response.body;
  return typeof body === "string" ? extractVerificationCodeFromMessageBody(body) : null;
}
