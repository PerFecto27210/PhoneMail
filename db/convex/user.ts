import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent, deleteCurrentAuthUser } from "./auth";
import { normalizePhoneNumber, normalizePhoneSearchPrefix } from "./phone";
import { normalizeProfileName, toPublicSearchUsers } from "./userProfileLogic";

type AuthenticatedCtx = QueryCtx | MutationCtx;

export async function requireCurrentUser(ctx: AuthenticatedCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  const phoneNumber = authUser?.phoneNumber;
  if (
    !authUser?.phoneNumberVerified ||
    !phoneNumber ||
    normalizePhoneNumber(phoneNumber) !== phoneNumber
  ) {
    throw new ConvexError({ code: "unauthenticated", message: "Sign in to continue." });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
    .first();
  if (!user) {
    throw new ConvexError({ code: "not_found", message: "PhoneMail user not found." });
  }
  return user;
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => requireCurrentUser(ctx),
});

export const getOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return {
      termsAccepted: user.termsAcceptedAt !== undefined,
      profileComplete: Boolean(user.avatarUrl),
      onboardingComplete: user.onboardingCompletedAt !== undefined,
      avatarUrl: user.avatarUrl ?? null,
    };
  },
});

export const acceptTerms = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.termsAcceptedAt !== undefined) return user.termsAcceptedAt;
    const acceptedAt = Date.now();
    await ctx.db.patch(user._id, { termsAcceptedAt: acceptedAt, updatedAt: acceptedAt });
    return acceptedAt;
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const completeOnboarding = mutation({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    const user = await requireCurrentUser(ctx);
    if (user.termsAcceptedAt === undefined) {
      throw new ConvexError({ code: "terms_required", message: "Accept the terms before continuing." });
    }
    const avatarUrl = storageId ? await ctx.storage.getUrl(storageId) : null;
    if (storageId && !avatarUrl) {
      throw new ConvexError({ code: "invalid_avatar", message: "The uploaded image is unavailable." });
    }
    const now = Date.now();
    await ctx.db.patch(user._id, {
      ...(avatarUrl ? { avatarUrl } : {}),
      onboardingCompletedAt: now,
      updatedAt: now,
    });
    return { completedAt: now };
  },
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = args.name === undefined ? undefined : normalizeProfileName(args.name);
    if (args.name !== undefined && name === null) {
      throw new ConvexError({ code: "invalid_name", message: "Name must be between 2 and 40 characters." });
    }
    const avatarUrl = args.storageId === undefined ? undefined : await ctx.storage.getUrl(args.storageId);
    if (args.storageId !== undefined && !avatarUrl) {
      throw new ConvexError({ code: "invalid_avatar", message: "The uploaded image is unavailable." });
    }
    await ctx.db.patch(user._id, {
      ...(name == null ? {} : { name }),
      ...(avatarUrl === undefined ? {} : { avatarUrl: avatarUrl ?? undefined }),
      updatedAt: Date.now(),
    });
    return user._id;
  },
});

export const searchUsers = query({
  args: { searchText: v.string() },
  handler: async (ctx, { searchText }) => {
    const currentUser = await requireCurrentUser(ctx);
    const term = searchText.trim();
    if (term.length < 2) return [];

    const currentPhoneDigits = currentUser.phoneNumber.replace(/\D/g, "");
    const localCallingPrefix = currentPhoneDigits.length > 10
      ? `+${currentPhoneDigits.slice(0, -10)}`
      : undefined;
    const phonePrefix = normalizePhoneSearchPrefix(term, localCallingPrefix);
    const phoneResults = phonePrefix
      ? await ctx.db
          .query("users")
          .withIndex("by_phone", (q) =>
            q.gte("phoneNumber", phonePrefix).lt("phoneNumber", `${phonePrefix}\uffff`),
          )
          .take(20)
      : [];
    const nameResults = /[a-z]/i.test(term)
      ? await ctx.db
          .query("users")
          .withSearchIndex("search_name", (q) => q.search("name", term))
          .take(20)
      : [];

    return toPublicSearchUsers([...phoneResults, ...nameResults], currentUser._id);
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const [memberships, sentMessages, reads, blockedByUser, blockedUser, uploads] = await Promise.all([
      ctx.db.query("conversationMembers").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("messages").withIndex("by_sender", (q) => q.eq("senderId", user._id)).collect(),
      ctx.db.query("messageReads").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("blocks").withIndex("by_blocker", (q) => q.eq("blockerId", user._id)).collect(),
      ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedId", user._id)).collect(),
      ctx.db.query("attachmentUploads").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);
    const deletedStorageIds = new Set<string>();
    async function deleteStoredFile(storageId: import("./_generated/dataModel").Id<"_storage">) {
      if (deletedStorageIds.has(storageId)) return;
      await ctx.storage.delete(storageId);
      deletedStorageIds.add(storageId);
    }

    for (const message of sentMessages) {
      for (const attachment of message.attachments ?? []) {
        await deleteStoredFile(attachment.storageId);
      }
      if (message.deletedAt === undefined) {
        await ctx.db.patch(message._id, {
          body: "",
          subject: undefined,
          attachments: [],
          deletedAt: now,
          updatedAt: now,
        });
      }
    }

    for (const upload of uploads) {
      if (upload.storageId) await deleteStoredFile(upload.storageId);
      await ctx.db.delete(upload._id);
    }
    for (const read of reads) await ctx.db.delete(read._id);
    for (const block of [...blockedByUser, ...blockedUser]) await ctx.db.delete(block._id);
    for (const membership of memberships) {
      const typingRecords = await ctx.db.query("typing")
        .withIndex("by_user_conversation", (q) => q.eq("userId", user._id).eq("conversationId", membership.conversationId))
        .collect();
      for (const typing of typingRecords) await ctx.db.delete(typing._id);
      await ctx.db.delete(membership._id);
    }

    const avatarPath = user.avatarUrl ? new URL(user.avatarUrl).pathname : "";
    const avatarIdMatch = avatarPath.match(/\/api\/storage\/([^/]+)$/);
    if (avatarIdMatch?.[1]) {
      const avatarId = avatarIdMatch[1] as import("./_generated/dataModel").Id<"_storage">;
      const avatarUrl = await ctx.storage.getUrl(avatarId);
      if (avatarUrl === user.avatarUrl) await deleteStoredFile(avatarId);
    }

    await deleteCurrentAuthUser(ctx);
    await ctx.db.delete(user._id);
    return { deleted: true };
  },
});



