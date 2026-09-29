import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";
import { conversationHasBlockRelationship } from "./blockPolicy";

const MAX_BODY_LENGTH = 10_000;
const MAX_SUBJECT_LENGTH = 200;
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

function validateContent(body: string, subject?: string): void {
  if (!body.trim()) fail("invalid_message", "Message body cannot be empty.");
  if (body.length > MAX_BODY_LENGTH) {
    fail("invalid_message", `Message body cannot exceed ${MAX_BODY_LENGTH} characters.`);
  }
  if (subject !== undefined && subject.length > MAX_SUBJECT_LENGTH) {
    fail("invalid_message", `Message subject cannot exceed ${MAX_SUBJECT_LENGTH} characters.`);
  }
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
) {
  validateContent(body, subject);
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) fail("conversation_not_found", "Conversation not found.");
  await requireMembership(ctx, conversationId, userId);
  await ensureNoBlockedParticipants(ctx, conversationId);

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
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(conversationId, { updatedAt: now });
  return messageId;
}

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return createMessage(ctx, user._id, args.conversationId, args.body, args.subject);
  },
});

export const replyToMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    parentMessageId: v.id("messages"),
    body: v.string(),
    subject: v.optional(v.string()),
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
    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const user = await requireCurrentUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) return null;
    await requireMembership(ctx, message.conversationId, user._id);
    return message;
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
