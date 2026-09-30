import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";
import { normalizeGroupRecipientIds } from "./groupConversationPolicy";

type ReadCtx = QueryCtx | MutationCtx;

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

function directKey(first: string, second: string): string {
  return [first, second].sort().join(":");
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

async function findDirectConversation(
  ctx: MutationCtx,
  firstId: Id<"users">,
  secondId: Id<"users">,
) {
  const key = directKey(firstId, secondId);
  const indexed = await ctx.db
    .query("conversations")
    .withIndex("by_direct_key", (q) => q.eq("directKey", key))
    .first();
  if (indexed) {
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", indexed._id),
      )
      .collect();
    if (
      indexed.type !== "direct" ||
      members.length !== 2 ||
      !members.some((member) => member.userId === firstId) ||
      !members.some((member) => member.userId === secondId)
    ) {
      fail("invalid_conversation", "The stored direct conversation is inconsistent.");
    }
    return indexed;
  }

  // Reuse direct conversations created before directKey was added.
  const memberships = await ctx.db
    .query("conversationMembers")
    .withIndex("by_user", (q) => q.eq("userId", firstId))
    .collect();
  for (const membership of memberships) {
    const conversation = await ctx.db.get(membership.conversationId);
    if (!conversation || conversation.type !== "direct") continue;
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect();
    if (
      members.length === 2 &&
      members.some((member) => member.userId === firstId) &&
      members.some((member) => member.userId === secondId)
    ) {
      await ctx.db.patch(conversation._id, { directKey: key });
      return { ...conversation, directKey: key };
    }
  }
  return null;
}

export const getOrCreateDirectConversation = mutation({
  args: { recipientId: v.id("users") },
  handler: async (ctx, { recipientId }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (recipientId === currentUser._id) {
      fail("invalid_recipient", "You cannot start a direct conversation with yourself.");
    }
    const recipient = await ctx.db.get(recipientId);
    if (!recipient) fail("recipient_not_found", "The recipient does not exist.");
    const [blockedByCurrentUser, blockedByRecipient] = await Promise.all([
      ctx.db.query("blocks").withIndex("by_pair", (q) => q.eq("blockerId", currentUser._id).eq("blockedId", recipientId)).first(),
      ctx.db.query("blocks").withIndex("by_pair", (q) => q.eq("blockerId", recipientId).eq("blockedId", currentUser._id)).first(),
    ]);
    if (blockedByCurrentUser || blockedByRecipient) {
      fail("blocked", "You cannot start a direct conversation with this user.");
    }

    const existing = await findDirectConversation(ctx, currentUser._id, recipientId);
    if (existing) {
      // Ensure even legacy or malformed records cannot be returned to a nonmember.
      await requireMembership(ctx, existing._id, currentUser._id);
      return existing;
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "direct",
      directKey: directKey(currentUser._id, recipientId),
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: currentUser._id,
      joinedAt: now,
    });
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: recipientId,
      joinedAt: now,
    });
    return await ctx.db.get(conversationId);
  },
});

export const createGroupConversation = mutation({
  args: {
    recipientIds: v.array(v.id("users")),
    title: v.string(),
  },
  handler: async (ctx, { recipientIds, title }) => {
    const currentUser = await requireCurrentUser(ctx);
    const uniqueRecipients = normalizeGroupRecipientIds(currentUser._id, recipientIds);
    if (uniqueRecipients.length < 2) {
      fail("invalid_group", "A group conversation requires at least two recipients.");
    }
    if (!title.trim() || title.trim().length > 200) {
      fail("invalid_title", "Group subject must be between 1 and 200 characters.");
    }

    const recipientUsers = await Promise.all(uniqueRecipients.map((id) => ctx.db.get(id)));
    if (recipientUsers.some((user) => !user)) {
      fail("recipient_not_found", "One or more recipients do not exist.");
    }
    const participantIds = [currentUser._id, ...uniqueRecipients];

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      title: title.trim(),
      createdAt: now,
      updatedAt: now,
    });
    for (const userId of participantIds) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
        joinedAt: now,
      });
    }
    return await ctx.db.get(conversationId);
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const currentUser = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    await requireMembership(ctx, conversationId, currentUser._id);
    return conversation;
  },
});

export const toggleFavorite = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const currentUser = await requireCurrentUser(ctx);
    const membership = await requireMembership(ctx, conversationId, currentUser._id);
    const isStarred = !membership.isStarred;
    await ctx.db.patch(membership._id, { isStarred });
    return isStarred;
  },
});

export const listMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();
    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const conversation = await ctx.db.get(membership.conversationId);
        if (!conversation) return null;
        const [conversationMessages, memberRecords] = await Promise.all([
          ctx.db
            .query("messages")
            .withIndex("by_conversation_created_at", (q) =>
              q.eq("conversationId", conversation._id),
            )
            .order("desc")
            .collect(),
          ctx.db
            .query("conversationMembers")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
            .collect(),
        ]);
        const participants = await Promise.all(
          memberRecords.map(async (member) => ctx.db.get(member.userId)),
        );
        const visibleMessages = conversationMessages.filter((message) => message.deletedAt === undefined);
        const lastMessage = visibleMessages[0];
        const unreadCount = visibleMessages.filter((message) =>
          message.senderId !== currentUser._id &&
          (membership.lastReadAt === undefined || message.createdAt > membership.lastReadAt),
        ).length;
        return {
          conversation,
          membership,
          lastMessage,
          unreadCount,
          participants: participants.flatMap((participant) => participant ? [{
            _id: participant._id,
            name: participant.name ?? null,
            phoneNumber: participant.phoneNumber,
            avatarUrl: participant.avatarUrl ?? null,
          }] : []),
        };
      }),
    );
    return conversations.filter((entry) => entry !== null);
  },
});

export const getConversationMembers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const currentUser = await requireCurrentUser(ctx);
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    await requireMembership(ctx, conversationId, currentUser._id);

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    return Promise.all(
      memberships.map(async (membership) => ({
        membership,
        user: await ctx.db.get(membership.userId),
      })),
    );
  },
});
