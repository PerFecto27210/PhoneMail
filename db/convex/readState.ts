import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";
import { countUnreadMessages } from "./readStateLogic";

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

async function countUnreadForMembership(
  ctx: ReadCtx,
  membership: {
    conversationId: Id<"conversations">;
    userId: Id<"users">;
    lastReadAt?: number;
  },
): Promise<number> {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_created_at", (q) => {
      const conversationQuery = q.eq("conversationId", membership.conversationId);
      return membership.lastReadAt === undefined
        ? conversationQuery
        : conversationQuery.gt("createdAt", membership.lastReadAt);
    })
    .collect();

  return countUnreadMessages(messages, membership.userId, membership.lastReadAt);
}

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await requireCurrentUser(ctx);
    const membership = await requireMembership(ctx, conversationId, user._id);
    const lastReadAt = Date.now();
    await ctx.db.patch(membership._id, { lastReadAt });
    return { conversationId, lastReadAt };
  },
});

export const getConversationUnreadState = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await requireCurrentUser(ctx);
    const membership = await requireMembership(ctx, conversationId, user._id);
    return {
      conversationId,
      lastReadAt: membership.lastReadAt ?? null,
      unreadCount: await countUnreadForMembership(ctx, membership),
    };
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const perConversation = await Promise.all(
      memberships.map(async (membership) => ({
        conversationId: membership.conversationId,
        unreadCount: await countUnreadForMembership(ctx, membership),
      })),
    );
    return perConversation.reduce((total, state) => total + state.unreadCount, 0);
  },
});
