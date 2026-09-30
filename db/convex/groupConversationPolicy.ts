export function normalizeGroupRecipientIds<T extends string>(
  currentUserId: T,
  recipientIds: readonly T[],
): T[] {
  return [...new Set(recipientIds)].filter((userId) => userId !== currentUserId);
}
