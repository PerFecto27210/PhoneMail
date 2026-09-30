import assert from "node:assert/strict";
import test from "node:test";
import { isEligibleSuggestionDraft, normalizeEmailSuggestion } from "../convex/emailSuggestionPolicy.ts";

test("Smart Compose skips empty and short drafts", () => {
  assert.equal(isEligibleSuggestionDraft(""), false);
  assert.equal(isEligibleSuggestionDraft("Almost long enough"), false);
  assert.equal(isEligibleSuggestionDraft("This draft is long enough."), true);
});

test("structured Gemini output is normalized into a short continuation", () => {
  assert.equal(
    normalizeEmailSuggestion('{"suggestion":"tomorrow afternoon."}', "Hi Rahul, are you available"),
    "tomorrow afternoon.",
  );
});

test("repeated draft suffixes, multiline responses, and oversized responses are rejected or removed", () => {
  assert.equal(normalizeEmailSuggestion("I'll get back to you tomorrow.", "Thanks for reaching out. I'll"), "get back to you tomorrow.");
  assert.equal(normalizeEmailSuggestion("A full repeated draft", "A full repeated draft"), "");
  assert.equal(normalizeEmailSuggestion("First line\nSecond line", "A sufficiently long draft for suggestions"), "");
  assert.equal(normalizeEmailSuggestion(`{"suggestion":"${"word ".repeat(80)}"}`, "A sufficiently long draft for suggestions").split(/\s+/).length, 25);
});
