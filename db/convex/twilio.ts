// convex/twilio.ts

import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendOtp = action({
  args: {
    phoneNumber: v.string(),
    pin: v.string(),
  },

  handler: async (_, args) => {
    const message =
      `Your PhoneMail verification code is ${args.pin}. ` +
      `It expires in 5 minutes.`;

    // Call Twilio here.
    //
    // Example using Twilio REST API:
    //
    // await fetch(
    //   `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    //   ...
    // );

    console.log(
      `Sending ${message} to ${args.phoneNumber}`
    );

    return {
      success: true,
    };
  },
});