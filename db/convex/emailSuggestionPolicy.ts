export const MIN_SUGGESTION_DRAFT_LENGTH = 20;
export const MAX_SUGGESTION_WORDS = 25;
export const MAX_SUGGESTION_INPUT_LENGTH = 10_000;

export function isEligibleSuggestionDraft(body: string): boolean {
  return body.trim().length >= MIN_SUGGESTION_DRAFT_LENGTH;
}

export function normalizeEmailSuggestion(raw: string, body: string): string {
  let suggestion = raw.trim();
  if (!suggestion) return "";

  try {
    const parsed: unknown = JSON.parse(suggestion);
    if (typeof parsed === "object" && parsed !== null && "suggestion" in parsed && typeof parsed.suggestion === "string") {
      suggestion = parsed.suggestion.trim();
    }
  } catch {
    // Some model responses may omit the requested JSON wrapper; validate the text below.
  }

  suggestion = suggestion
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^suggestion\s*:\s*/i, "")
    .trim();
  if ((suggestion.startsWith('"') && suggestion.endsWith('"')) || (suggestion.startsWith("'") && suggestion.endsWith("'"))) {
    suggestion = suggestion.slice(1, -1).trim();
  }

  if (!suggestion || suggestion.length > 500 || suggestion.includes("\n")) return "";
  const normalizedDraft = body.trim().toLocaleLowerCase();
  if (suggestion.toLocaleLowerCase().startsWith(normalizedDraft)) return "";

  const draftWords = body.trim().match(/\S+/g) ?? [];
  const suggestionWords = suggestion.match(/\S+/g) ?? [];
  const maxOverlap = Math.min(8, draftWords.length, suggestionWords.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const draftSuffix = draftWords.slice(-overlap).map(normalizeToken);
    const suggestionPrefix = suggestionWords.slice(0, overlap).map(normalizeToken);
    if (draftSuffix.every((word, index) => word && word === suggestionPrefix[index])) {
      suggestion = suggestion.replace(new RegExp(`^(?:\\s*\\S+){${overlap}}\\s*`), "");
      break;
    }
  }

  const words = suggestion.match(/\S+/g) ?? [];
  return words.slice(0, MAX_SUGGESTION_WORDS).join(" ").trim();
}

function normalizeToken(word: string): string {
  return word.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’]+$/gu, "");
}
