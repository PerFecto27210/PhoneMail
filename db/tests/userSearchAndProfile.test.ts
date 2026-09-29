import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneSearchPrefix } from "../convex/phone.ts";
import { isProfileAvatar, normalizeProfileName, toPublicSearchUsers } from "../convex/userProfileLogic.ts";

test("profile names are trimmed, normalized, and bounded", () => {
  assert.equal(normalizeProfileName("  Rohit   Sharma "), "Rohit Sharma");
  assert.equal(normalizeProfileName("A"), null);
  assert.equal(normalizeProfileName("x".repeat(41)), null);
});

test("profile avatar values are restricted to the shared avatar set", () => {
  assert.equal(isProfileAvatar("avatar-1"), true);
  assert.equal(isProfileAvatar("avatar-8"), true);
  assert.equal(isProfileAvatar("https://example.com/avatar.png"), false);
  assert.equal(isProfileAvatar("avatar-9"), false);
});

test("phone search normalizes E.164 prefixes with or without a leading plus", () => {
  assert.equal(normalizePhoneSearchPrefix("+91 98765"), "+9198765");
  assert.equal(normalizePhoneSearchPrefix("9198765"), "+9198765");
  assert.equal(normalizePhoneSearchPrefix("0091 98765"), "+9198765");
  assert.equal(normalizePhoneSearchPrefix("9876543210", "+91"), "+919876543210");
  assert.equal(normalizePhoneSearchPrefix("Rohit"), null);
});

test("user search excludes the current user and exposes only public search fields", () => {
  const result = toPublicSearchUsers([
    { _id: "self", phoneNumber: "+12025550100", name: "Me", passwordHash: "secret" },
    { _id: "other", phoneNumber: "+12025550101", name: "Rohit", profileImage: "avatar-2", authMetadata: { key: "secret" } },
    { _id: "other", phoneNumber: "+12025550101", name: "Rohit", profileImage: "avatar-2" },
  ], "self");
  assert.deepEqual(result, [{ _id: "other", name: "Rohit", avatarUrl: "avatar-2", phoneNumber: "+12025550101" }]);
});
