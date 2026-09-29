import assert from "node:assert/strict";
import test from "node:test";
import { hasBlockRelationship } from "../convex/blockPolicy.ts";

test("a block in either direction prevents contact", () => {
  assert.equal(hasBlockRelationship(true, false), true);
  assert.equal(hasBlockRelationship(false, true), true);
  assert.equal(hasBlockRelationship(false, false), false);
});

test("a mutual block remains a blocked relationship", () => {
  assert.equal(hasBlockRelationship(true, true), true);
});
