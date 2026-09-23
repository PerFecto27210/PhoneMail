import {ConvexError, v} from "convex/values";
import {query, mutation } from "./_generated/server";

export const getUserByPhone = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user =  await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    if(user === null) {
      throw new ConvexError({message: "User not found", code: "not_found"});
    }
    return user;
  },
}); 

export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user =  await ctx.db.query("users").withIndex("by_id", (q) => q.eq("_id", args.userId)).first();
    if(user === null) {
      throw new ConvexError({message: "User not found", code: "not_found"});
    }
    return user;
  },
}); 

export const createUser = mutation({
  args: {
    phoneNumber: v.string(),
    name: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", 
        { 
            phoneNumber: args.phoneNumber, 
            name: args.name, 
            profileImage: args.profileImage,
        });
    return userId;
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
