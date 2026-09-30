import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGroupRecipientIds } from "../convex/groupConversationPolicy.ts";

test("group recipients are deduplicated and the authenticated user is omitted", () => {
  assert.deepEqual(normalizeGroupRecipientIds("me", ["a", "me", "a", "b"]), ["a", "b"]);
});

test("a group cannot be started until at least two distinct other users remain", () => {
  assert.equal(normalizeGroupRecipientIds("me", ["a"]).length, 1);
  assert.equal(normalizeGroupRecipientIds("me", ["a", "a"]).length, 1);
  assert.equal(normalizeGroupRecipientIds("me", ["a", "b"]).length, 2);
});
