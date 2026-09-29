import assert from "node:assert/strict";
import test from "node:test";
import { getActiveTypingUserIds } from "../convex/typingLogic.ts";

test("filters expired records and never returns the current user", () => {
  const active = getActiveTypingUserIds(
    [
      { userId: "alice", expiresAt: 1_100 },
      { userId: "bob", expiresAt: 999 },
      { userId: "carol", expiresAt: 1_200 },
    ],
    "alice",
    1_000,
  );
  assert.deepEqual(active, ["carol"]);
});

test("returns multiple active members once each", () => {
  const active = getActiveTypingUserIds(
    [
      { userId: "bob", expiresAt: 1_200 },
      { userId: "carol", expiresAt: 1_300 },
      { userId: "bob", expiresAt: 1_400 },
    ],
    "alice",
    1_000,
  );
  assert.deepEqual(active, ["bob", "carol"]);
});
