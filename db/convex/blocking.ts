import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./user";

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function findBlock(
  ctx: QueryCtx | MutationCtx,
  blockerId: Id<"users">,
  blockedId: Id<"users">,
) {
  return ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blockerId", blockerId).eq("blockedId", blockedId))
    .first();
}

export const blockUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (userId === currentUser._id) fail("invalid_user", "You cannot block yourself.");
    const target = await ctx.db.get(userId);
    if (!target) fail("user_not_found", "User not found.");

    const existing = await findBlock(ctx, currentUser._id, userId);
    if (existing) return existing._id;
    return ctx.db.insert("blocks", {
      blockerId: currentUser._id,
      blockedId: userId,
      createdAt: Date.now(),
    });
  },
});

export const unblockUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUser = await requireCurrentUser(ctx);
    const existing = await findBlock(ctx, currentUser._id, userId);
    if (!existing) return false;
    await ctx.db.delete(existing._id);
    return true;
  },
});

export const isBlocked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUser = await requireCurrentUser(ctx);
    if (userId === currentUser._id) fail("invalid_user", "Cannot check a block relationship with yourself.");
    const target = await ctx.db.get(userId);
    if (!target) fail("user_not_found", "User not found.");

    const [blockedByMe, blockedMe] = await Promise.all([
      findBlock(ctx, currentUser._id, userId),
      findBlock(ctx, userId, currentUser._id),
    ]);
    return {
      userId,
      blockedByMe: blockedByMe !== null,
      blockedMe: blockedMe !== null,
      isBlocked: blockedByMe !== null || blockedMe !== null,
    };
  },
});

export const getBlockedUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireCurrentUser(ctx);
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", currentUser._id))
      .collect();
    const users = await Promise.all(
      blocks.map(async (block) => ({
        user: await ctx.db.get(block.blockedId),
        blockedAt: block.createdAt,
      })),
    );
    return users.filter((entry) => entry.user !== null);
  },
});
