import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phoneNumber: v.string(),
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    termsAcceptedAt: v.optional(v.number()),
    onboardingCompletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_phone", ["phoneNumber"])
    .searchIndex("search_name", { searchField: "name" }),

  otpVerifications: defineTable({
    phoneNumber: v.string(),

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

    // Stable identity for a direct conversation; members remain normalized separately.
    directKey: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_direct_key", ["directKey"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),

    joinedAt: v.number(),

    // Useful for unread counts
    lastReadAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", [
      "userId",
      "conversationId",
    ])
    .index("by_conversation_user", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),

    body: v.string(),

    subject: v.optional(v.string()),

    parentMessageId: v.optional(
      v.id("messages")
    ),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Retained for compatibility with earlier message documents.
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created_at", ["conversationId", "createdAt"])
    .index("by_sender", ["senderId"])
    .index("by_parent_message", ["parentMessageId"]),

  messageReads: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    readAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_user_message", [
      "userId",
      "messageId",
    ]),

  typing: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", [
      "userId",
      "conversationId",
    ]),

  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", [
      "blockerId",
      "blockedId",
    ]),
});
