import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const attachmentValidator = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  dataUrl: v.string(),
});

export const sendMessage = mutation({
  args: {
    phoneNumber: v.string(),
    conversationId: v.id("conversations"),
    body: v.string(),
    subject: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
    attachments: v.optional(v.array(attachmentValidator)),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    if (!user) throw new ConvexError("Your account could not be found. Sign in again.");
    const members = await ctx.db.query("conversationMembers").withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId)).collect();
    const membership = members.find((member) => member.userId === user._id);
    if (!membership) throw new ConvexError("You are not a member of this conversation.");
    if (membership.blocked) throw new ConvexError("Unblock this conversation before sending a message.");
    if (!args.body.trim() && !args.attachments?.length) throw new ConvexError("Write a message or attach a file first.");
    const attachmentBytes = args.attachments?.reduce((total, attachment) => total + attachment.size, 0) ?? 0;
    if (attachmentBytes > 500_000) throw new ConvexError("Attachments must total 500 KB or less.");
    if (args.parentMessageId) {
      const parent = await ctx.db.get(args.parentMessageId);
      if (!parent || parent.conversationId !== args.conversationId) throw new ConvexError("The reply target is not in this conversation.");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: user._id,
      body: args.body.trim(),
      subject: args.subject,
      parentMessageId: args.parentMessageId,
      attachments: args.attachments,
      isRead: false,
      isFavorite: false,
    });
    await ctx.db.patch(membership._id, { lastReadAt: Date.now() });
    return messageId;
  },
});
