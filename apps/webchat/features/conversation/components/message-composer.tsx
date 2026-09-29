"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@phonemail/ui/components/button";
import { Textarea } from "@phonemail/ui/components/textarea";

export function MessageComposer({ onSend, sending }: { onSend: (body: string, parentMessageId?: string) => Promise<void>; sending: boolean }) {
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ _id: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const listener = (event: Event) => setReplyingTo((event as CustomEvent<{ _id: string; body: string }>).detail);
    window.addEventListener("phonemail:reply", listener);
    return () => window.removeEventListener("phonemail:reply", listener);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!body.trim()) return;
    setError(null);
    try { await onSend(body, replyingTo?._id); setBody(""); setReplyingTo(null); }
    catch { setError("Your message could not be sent. Check the conversation and try again."); }
  }
  return <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-8 sm:pb-6"><div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
    {replyingTo && <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2 text-xs"><span className="truncate">Replying to: {replyingTo.body}</span><button type="button" onClick={() => setReplyingTo(null)} className="px-2 text-muted-foreground">Cancel</button></div>}
    <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message…" aria-label="Message body" className="min-h-24 resize-y border-0 shadow-none focus-visible:ring-0" maxLength={10000} />
    <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : <span className="text-xs text-muted-foreground">A thoughtful note goes a long way.</span>}<Button type="submit" disabled={!body.trim() || sending} className="rounded-xl">{sending ? "Sending…" : "Send"}</Button></div>
  </div></form>;
}
