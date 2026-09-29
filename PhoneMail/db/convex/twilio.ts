import { internal } from "./_generated/api";
import { action, type ActionCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };

export const sendOtp = action({
  args: {
    phoneNumber: v.string(),
    toPhoneNumber: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: true; demoPin?: string }> => {
    const { pin } = await ctx.runMutation(internal.otp.createPin, { phoneNumber: args.phoneNumber });
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid && !authToken && !messagingServiceSid && !fromPhoneNumber) {
      // Local development can still use the app without a Twilio account.
      return { success: true, demoPin: pin };
    }
    if (!accountSid || !authToken || (!messagingServiceSid && !fromPhoneNumber)) {
      throw new ConvexError("Twilio is not fully configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER.");
    }

    const toPhoneNumber = normalizeE164(args.toPhoneNumber);
    if (!toPhoneNumber) throw new ConvexError("Enter a valid phone number with its country code.");

    const form = new URLSearchParams({
      To: toPhoneNumber,
      Body: `Your PhoneMail verification code is ${pin}. It expires in 5 minutes.`,
    });
    if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
    else form.set("From", fromPhoneNumber!);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    if (!response.ok) {
      const details = await response.json().catch(() => null) as { message?: string } | null;
      throw new ConvexError(details?.message || `Twilio could not send the verification message (HTTP ${response.status}).`);
    }

    return { success: true };
  },
});

function normalizeE164(phoneNumber: string) {
  const trimmed = phoneNumber.trim();
  if (!trimmed.startsWith("+")) return null;
  const digits = trimmed.slice(1).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}
