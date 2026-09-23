import { mutation } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";



export const createPin = mutation({
  args: {
    phoneNumber: v.string(),
  },

  handler: async (ctx, args) => {
    const pin = generatePin();

    
    const pinHash = await hashPassword(pin);

    // Remove previous OTPs for this number
    const previous = await ctx.db
      .query("otpVerifications")
      .withIndex("by_phone", (q) =>
        q.eq("phoneNumber", args.phoneNumber)
      )
      .collect();

    for (const otp of previous) {
      await ctx.db.delete(otp._id);
    }

    await ctx.db.insert("otpVerifications", {
      phoneNumber: args.phoneNumber,
      pinHash,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      verified: false,
    });

    //send sms to user with the pin
    

    return {
      success: true,
      // Don't return pin in production
      pin,
    };
  },
});


export const verifyPin = mutation({
  args: {
    phoneNumber: v.string(),
    pin: v.string(),
  },

  handler: async (ctx, args) => {
    const otp = await ctx.db
      .query("otpVerifications")
      .withIndex("by_phone", (q) =>
        q.eq("phoneNumber", args.phoneNumber)
      )
      .first();

    if (!otp) {
      return { success: false, message: "No OTP found for this number" };
    }
    if(!verifyPassword(args.pin, otp.pinHash)) {
      return { success: false, message: "Invalid OTP" };
    }

    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber)).first();
    if(!user) {
        await ctx.db.insert("users", {
            phoneNumber: args.phoneNumber,
            emailAddress: `${args.phoneNumber}@phonemail.com`,
        });
    }
    return { success: true, message: "OTP verified successfully" };
  },
});



function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash a password
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

// Verify a password
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(password, storedHash);
  return isMatch;
}
