import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getUserByPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user =  await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    return user;
  },
}); 

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if(user === null) {
      throw new ConvexError({message: "User not found", code: "not_found"});
    }
    return user;
  },
}); 

export const createUser = mutation({
  args: {
    phoneNumber: v.string(),
    emailAddress: v.optional(v.string()),
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", 
        { 
            phoneNumber: args.phoneNumber, 
            emailAddress: args.emailAddress ?? `${args.phoneNumber}@phonemail.com`,
            name: args.name, 
            profileImage: args.profileImage,
        });
    return userId;
  },
});

export const createTestUser = mutation({
  args: {
    phoneNumber: v.string(),
    emailAddress: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();

    if (existing) {
      throw new ConvexError({ message: "A user with this phone number already exists", code: "already_exists" });
    }

    return await ctx.db.insert("users", args);
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"), 
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({message: "User not found", code: "not_found"});
    }
    const updatedUser = {
        ...user,
        name: args.name ?? user.name,   
        profileImage: args.profileImage ?? user.profileImage,
    };

    await ctx.db.patch(args.userId, updatedUser);
    
    return user._id;  
  },
});

export const updateProfileByPhone = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.string(),
    profileImage: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    if (!user) throw new ConvexError({ message: "User not found", code: "not_found" });
    await ctx.db.patch(user._id, { name: args.name.trim() || undefined, profileImage: args.profileImage ?? undefined });
    return user._id;
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"), 
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({message: "User not found", code: "not_found"});
    }
    await ctx.db.delete(args.userId);
    return user._id;
  },
});
