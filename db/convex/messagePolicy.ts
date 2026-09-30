export const MESSAGE_EDIT_WINDOW_MS = 5 * 60 * 1000;
export const MAX_MESSAGE_BODY_LENGTH = 10_000;

export function canEditMessage(
  createdAt: number,
  now: number,
  deleted: boolean,
): boolean {
  return !deleted && now - createdAt <= MESSAGE_EDIT_WINDOW_MS;
}

export function isValidEditedBody(body: string, hasAttachments: boolean): boolean {
  return body.length <= MAX_MESSAGE_BODY_LENGTH && (Boolean(body.trim()) || hasAttachments);
}
