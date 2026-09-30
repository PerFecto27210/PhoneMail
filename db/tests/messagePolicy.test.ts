import assert from "node:assert/strict";
import test from "node:test";
import { canEditMessage, isValidEditedBody, MAX_MESSAGE_BODY_LENGTH, MESSAGE_EDIT_WINDOW_MS } from "../convex/messagePolicy.ts";

test("message edit is allowed through the inclusive five-minute window", () => {
  const createdAt = 1_000_000;
  assert.equal(MESSAGE_EDIT_WINDOW_MS, 5 * 60 * 1000);
  assert.equal(canEditMessage(createdAt, createdAt + MESSAGE_EDIT_WINDOW_MS, false), true);
  assert.equal(canEditMessage(createdAt, createdAt + MESSAGE_EDIT_WINDOW_MS + 1, false), false);
});

test("deleted messages cannot be edited", () => {
  assert.equal(canEditMessage(1_000, 1_001, true), false);
});

test("edited body is validated and attachment-only content remains supported", () => {
  assert.equal(isValidEditedBody("Updated message", false), true);
  assert.equal(isValidEditedBody("   ", false), false);
  assert.equal(isValidEditedBody("   ", true), true);
  assert.equal(isValidEditedBody("x".repeat(MAX_MESSAGE_BODY_LENGTH + 1), true), false);
});
