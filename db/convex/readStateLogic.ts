export type ReadStateMessage = {
  senderId: string;
  createdAt: number;
  deletedAt?: number;
};

export function countUnreadMessages(
  messages: ReadStateMessage[],
  userId: string,
  lastReadAt?: number,
): number {
  return messages.filter(
    (message) =>
      message.senderId !== userId &&
      message.deletedAt === undefined &&
      (lastReadAt === undefined || message.createdAt > lastReadAt),
  ).length;
}
