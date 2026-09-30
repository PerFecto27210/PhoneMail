export function appendEmailSuggestion(body: string, suggestion: string): string {
  const continuation = suggestion.trim();
  if (!continuation) return body;
  const separator = body.length > 0 && !/\s$/.test(body) && !/^[,.;:!?)]/.test(continuation) ? " " : "";
  return `${body}${separator}${continuation}`;
}
