import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { normalizePhoneNumber, normalizePhoneSearchPrefix } from "./phone";
import { normalizeProfileName, isProfileAvatar, toPublicSearchUsers } from "./userProfileLogic";

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
      profileComplete: Boolean(user.profileImage),
      onboardingComplete: user.onboardingCompletedAt !== undefined,
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

export const completeOnboarding = mutation({
  args: { profileImage: v.string() },
  handler: async (ctx, { profileImage }) => {
    const user = await requireCurrentUser(ctx);
    if (user.termsAcceptedAt === undefined) {
      throw new ConvexError({ code: "terms_required", message: "Accept the terms before continuing." });
    }
    if (!isProfileAvatar(profileImage)) {
      throw new ConvexError({ code: "invalid_avatar", message: "Choose one of the available avatars." });
    }
    const now = Date.now();
    await ctx.db.patch(user._id, {
      profileImage,
      onboardingCompletedAt: now,
      updatedAt: now,
    });
    return { completedAt: now };
  },
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const name = args.name === undefined ? undefined : normalizeProfileName(args.name);
    if (args.name !== undefined && name === null) {
      throw new ConvexError({ code: "invalid_name", message: "Name must be between 2 and 40 characters." });
    }
    if (args.profileImage !== undefined && !isProfileAvatar(args.profileImage)) {
      throw new ConvexError({ code: "invalid_avatar", message: "Choose one of the available avatars." });
    }
    await ctx.db.patch(user._id, {
      ...(name == null ? {} : { name }),
      ...(args.profileImage === undefined ? {} : { profileImage: args.profileImage }),
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

export const deleteUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    await ctx.db.delete(user._id);
    return user._id;
  },
});



