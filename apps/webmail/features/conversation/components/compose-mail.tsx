"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { Input } from "@phonemail/ui/components/input";
import { Textarea } from "@phonemail/ui/components/textarea";
import { XIcon } from "@phonemail/ui/components/icons";
import { useSearchUsers } from "../api/search";
import { useEmailSuggestion } from "../../ai/api/use-email-suggestion";
import { appendEmailSuggestion } from "../../ai/suggestion-utils";
import { SuggestionControls } from "../../ai/components/suggestion-controls";

type Recipient = { _id: string; name: string | null; phoneNumber: string; avatarUrl: string | null };

export function ComposeMail({ onClose, onSent }: { onClose: () => void; onSent: (conversationId: Id<"conversations">) => void }) {
  const [to, setTo] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [cursorAtEnd, setCursorAtEnd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = useSearchUsers(to);
  const getOrCreateDirect = useMutation(api.conversation.getOrCreateDirectConversation);
  const createGroup = useMutation(api.conversation.createGroupConversation);
  const sendMessage = useMutation(api.message.sendMessage);
  const { suggestion, isGeneratingSuggestion, unavailable, waitingForDraft, dismiss: dismissSuggestion, clearDismissal } = useEmailSuggestion({
    subject,
    body,
    contextKey: recipients.map(({ _id }) => _id).join(","),
    // Smart Compose can help while the user is still drafting the recipient.
    enabled: !busy,
  });

  function acceptSuggestion() {
    if (!suggestion) return;
    clearDismissal();
    setBody((current) => appendEmailSuggestion(current, suggestion));
    setCursorAtEnd(true);
    dismissSuggestion();
  }

  function handleBodyKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab" && suggestion && cursorAtEnd && !event.shiftKey) {
      event.preventDefault();
      acceptSuggestion();
    } else if (event.key === "Escape" && (suggestion || isGeneratingSuggestion)) {
      event.preventDefault();
      dismissSuggestion();
    }
  }

  function addRecipient(recipient: Recipient) {
    clearDismissal();
    setRecipients((current) => current.some(({ _id }) => _id === recipient._id) ? current : [...current, recipient]);
    setTo("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipients.length || !body.trim()) return;
    const isGroup = recipients.length > 1;
    if (isGroup && !subject.trim()) {
      setError("Add a subject to start a group mail.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let conversationId: Id<"conversations">;
      if (isGroup) {
        const conversation = await createGroup({
          recipientIds: recipients.map(({ _id }) => _id as Id<"users">),
          title: subject.trim(),
        });
        if (!conversation) throw new Error("conversation_unavailable");
        conversationId = conversation._id;
      } else {
        const conversation = await getOrCreateDirect({ recipientId: recipients[0]!._id as Id<"users"> });
        if (!conversation) throw new Error("conversation_unavailable");
        conversationId = conversation._id;
      }
      await sendMessage({ conversationId, body: body.trim(), ...(subject.trim() ? { subject: subject.trim() } : {}) });
      onSent(conversationId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      setError(message.includes("blocked") ? "You can’t send mail to this person." : "Your message could not be sent. Please try again.");
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="compose-title" className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl">
      <header className="flex h-12 shrink-0 items-center justify-between bg-muted px-4"><h2 id="compose-title" className="text-sm font-semibold">{recipients.length > 1 ? "New Group Mail" : "New Mail"}</h2><Button type="button" variant="ghost" size="icon" aria-label="Close compose" onClick={onClose} disabled={busy} className="size-10 rounded-full"><XIcon className="size-5" /></Button></header>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-14 flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2"><label htmlFor="compose-to" className="mr-1 text-sm text-muted-foreground">To</label>
          {recipients.map((recipient) => <span key={recipient._id} className="flex max-w-full items-center gap-1.5 rounded-full bg-accent py-1 pl-1 pr-1.5 text-accent-foreground"><Avatar className="size-6 shrink-0"><AvatarImage src={recipient.avatarUrl ?? undefined} /><AvatarFallback className="text-[10px]">{(recipient.name ?? recipient.phoneNumber).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="max-w-32 truncate text-sm">{recipient.name || recipient.phoneNumber}</span><button type="button" className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background/70" aria-label={`Remove ${recipient.name || recipient.phoneNumber}`} onClick={() => { clearDismissal(); setRecipients((current) => current.filter(({ _id }) => _id !== recipient._id)); }}><XIcon className="size-3.5" /></button></span>)}
          <Input id="compose-to" autoFocus autoComplete="off" value={to} onChange={(event) => setTo(event.target.value)} placeholder={recipients.length ? "Add recipient" : "Name or phone number"} className="h-10 min-w-28 flex-1 border-0 px-0 shadow-none focus-visible:ring-0" />
          {to.trim().length >= 2 && <div className="absolute left-12 right-3 top-[calc(100%-2px)] z-10 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">{matches === undefined ? <p className="px-3 py-2 text-sm text-muted-foreground">Searching PhoneMail…</p> : matches.length ? matches.filter(({ _id }) => !recipients.some((recipient) => recipient._id === _id)).map((user) => <button key={user._id} type="button" onClick={() => addRecipient(user)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"><Avatar className="size-8"><AvatarImage src={user.avatarUrl ?? undefined} /><AvatarFallback>{(user.name ?? user.phoneNumber).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm font-medium">{user.name || "PhoneMail member"}</span><span className="block truncate text-xs text-muted-foreground">{user.phoneNumber}</span></span></button>) : <p className="px-3 py-2 text-sm text-muted-foreground">No PhoneMail users found.</p>}</div>}
        </div>
        {recipients.length > 1 && <p className="border-b border-border/70 px-4 py-1.5 text-xs text-muted-foreground">{recipients.length} recipients · starts a new group thread</p>}
        <Input value={subject} onChange={(event) => { clearDismissal(); setSubject(event.target.value); }} placeholder={recipients.length > 1 ? "Subject (required for group mail)" : "Subject"} maxLength={200} className="h-12 rounded-none border-0 border-b border-border/70 px-4 shadow-none focus-visible:ring-0" />
        <Textarea value={body} onChange={(event) => { clearDismissal(); setBody(event.currentTarget.value); setCursorAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length); }} onSelect={(event) => setCursorAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length)} onKeyDown={handleBodyKeyDown} placeholder="Write your message…" maxLength={10000} className="min-h-48 flex-1 resize-y rounded-none border-0 px-4 py-4 shadow-none focus-visible:ring-0 sm:min-h-64" />
        <SuggestionControls suggestion={suggestion} isGenerating={isGeneratingSuggestion} unavailable={unavailable} waitingForDraft={waitingForDraft} onAccept={acceptSuggestion} onDismiss={dismissSuggestion} />
        {error && <p role="alert" className="px-4 pb-2 text-sm text-destructive">{error}</p>}
        <footer className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3"><span className="truncate text-xs text-muted-foreground">{recipients.length ? `${recipients.length} recipient${recipients.length === 1 ? "" : "s"}` : "PhoneMail message"}</span><Button type="submit" disabled={busy || !recipients.length || !body.trim() || (recipients.length > 1 && !subject.trim())} className="min-w-24 rounded-xl">{busy ? "Sending…" : "Send"}</Button></footer>
      </form>
    </section>
  </div>;
}
