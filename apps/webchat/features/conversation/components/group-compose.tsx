"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@phonemail/ui/components/dialog";
import { Input } from "@phonemail/ui/components/input";
import { Textarea } from "@phonemail/ui/components/textarea";
import { useSearchUsers } from "../api/search";

type Recipient = { _id: Id<"users">; name: string | null; phoneNumber: string; avatarUrl: string | null };

export function GroupCompose({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: Id<"conversations">) => void;
}) {
  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [createdId, setCreatedId] = useState<Id<"conversations"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const results = useSearchUsers(search);
  const createGroup = useMutation(api.conversation.createGroupConversation);
  const sendMessage = useMutation(api.message.sendMessage);
  const selectedIds = new Set(recipients.map(({ _id }) => _id));

  function close(openNext: boolean) {
    if (busy) return;
    onOpenChange(openNext);
    if (!openNext) {
      setSearch(""); setRecipients([]); setTitle(""); setBody(""); setCreatedId(null); setError(null);
    }
  }

  function finishClose() {
    onOpenChange(false);
    setSearch(""); setRecipients([]); setTitle(""); setBody(""); setCreatedId(null); setError(null);
  }

  async function submit() {
    if (recipients.length < 2 || !title.trim() || !body.trim()) return;
    setBusy(true); setError(null);
    let conversationId = createdId;
    try {
      if (!conversationId) {
        const conversation = await createGroup({ recipientIds: recipients.map(({ _id }) => _id), title: title.trim() });
        if (!conversation) throw new Error("conversation_unavailable");
        conversationId = conversation._id;
        setCreatedId(conversationId);
      }
      await sendMessage({ conversationId, body: body.trim(), subject: title.trim() });
      finishClose();
      onCreated(conversationId);
    } catch {
      setError("We couldn’t start the group message. Please try again.");
      if (conversationId) onCreated(conversationId);
    } finally {
      setBusy(false);
    }
  }

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Start a group conversation</DialogTitle><DialogDescription>Add at least two people, give the conversation a subject, and write the first message.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2"><label htmlFor="group-people" className="text-sm font-medium">People</label>
          <Input id="group-people" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or phone number" autoComplete="off" />
          {search.trim().length >= 2 && <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-1">
            {results === undefined ? <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p> : results.filter(({ _id }) => !selectedIds.has(_id as Id<"users">)).length ? results.filter(({ _id }) => !selectedIds.has(_id as Id<"users">)).map((user) => <button key={user._id} type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent" onClick={() => { setRecipients((current) => [...current, { ...user, _id: user._id as Id<"users"> }]); setSearch(""); }}><Avatar className="size-8"><AvatarImage src={user.avatarUrl ?? undefined} /><AvatarFallback>{(user.name ?? user.phoneNumber).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm">{user.name || "PhoneMail member"}</span><span className="block truncate text-xs text-muted-foreground">{user.phoneNumber}</span></span></button>) : <p className="px-3 py-2 text-sm text-muted-foreground">No more people found.</p>}
          </div>}
          {recipients.length > 0 && <div className="flex flex-wrap gap-2">{recipients.map((user) => <button key={user._id} type="button" onClick={() => setRecipients((current) => current.filter(({ _id }) => _id !== user._id))} className="rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground">{user.name || user.phoneNumber} ×</button>)}</div>}
          <p className="text-xs text-muted-foreground">{recipients.length} of at least 2 recipients</p>
        </div>
        <div className="space-y-2"><label htmlFor="group-subject" className="text-sm font-medium">Subject</label><Input id="group-subject" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Group subject" /></div>
        <div className="space-y-2"><label htmlFor="group-first-message" className="text-sm font-medium">First message</label><Textarea id="group-first-message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} placeholder="Write your message…" className="min-h-28" /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => close(false)} disabled={busy}>Cancel</Button><Button onClick={() => void submit()} disabled={busy || recipients.length < 2 || !title.trim() || !body.trim()}>{busy ? "Starting…" : "Start group"}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}
