import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { makeFunctionReference } from "convex/server";
import { hasActiveAuthSession } from "./auth";
import { requireCurrentUser } from "./user";
import { conversationHasBlockRelationship } from "./blockPolicy";
import { resolveAttachmentUploads } from "./attachments";
import { canEditMessage, isValidEditedBody, MAX_MESSAGE_BODY_LENGTH } from "./messagePolicy";

const MAX_SUBJECT_LENGTH = 200;
const sendNewMessageSmsRef = makeFunctionReference<"action", { to: string; sender: string; subject: string }>(
  "notifications:sendNewMessageSms",
);
type ReadCtx = QueryCtx | MutationCtx;

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function requireMembership(
  ctx: ReadCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("by_user_conversation", (q) =>
      q.eq("userId", userId).eq("conversationId", conversationId),
    )
    .first();
  if (!membership) fail("forbidden", "You are not a member of this conversation.");
  return membership;
}

function validateContent(body: string, subject?: string, hasAttachments = false): void {
  if (!body.trim() && !hasAttachments) fail("invalid_message", "Write a message or attach a file.");
  if (body.length > MAX_MESSAGE_BODY_LENGTH) {
    fail("invalid_message", `Message body cannot exceed ${MAX_MESSAGE_BODY_LENGTH} characters.`);
  }
  if (subject !== undefined && subject.length > MAX_SUBJECT_LENGTH) {
    fail("invalid_message", `Message subject cannot exceed ${MAX_SUBJECT_LENGTH} characters.`);
  }
}

export const editMessage = mutation({
  args: { messageId: v.id("messages"), body: v.string() },
  handler: async (ctx, { messageId, body }) => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) fail("message_not_found", "Message not found.");
    if (message.senderId !== user._id) fail("forbidden", "You can only edit your own messages.");
    if (!canEditMessage(message.createdAt, Date.now(), message.deletedAt !== undefined)) {
      fail("edit_window_expired", "This message can no longer be edited.");
    }
    if (!isValidEditedBody(body, Boolean(message.attachments?.length))) {
      fail("invalid_message", "Write a message or keep an attachment, up to 10,000 characters.");
    }
    const now = Date.now();
    await ctx.db.patch(messageId, { body, editedAt: now, updatedAt: now });
    return messageId;
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) fail("message_not_found", "Message not found.");
    if (message.senderId !== user._id) fail("forbidden", "You can only delete your own messages.");
    if (message.deletedAt !== undefined) return messageId;
    const deletedAt = Date.now();
    for (const attachment of message.attachments ?? []) {
      await ctx.storage.delete(attachment.storageId);
    }
    await ctx.db.patch(messageId, {
      body: "",
      subject: undefined,
      attachments: [],
      deletedAt,
      updatedAt: deletedAt,
    });
    return messageId;
  },
});

function redactDeletedMessage<T extends {
  body: string;
  subject?: string;
  deletedAt?: number;
  attachments?: Array<{ storageId: Id<"_storage"> }>;
}>(message: T) {
  if (message.deletedAt === undefined) return message;
  return { ...message, body: "", subject: undefined, attachments: [] };
}

async function ensureNoBlockedParticipants(
  ctx: ReadCtx,
  conversationId: Id<"conversations">,
): Promise<void> {
  if (await conversationHasBlockRelationship(ctx, conversationId)) {
    fail("blocked", "You cannot send a message to this conversation.");
  }
}

async function createMessage(
  ctx: MutationCtx,
  userId: Id<"users">,
  conversationId: Id<"conversations">,
  body: string,
  subject?: string,
  parentMessageId?: Id<"messages">,
  attachmentUploadIds: Id<"attachmentUploads">[] = [],
) {
  validateContent(body, subject, attachmentUploadIds.length > 0);
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) fail("conversation_not_found", "Conversation not found.");
  await requireMembership(ctx, conversationId, userId);
  await ensureNoBlockedParticipants(ctx, conversationId);
  const preparedUploads = await resolveAttachmentUploads(
    ctx,
    userId,
    conversationId,
    attachmentUploadIds,
  );

  if (parentMessageId) {
    const parent = await ctx.db.get(parentMessageId);
    if (!parent) fail("message_not_found", "The message being replied to does not exist.");
    if (parent.conversationId !== conversationId) {
      fail("invalid_parent", "The parent message belongs to a different conversation.");
    }
    const existingReply = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) => q.eq("parentMessageId", parentMessageId))
      .first();
    if (existingReply) fail("duplicate_reply", "This message has already been replied to.");
  }

  const now = Date.now();
  const messageId = await ctx.db.insert("messages", {
    conversationId,
    senderId: userId,
    body,
    ...(subject === undefined ? {} : { subject }),
    ...(parentMessageId === undefined ? {} : { parentMessageId }),
    ...(preparedUploads.length === 0
      ? {}
      : { attachments: preparedUploads.map(({ attachment }) => attachment) }),
    createdAt: now,
    updatedAt: now,
  });
  for (const { upload } of preparedUploads) {
    await ctx.db.patch(upload._id, { status: "attached", messageId });
  }
  await ctx.db.patch(conversationId, { updatedAt: now });

  const [members, sender] = await Promise.all([
    ctx.db.query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect(),
    ctx.db.get(userId),
  ]);
  for (const member of members) {
    if (member.userId === userId) continue;
    const recipient = await ctx.db.get(member.userId);
    if (!recipient || await hasActiveAuthSession(ctx, recipient.phoneNumber)) continue;
    await ctx.scheduler.runAfter(0, sendNewMessageSmsRef, {
      to: recipient.phoneNumber,
      sender: sender?.name?.trim() || sender?.phoneNumber || "A PhoneMail user",
      subject: subject?.trim() || "(no subject)",
    });
  }
  return messageId;
}

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    subject: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
    attachmentUploadIds: v.optional(v.array(v.id("attachmentUploads"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return createMessage(
      ctx,
      user._id,
      args.conversationId,
      args.body,
      args.subject,
      args.parentMessageId,
      args.attachmentUploadIds,
    );
  },
});

export const replyToMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    parentMessageId: v.id("messages"),
    body: v.string(),
    subject: v.optional(v.string()),
    attachmentUploadIds: v.optional(v.array(v.id("attachmentUploads"))),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return createMessage(
      ctx,
      user._id,
      args.conversationId,
      args.body,
      args.subject,
      args.parentMessageId,
      args.attachmentUploadIds,
    );
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) fail("conversation_not_found", "Conversation not found.");
    await requireMembership(ctx, conversationId, user._id);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
    return Promise.all(messages.map(async (message) => {
      const visible = redactDeletedMessage(message);
      return {
      ...visible,
      attachments: await Promise.all((visible.attachments ?? []).map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.storageId),
      }))),
    }; }));
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) return null;
    await requireMembership(ctx, message.conversationId, user._id);
    const visible = redactDeletedMessage(message);
    return {
      ...visible,
      attachments: await Promise.all((visible.attachments ?? []).map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.storageId),
      }))),
    };
  },
});

export const markRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) fail("message_not_found", "Message not found.");
    await requireMembership(ctx, message.conversationId, user._id);
    const existing = await ctx.db
      .query("messageReads")
      .withIndex("by_user_message", (q) =>
        q.eq("userId", user._id).eq("messageId", messageId),
      )
      .first();
    if (existing) return existing._id;
    return ctx.db.insert("messageReads", { messageId, userId: user._id, readAt: Date.now() });
  },
});
