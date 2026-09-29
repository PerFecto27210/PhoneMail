import assert from "node:assert/strict";
import test from "node:test";
import {
  extractOtpFromTwilioResponse,
  extractVerificationCodeFromMessageBody,
} from "../convex/twilioOtp.ts";

test("extracts a six-digit verification code from Twilio's message body", () => {
  assert.equal(
    extractVerificationCodeFromMessageBody("Your verification code is 482913. It expires soon."),
    "482913",
  );
  assert.equal(
    extractVerificationCodeFromMessageBody("PhoneMail verification code 123456. Test message from Twilio."),
    "123456",
  );
});

test("does not accept an unlabeled number or a non-six-digit code", () => {
  assert.equal(extractVerificationCodeFromMessageBody("Your order number is 482913."), null);
  assert.equal(extractVerificationCodeFromMessageBody("Your verification code is 12345."), null);
});

test("extracts the OTP only from Twilio response body", () => {
  assert.equal(
    extractOtpFromTwilioResponse({
      body: "Your verification code is 482913. It expires in 5 minutes. Do not share it. Test message from Twilio.",
    }),
    "482913",
  );
  assert.equal(extractOtpFromTwilioResponse({ code: "482913" }), null);
  assert.equal(extractOtpFromTwilioResponse({ body: null }), null);
});
