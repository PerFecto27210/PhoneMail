import assert from "node:assert/strict";
import test from "node:test";
import { appendEmailSuggestion } from "./suggestion-utils.ts";

test("accepting a suggestion appends it without adding unwanted spaces before punctuation", () => {
  assert.equal(appendEmailSuggestion("Hi Rahul, are you", "available tomorrow?"), "Hi Rahul, are you available tomorrow?");
  assert.equal(appendEmailSuggestion("Hi Rahul", ", how are you?"), "Hi Rahul, how are you?");
  assert.equal(appendEmailSuggestion("Hi Rahul ", "available tomorrow?"), "Hi Rahul available tomorrow?");
});
