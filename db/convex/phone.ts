const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("00")
    ? `+${trimmed.slice(2).replace(/[\s().-]/g, "")}`
    : trimmed.replace(/[\s().-]/g, "");

  return E164_PATTERN.test(normalized) ? normalized : null;
}

export function normalizePhoneSearchPrefix(value: string, localCallingPrefix?: string): string | null {
  const trimmed = value.trim();
  const normalizedNumber = normalizePhoneNumber(trimmed);
  if (normalizedNumber) return normalizedNumber;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 15) return null;
  if (!trimmed.startsWith("+") && !trimmed.startsWith("00") && digits.length === 10 && localCallingPrefix) {
    const normalizedLocal = normalizePhoneNumber(`${localCallingPrefix}${digits}`);
    if (normalizedLocal) return normalizedLocal;
  }
  const prefix = trimmed.startsWith("00") ? `+${digits.slice(2)}` : `+${digits}`;
  return prefix.length > 1 ? prefix : null;
}
