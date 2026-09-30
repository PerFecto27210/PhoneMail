export type TypingRecordLike = {
  userId: string;
  expiresAt: number;
};

export function getActiveTypingUserIds<T extends string>(
  records: (TypingRecordLike & { userId: T })[],
  currentUserId: T,
  now: number,
): T[] {
  return [...new Set(
    records
      .filter((record) => record.userId !== currentUserId && record.expiresAt > now)
      .map((record) => record.userId),
  )];
}
