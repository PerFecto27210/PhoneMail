/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as attachmentPolicy from "../attachmentPolicy.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as blockPolicy from "../blockPolicy.js";
import type * as blocking from "../blocking.js";
import type * as conversation from "../conversation.js";
import type * as emailSuggestionPolicy from "../emailSuggestionPolicy.js";
import type * as groupConversationPolicy from "../groupConversationPolicy.js";
import type * as http from "../http.js";
import type * as message from "../message.js";
import type * as messagePolicy from "../messagePolicy.js";
import type * as otpState from "../otpState.js";
import type * as phone from "../phone.js";
import type * as readState from "../readState.js";
import type * as readStateLogic from "../readStateLogic.js";
import type * as twilio from "../twilio.js";
import type * as twilioOtp from "../twilioOtp.js";
import type * as typing from "../typing.js";
import type * as typingLogic from "../typingLogic.js";
import type * as user from "../user.js";
import type * as userProfileLogic from "../userProfileLogic.js";
import type * as util from "../util.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  attachmentPolicy: typeof attachmentPolicy;
  attachments: typeof attachments;
  auth: typeof auth;
  blockPolicy: typeof blockPolicy;
  blocking: typeof blocking;
  conversation: typeof conversation;
  emailSuggestionPolicy: typeof emailSuggestionPolicy;
  groupConversationPolicy: typeof groupConversationPolicy;
  http: typeof http;
  message: typeof message;
  messagePolicy: typeof messagePolicy;
  otpState: typeof otpState;
  phone: typeof phone;
  readState: typeof readState;
  readStateLogic: typeof readStateLogic;
  twilio: typeof twilio;
  twilioOtp: typeof twilioOtp;
  typing: typeof typing;
  typingLogic: typeof typingLogic;
  user: typeof user;
  userProfileLogic: typeof userProfileLogic;
  util: typeof util;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
