"use client";

import { Button } from "@phonemail/ui/components/button";
import { XIcon } from "@phonemail/ui/components/icons";

export function SuggestionControls({
  suggestion,
  isGenerating,
  unavailable,
  waitingForDraft,
  onAccept,
  onDismiss,
}: {
  suggestion: string;
  isGenerating: boolean;
  unavailable: boolean;
  waitingForDraft: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return <div className="min-h-9 border-t border-border/50 px-4 py-2" aria-live="polite" aria-atomic="true">
    {isGenerating ? <p className="text-xs text-muted-foreground">✨ Suggesting…</p> : suggestion ? <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 flex-1 text-xs text-muted-foreground"><span className="font-medium">Suggestion:</span> <span className="text-muted-foreground/80">{suggestion}</span></p><div className="flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onAccept}>Accept</Button><Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Dismiss suggestion" onClick={onDismiss}><XIcon className="size-4" /></Button></div></div> : unavailable ? <p className="text-xs text-muted-foreground">Smart Compose is unavailable right now.</p> : waitingForDraft ? <p className="text-[11px] text-muted-foreground/80">Keep typing (at least 20 characters) and pause for a suggestion.</p> : <p className="text-[11px] text-muted-foreground/80">Smart Compose sends this draft and its subject, when present, to Gemini for a temporary suggestion. Suggestions are not saved unless you accept and send them.</p>}
  </div>;
}
