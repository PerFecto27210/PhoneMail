import { v } from "convex/values";
import { internalAction } from "./_generated/server";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const sendNewMessageSms = internalAction({
  args: {
    to: v.string(),
    sender: v.string(),
    subject: v.string(),
  },
  handler: async (_ctx, { to, sender, subject }) => {
    const accountSid = requiredEnv("TWILIO_ACCOUNT_SID");
    const authToken = requiredEnv("TWILIO_AUTH_TOKEN");
    const from = requiredEnv("TWILIO_PHONE_NUMBER");
    const body = `New PhoneMail from ${sender}\nSubject: ${subject}\nOpen PhoneMail to read the message.`;

    let response: Response;
    try {
      response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        },
      );
    } catch (error) {
      console.error("PhoneMail notification SMS request failed before an HTTP response was received.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      throw new Error("Failed to send PhoneMail notification SMS.");
    }

    if (!response.ok) {
      let twilioCode: number | undefined;
      try {
        const result: unknown = await response.json();
        if (
          typeof result === "object" && result !== null && "code" in result &&
          typeof result.code === "number"
        ) twilioCode = result.code;
      } catch {
        // Twilio errors can have an empty or non-JSON body.
      }
      console.error("Twilio rejected the PhoneMail notification SMS.", {
        httpStatus: response.status,
        twilioCode,
      });
      throw new Error("Failed to send PhoneMail notification SMS.");
    }
  },
});
