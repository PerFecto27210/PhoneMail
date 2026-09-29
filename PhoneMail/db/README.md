# Convex backend

WebChat sends verification SMS through the `twilio.sendOtp` Convex action. Configure Twilio credentials on the Convex deployment; do not put them in a `NEXT_PUBLIC_` variable or client code.

Set these deployment variables with the values from your Twilio account:

```sh
pnpm --filter db exec convex env set TWILIO_ACCOUNT_SID <account-sid>
pnpm --filter db exec convex env set TWILIO_AUTH_TOKEN <auth-token>
pnpm --filter db exec convex env set TWILIO_MESSAGING_SERVICE_SID <messaging-service-sid>
```

Use either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER` as the sender. The destination is sent in E.164 format (`+91` followed by the Indian mobile number).

When no Twilio variables are configured, local development uses the demo flow and shows the generated code on screen. Once Twilio is configured, the action sends the SMS and does not return the code to the browser.
