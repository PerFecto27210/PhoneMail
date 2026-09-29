import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => ctx.db.get(args.conversationId),
});

export const listForUser = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, { phoneNumber }) => {
    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).first();
    if (!user) return [];

    const memberships = await ctx.db.query("conversationMembers").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const conversations = await Promise.all(memberships.map(async (membership) => {
      const conversation = await ctx.db.get(membership.conversationId);
      if (!conversation) return null;
      const members = await ctx.db.query("conversationMembers").withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id)).collect();
      const otherMemberships = members.filter((member) => member.userId !== user._id);
      const contacts = await Promise.all(otherMemberships.map((member) => ctx.db.get(member.userId)));
      const messages = await ctx.db.query("messages").withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id)).collect();
      const orderedMessages = messages.sort((a, b) => a._creationTime - b._creationTime);
      const unread = orderedMessages.filter((message) => message.senderId !== user._id && message._creationTime > (membership.lastReadAt ?? 0)).length;

      return {
        ...conversation,
        favorite: membership.favorite ?? false,
        blocked: membership.blocked ?? false,
        unread,
        contact: contacts.find((contact) => contact !== null) ?? null,
        messages: orderedMessages,
      };
    }));

    return conversations.filter((conversation) => conversation !== null).sort((a, b) => {
      const aLast = a.messages.at(-1)?._creationTime ?? a._creationTime;
      const bLast = b.messages.at(-1)?._creationTime ?? b._creationTime;
      return bLast - aLast;
    });
  },
});

export const createDirect = mutation({
  args: { phoneNumber: v.string(), recipientPhone: v.string() },
  handler: async (ctx, args) => {
    const phoneNumber = args.phoneNumber.replace(/\D/g, "");
    const recipientPhone = args.recipientPhone.replace(/\D/g, "");
    if (!phoneNumber || !recipientPhone) throw new ConvexError("Enter a valid phone number.");
    if (phoneNumber === recipientPhone) throw new ConvexError("You cannot start a conversation with yourself.");

    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).first();
    const recipient = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", recipientPhone)).first();
    if (!user) throw new ConvexError("Your account could not be found. Sign in again.");
    if (!recipient) throw new ConvexError("No PhoneMail account exists for that number yet.");

    const ownMemberships = await ctx.db.query("conversationMembers").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    for (const membership of ownMemberships) {
      const conversation = await ctx.db.get(membership.conversationId);
      if (!conversation || conversation.type !== "direct") continue;
      const members = await ctx.db.query("conversationMembers").withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id)).collect();
      if (members.length === 2 && members.some((member) => member.userId === recipient._id)) return conversation._id;
    }

    const conversationId = await ctx.db.insert("conversations", { type: "direct" });
    await ctx.db.insert("conversationMembers", { conversationId, userId: user._id, lastReadAt: Date.now() });
    await ctx.db.insert("conversationMembers", { conversationId, userId: recipient._id });
    return conversationId;
  },
});

export const setFavorite = mutation({
  args: { phoneNumber: v.string(), conversationId: v.id("conversations"), favorite: v.boolean() },
  handler: async (ctx, args) => updateMembership(ctx, args.phoneNumber, args.conversationId, { favorite: args.favorite }),
});

export const setBlocked = mutation({
  args: { phoneNumber: v.string(), conversationId: v.id("conversations"), blocked: v.boolean() },
  handler: async (ctx, args) => updateMembership(ctx, args.phoneNumber, args.conversationId, { blocked: args.blocked }),
});

export const markRead = mutation({
  args: { phoneNumber: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => updateMembership(ctx, args.phoneNumber, args.conversationId, { lastReadAt: Date.now() }),
});

export const clearMessages = mutation({
  args: { phoneNumber: v.string(), conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    if (!user) throw new ConvexError("Your account could not be found. Sign in again.");
    const members = await ctx.db.query("conversationMembers").withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId)).collect();
    if (!members.some((member) => member.userId === user._id)) throw new ConvexError("You are not a member of this conversation.");
    const messages = await ctx.db.query("messages").withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId)).collect();
    for (const message of messages) await ctx.db.delete(message._id);
    const membership = members.find((member) => member.userId === user._id);
    if (membership) await ctx.db.patch(membership._id, { lastReadAt: Date.now() });
    return messages.length;
  },
});

async function updateMembership(
  ctx: MutationCtx,
  phoneNumber: string,
  conversationId: Id<"conversations">,
  fields: { favorite?: boolean; blocked?: boolean; lastReadAt?: number },
) {
  const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).first();
  if (!user) throw new ConvexError("Your account could not be found. Sign in again.");
  const memberships = await ctx.db.query("conversationMembers").withIndex("by_conversation", (q) => q.eq("conversationId", conversationId)).collect();
  const membership = memberships.find((member) => member.userId === user._id);
  if (!membership) throw new ConvexError("You are not a member of this conversation.");
  await ctx.db.patch(membership._id, fields);
}
