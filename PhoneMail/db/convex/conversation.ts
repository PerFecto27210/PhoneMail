import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const createConversation = mutation({
  args: {
    type: v.union(
      v.literal("direct"),
      v.literal("group")
    ),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      type: args.type,
    });
  },
});