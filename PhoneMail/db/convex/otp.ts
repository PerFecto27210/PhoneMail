import { internalMutation, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import bcrypt from "bcryptjs";

export const createPin = internalMutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);
    if (phoneNumber.length < 10) throw new ConvexError("Enter a valid phone number.");
    const pin = generatePin();
    const previous = await ctx.db.query("otpVerifications").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).collect();
    for (const otp of previous) await ctx.db.delete(otp._id);
    await ctx.db.insert("otpVerifications", {
      phoneNumber,
      pinHash: bcrypt.hashSync(pin, 10),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      verified: false,
    });
    return { pin };
  },
});

export const verifyPin = mutation({
  args: { phoneNumber: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    const phoneNumber = normalizePhoneNumber(args.phoneNumber);
    const otp = await ctx.db.query("otpVerifications").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).first();
    if (!otp) return { success: false, message: "Request a new verification code." };
    if (otp.expiresAt < Date.now()) {
      await ctx.db.delete(otp._id);
      return { success: false, message: "That code has expired. Request a new one." };
    }
    if (otp.verified || otp.attempts >= 5) return { success: false, message: "Too many attempts. Request a new code." };
    if (!bcrypt.compareSync(args.pin, otp.pinHash)) {
      await ctx.db.patch(otp._id, { attempts: otp.attempts + 1 });
      return { success: false, message: "That verification code is incorrect." };
    }

    const existingUser = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber)).first();
    const userId = existingUser?._id ?? await ctx.db.insert("users", {
      phoneNumber,
      emailAddress: `${phoneNumber}@phonemail.com`,
    });
    await ctx.db.delete(otp._id);
    return { success: true, userId };
  },
});

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}
