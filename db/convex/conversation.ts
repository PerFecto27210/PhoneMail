import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";

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

async function assertNoBlocks(
  ctx: ReadCtx,
  participantIds: Id<"users">[],
): Promise<void> {
  for (let i = 0; i < participantIds.length; i += 1) {
    for (let j = i + 1; j < participantIds.length; j += 1) {
      const [first, second] = [participantIds[i]!, participantIds[j]!];
      const [firstBlockedSecond, secondBlockedFirst] = await Promise.all([
        ctx.db
          .query("blocks")
          .withIndex("by_pair", (q) =>
            q.eq("blockerId", first).eq("blockedId", second),
          )
          .first(),
        ctx.db
          .query("blocks")
          .withIndex("by_pair", (q) =>
            q.eq("blockerId", second).eq("blockedId", first),
          )
          .first(),
      ]);
      if (firstBlockedSecond || secondBlockedFirst) {
        fail("blocked", "A conversation cannot be created because a participant has blocked another participant.");
      }
    }
  }
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
    await assertNoBlocks(ctx, [currentUser._id, recipientId]);

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
    title: v.optional(v.string()),
  },
  handler: async (ctx, { recipientIds, title }) => {
    const currentUser = await requireCurrentUser(ctx);
    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (userId) => userId !== currentUser._id,
    );
    if (uniqueRecipients.length < 2) {
      fail("invalid_group", "A group conversation requires at least two recipients.");
    }

    const recipientUsers = await Promise.all(uniqueRecipients.map((id) => ctx.db.get(id)));
    if (recipientUsers.some((user) => !user)) {
      fail("recipient_not_found", "One or more recipients do not exist.");
    }
    const participantIds = [currentUser._id, ...uniqueRecipients];
    await assertNoBlocks(ctx, participantIds);

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      ...(title === undefined ? {} : { title }),
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
        const [lastMessage, unreadMessages, memberRecords] = await Promise.all([
          ctx.db
            .query("messages")
            .withIndex("by_conversation_created_at", (q) =>
              q.eq("conversationId", conversation._id),
            )
            .order("desc")
            .first(),
          ctx.db
            .query("messages")
            .withIndex("by_conversation_created_at", (q) => {
              const range = q.eq("conversationId", conversation._id);
              return membership.lastReadAt === undefined
                ? range
                : range.gt("createdAt", membership.lastReadAt);
            })
            .collect(),
          ctx.db
            .query("conversationMembers")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
            .collect(),
        ]);
        const participants = await Promise.all(
          memberRecords.map(async (member) => ctx.db.get(member.userId)),
        );
        const unreadCount = unreadMessages.filter(
          (message) => message.senderId !== currentUser._id,
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
            profileImage: participant.profileImage ?? null,
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
