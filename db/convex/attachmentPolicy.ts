export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_ATTACHMENT_NAME_LENGTH = 180;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export type ValidAttachment = {
  fileName: string;
  mimeType: string;
  size: number;
};

export function validateAttachment(
  fileName: string,
  suppliedMimeType: string,
  size: number,
): ValidAttachment | null {
  const normalizedName = fileName.trim();
  if (
    !normalizedName ||
    normalizedName.length > MAX_ATTACHMENT_NAME_LENGTH ||
    /[\\/\u0000-\u001f]/.test(normalizedName) ||
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_ATTACHMENT_SIZE
  ) return null;

  const extension = normalizedName.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  const allowedMimeType = MIME_BY_EXTENSION[extension];
  if (!allowedMimeType) return null;

  const normalizedMimeType = suppliedMimeType.toLowerCase().trim();
  if (normalizedMimeType && normalizedMimeType !== allowedMimeType && normalizedMimeType !== "application/octet-stream") {
    return null;
  }

  return { fileName: normalizedName, mimeType: allowedMimeType, size };
}

export function matchesStorageContentType(expected: string, actual: string | null | undefined): boolean {
  return actual === expected || actual === "application/octet-stream";
}
