import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phoneNumber: v.string(),
    emailAddress: v.string(),
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    
  }).index("by_phone", ["phoneNumber"]),
  
  otpVerifications: defineTable({
    phoneNumber: v.string(),

    // Never store the plaintext PIN
    pinHash: v.string(),

    expiresAt: v.number(),

    attempts: v.number(),

    verified: v.boolean(),
  }).index("by_phone", ["phoneNumber"]),

  conversations: defineTable({
    type: v.union(
      v.literal("direct"),
      v.literal("group")
    ),
    title: v.optional(v.string()),
  }),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),

    body: v.string(),
    subject: v.optional(v.string()),

    parentMessageId: v.optional(v.id("messages")),

    isRead: v.boolean(),
    isFavorite: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),
});
