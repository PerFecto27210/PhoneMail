import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import {
  handleMenu,
  handleTwilioWebhook,
  handleVerification,
  handleWelcome,
} from "./twilio";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

http.route({ path: "/ivr/welcome", method: "POST", handler: handleWelcome });
http.route({ path: "/ivr/menu", method: "POST", handler: handleMenu });
http.route({ path: "/ivr/verify", method: "POST", handler: handleVerification });
http.route({ path: "/webhooks/twilio", method: "POST", handler: handleTwilioWebhook });

export default http;
