import assert from "node:assert/strict";
import test from "node:test";
import { countUnreadMessages } from "../convex/readStateLogic.ts";

const messages = [
  { senderId: "alice", createdAt: 100 },
  { senderId: "bob", createdAt: 110 },
  { senderId: "alice", createdAt: 120 },
  { senderId: "bob", createdAt: 130 },
  { senderId: "alice", createdAt: 140, deletedAt: 150 },
  { senderId: "alice", createdAt: 160 },
];

test("counts messages newer than the user's read time, excluding their own and deleted messages", () => {
  assert.equal(countUnreadMessages(messages, "alice", 115), 1);
});

test("a conversation with incoming messages and no read time is unread", () => {
  assert.equal(countUnreadMessages(messages, "alice"), 2);
});

test("read timestamps are independent for each member", () => {
  assert.equal(countUnreadMessages(messages, "alice", 115), 1);
  assert.equal(countUnreadMessages(messages, "bob", 125), 1);
});
