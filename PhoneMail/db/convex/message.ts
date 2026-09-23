import { v } from "convex/values";
import {  mutation } from "./_generated/server";
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    subject: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
  },

  handler: async (ctx, args) => {

    // 1. authenticate user

    // 2. check conversation membership

    // 3. validate reply rules

    // 4. create message

    // const messageId = await ctx.db.insert("messages", {
    //   conversationId: args.conversationId,
    //   senderId: "", //userId
    //   body: args.body,
    //   subject: args.subject,
    //   parentMessageId: args.parentMessageId,
    //   isRead: false,
    //   isFavorite: false,
    // });

    // return messageId;
  },
});