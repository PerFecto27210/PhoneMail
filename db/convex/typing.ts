import { ConvexError, v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";
import { getActiveTypingUserIds } from "./typingLogic";
import { conversationHasBlockRelationship } from "./blockPolicy";

const TYPING_TTL_MS = 3_000;
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

const expireTypingRef = makeFunctionReference<
  "mutation",
  { typingId: Id<"typing">; expiresAt: number }
>("typing:expireTyping");

export const startTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await requireCurrentUser(ctx);
    await requireMembership(ctx, conversationId, user._id);
    if (await conversationHasBlockRelationship(ctx, conversationId)) {
      fail("blocked", "Typing indicators are unavailable in this conversation.");
    }

    const now = Date.now();
    const expiresAt = now + TYPING_TTL_MS;
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", conversationId),
      )
      .first();

    let typingId: Id<"typing">;
    if (existing) {
      typingId = existing._id;
      await ctx.db.patch(typingId, { expiresAt });
    } else {
      typingId = await ctx.db.insert("typing", {
        conversationId,
        userId: user._id,
        expiresAt,
      });
    }

    await ctx.scheduler.runAfter(TYPING_TTL_MS, expireTypingRef, { typingId, expiresAt });
    return { typingId, expiresAt };
  },
});

export const stopTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await requireCurrentUser(ctx);
    await requireMembership(ctx, conversationId, user._id);
    const existing = await ctx.db
      .query("typing")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", conversationId),
      )
      .first();
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});

export const getTypingUsers = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const currentUser = await requireCurrentUser(ctx);
    await requireMembership(ctx, conversationId, currentUser._id);
    if (await conversationHasBlockRelationship(ctx, conversationId)) return [];

    const now = Date.now();
    const records = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    const activeIds = getActiveTypingUserIds(records, currentUser._id, now);
    const users = await Promise.all(activeIds.map((userId) => ctx.db.get(userId)));
    return users
      .filter((user) => user !== null)
      .map((user) => ({ userId: user._id, name: user.name ?? null, avatarUrl: user.avatarUrl ?? null }));
  },
});

export const expireTyping = internalMutation({
  args: {
    typingId: v.id("typing"),
    expiresAt: v.number(),
  },
  handler: async (ctx, { typingId, expiresAt }) => {
    const record = await ctx.db.get(typingId);
    if (!record || record.expiresAt !== expiresAt || record.expiresAt > Date.now()) return false;
    await ctx.db.delete(typingId);
    return true;
  },
});
