import bcrypt from "bcryptjs";

// 6-digit code generator for the legacy IVR flow. App sign-in uses Better Auth.
export function generatePin(): string {
  const range = 0x1_0000_0000;
  const limit = range - (range % 900_000);
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while ((value[0] ?? 0) >= limit);
  return (100_000 + ((value[0] ?? 0) % 900_000)).toString();
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

// Verify a password
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(password, storedHash);
  return isMatch;
}

export const OTP_MESSAGE_TEMPLATE =  (PIN:string) => `Your PhoneMail verification code is ${PIN}. This code is valid for 5 minutes. Do not share this code with anyone.— PhoneMail`; // Template for the SMS message


export const sendOTP = async (message: string, phoneNumber: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio is not configured.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phoneNumber, From: from, Body: message }),
    },
  );
  if (!response.ok) throw new Error("Failed to send verification code.");
  return { sid: "sent" };
};
