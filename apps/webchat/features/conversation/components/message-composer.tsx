"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";
import { Button } from "@phonemail/ui/components/button";
import { Textarea } from "@phonemail/ui/components/textarea";
import { FileTextIcon, PaperclipIcon, XIcon } from "@phonemail/ui/components/icons";
import { useConversationTyping } from "../api/conversations";
import { useEmailSuggestion } from "../../ai/api/use-email-suggestion";
import { appendEmailSuggestion } from "../../ai/suggestion-utils";
import { SuggestionControls } from "../../ai/components/suggestion-controls";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", pdf: "application/pdf", txt: "text/plain",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip: "application/zip",
};

type PendingFile = {
  key: string;
  file: File;
  previewUrl: string;
  uploadId?: Id<"attachmentUploads">;
  mimeType: string;
  status: "uploading" | "ready" | "failed";
  error?: string;
};

type Reply = { _id: string; body: string };
type EditingMessage = { _id: Id<"messages">; body: string; hasAttachments: boolean };

function expectedMimeType(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expected = MIME_BY_EXTENSION[extension];
  if (!expected) return null;
  if (file.type && file.type !== expected && file.type !== "application/octet-stream") return null;
  return expected;
}

function formatFileSize(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageComposer({
  conversationId,
  onSend,
  sending,
  blockedMessage,
  typingLabel,
}: {
  conversationId: Id<"conversations">;
  onSend: (body: string, parentMessageId?: string, uploadIds?: Id<"attachmentUploads">[]) => Promise<void>;
  sending: boolean;
  blockedMessage?: string;
  typingLabel?: string;
}) {
  const [body, setBody] = useState("");
  const [cursorAtEnd, setCursorAtEnd] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const filesRef = useRef(files);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createUpload = useMutation(api.attachments.createUpload);
  const completeUpload = useMutation(api.attachments.completeUpload);
  const discardUpload = useMutation(api.attachments.discardUpload);
  const editMessage = useMutation(api.message.editMessage);
  const { reportTyping, stopTyping, typingError } = useConversationTyping(conversationId);
  const { suggestion, isGeneratingSuggestion, unavailable: suggestionUnavailable, waitingForDraft, dismiss: dismissSuggestion, clearDismissal } = useEmailSuggestion({
    subject: "",
    body,
    contextKey: conversationId,
    enabled: !sending && !editingMessage && files.length === 0 && !blockedMessage,
  });

  useEffect(() => { filesRef.current = files; }, [files]);

  useEffect(() => {
    const listener = (event: Event) => setReplyingTo((event as CustomEvent<Reply>).detail);
    window.addEventListener("phonemail:reply", listener);
    return () => window.removeEventListener("phonemail:reply", listener);
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<EditingMessage>).detail;
      if (files.length > 0) {
        for (const file of files) {
          URL.revokeObjectURL(file.previewUrl);
          if (file.uploadId) void discardUpload({ uploadId: file.uploadId }).catch(() => {});
        }
        setFiles([]);
      }
      setEditingMessage(detail);
      setReplyingTo(null);
      setBody(detail.body);
      setError(null);
    };
    window.addEventListener("phonemail:edit", listener);
    return () => window.removeEventListener("phonemail:edit", listener);
  }, [discardUpload, files]);

  useEffect(() => () => {
    for (const file of filesRef.current) URL.revokeObjectURL(file.previewUrl);
  }, []);

  async function uploadFile(item: PendingFile) {
    setFiles((current) => current.map((file) => file.key === item.key ? { ...file, status: "uploading", error: undefined } : file));
    let uploadId: Id<"attachmentUploads"> | undefined;
    let storageId: Id<"_storage"> | undefined;
    try {
      const intent = await createUpload({
        conversationId,
        fileName: item.file.name,
        mimeType: item.mimeType,
        size: item.file.size,
      });
      uploadId = intent.uploadId;
      const response = await fetch(intent.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": intent.mimeType },
        body: item.file,
      });
      if (!response.ok) throw new Error("upload_failed");
      const result = await response.json() as { storageId?: Id<"_storage"> };
      if (!result.storageId) throw new Error("upload_failed");
      storageId = result.storageId;
      await completeUpload({ uploadId, storageId });
      setFiles((current) => current.map((file) => file.key === item.key ? { ...file, uploadId, status: "ready" } : file));
    } catch {
      if (uploadId) {
        try { await discardUpload({ uploadId, ...(storageId ? { storageId } : {}) }); } catch { /* Expiry cleanup handles abandoned uploads. */ }
      }
      setFiles((current) => current.map((file) => file.key === item.key ? { ...file, uploadId: undefined, status: "failed", error: "Upload failed. Retry or remove this file." } : file));
    }
  }

  async function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    const availableSlots = MAX_FILES - files.length;
    if (chosen.length > availableSlots) setError(`You can attach up to ${MAX_FILES} files to a message.`);
    const valid: PendingFile[] = [];
    for (const file of chosen.slice(0, availableSlots)) {
      const mimeType = expectedMimeType(file);
      if (!mimeType) {
        setError(`${file.name} is not a supported file type.`);
        continue;
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        setError(`${file.name} must be smaller than 25 MB.`);
        continue;
      }
      valid.push({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), mimeType, status: "uploading" });
    }
    if (valid.length) {
      setError(null);
      setFiles((current) => [...current, ...valid]);
      for (const item of valid) await uploadFile(item);
    }
  }

  async function removeFile(item: PendingFile) {
    if (item.status === "uploading") return;
    if (item.uploadId) {
      try { await discardUpload({ uploadId: item.uploadId }); }
      catch { setError("This file could not be removed. Please try again."); return; }
    }
    URL.revokeObjectURL(item.previewUrl);
    setFiles((current) => current.filter((file) => file.key !== item.key));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const readyFiles = files.filter((file) => file.status === "ready" && file.uploadId);
    if ((!body.trim() && readyFiles.length === 0) || files.some((file) => file.status !== "ready")) return;
    setError(null);
    try {
      if (editingMessage) {
        await editMessage({ messageId: editingMessage._id, body });
        setEditingMessage(null);
      } else {
        await onSend(body, replyingTo?._id, readyFiles.map((file) => file.uploadId!));
      }
      setBody("");
      setReplyingTo(null);
      for (const file of files) URL.revokeObjectURL(file.previewUrl);
      setFiles([]);
      stopTyping();
    } catch {
      setError(editingMessage ? "Your message could not be updated. It may no longer be editable." : "Your message could not be sent. Check the conversation and try again.");
    }
  }

  function updateBody(value: string) {
    clearDismissal();
    setBody(value);
    if (value.trim()) reportTyping();
    else stopTyping();
  }

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

  if (blockedMessage) {
    return <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-8 sm:pb-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">{blockedMessage}</div></div>;
  }

  const readyCount = files.filter((file) => file.status === "ready").length;
  const canSend = (body.trim().length > 0 || readyCount > 0 || Boolean(editingMessage?.hasAttachments)) && readyCount === files.length && !sending;

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-8 sm:pb-6">
      {typingLabel && <p aria-live="polite" className="mb-2 flex items-center gap-2 px-2 text-xs text-primary"><span aria-hidden="true" className="flex gap-0.5"><i className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]"/><i className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]"/><i className="size-1 animate-bounce rounded-full bg-primary"/></span>{typingLabel}</p>}
      {typingError && <p className="mb-2 px-2 text-xs text-muted-foreground" role="status">Typing status is temporarily unavailable.</p>}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
        {editingMessage && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3"><div className="min-w-0"><p className="text-xs font-semibold text-primary">Editing message</p><p className="mt-1 max-h-10 overflow-hidden break-words text-xs text-muted-foreground">{editingMessage.body || "Attachment message"}</p></div><Button type="button" variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Cancel editing" title="Cancel editing" onClick={() => { setEditingMessage(null); setBody(""); setError(null); }}><XIcon className="size-5" /></Button></div>}
        {replyingTo && <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs"><span className="truncate">Replying to: {replyingTo.body}</span><button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 px-2 text-muted-foreground">Cancel</button></div>}
        {files.length > 0 && <div className="grid grid-cols-1 gap-2 border-b border-border/70 p-3 sm:grid-cols-2">
          {files.map((item) => <div key={item.key} className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-2">
            {item.mimeType.startsWith("image/") ? <Image src={item.previewUrl} alt={`Preview of ${item.file.name}`} width={96} height={96} unoptimized className="size-12 shrink-0 rounded-lg object-cover" /> : item.mimeType.startsWith("video/") ? <video src={item.previewUrl} controls preload="metadata" className="h-12 w-16 shrink-0 rounded-lg object-cover" /> : <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary"><FileTextIcon className="size-5" /></span>}
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.file.name}</span><span className="block text-[11px] text-muted-foreground">{formatFileSize(item.file.size)} · {item.status === "uploading" ? "Uploading…" : item.status === "ready" ? "Ready" : item.error}</span></span>
            {item.status === "failed" && <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => void uploadFile(item)}>Retry</Button>}
            <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" disabled={item.status === "uploading"} onClick={() => void removeFile(item)} aria-label={`Remove ${item.file.name}`} title={`Remove ${item.file.name}`}><XIcon className="size-4" /></Button>
          </div>)}
        </div>}
        <Textarea value={body} onChange={(event) => { updateBody(event.currentTarget.value); setCursorAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length); }} onSelect={(event) => setCursorAtEnd(event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length)} onKeyDown={handleBodyKeyDown} onBlur={stopTyping} placeholder={files.length ? "Add a message…" : "Write your message…"} aria-label="Message body" className="min-h-24 resize-y border-0 shadow-none focus-visible:ring-0" maxLength={10000} />
        <SuggestionControls suggestion={suggestion} isGenerating={isGeneratingSuggestion} unavailable={suggestionUnavailable} waitingForDraft={waitingForDraft} onAccept={acceptSuggestion} onDismiss={dismissSuggestion} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip" className="sr-only" onChange={(event) => void chooseFiles(event)} aria-label="Choose attachments" />
            <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={Boolean(editingMessage) || files.length >= MAX_FILES || sending}><PaperclipIcon className="mr-1 size-4" />Attach</Button>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">Up to {MAX_FILES} files, 25 MB each</span>
          </div>
          {error ? <p role="alert" className="min-w-0 flex-1 text-xs text-destructive">{error}</p> : <span className="hidden text-xs text-muted-foreground lg:inline">A thoughtful note goes a long way.</span>}
          <div className="flex items-center gap-2">{editingMessage && <Button type="button" variant="ghost" onClick={() => { setEditingMessage(null); setBody(""); setError(null); }} disabled={sending}>Cancel</Button>}<Button type="submit" disabled={!canSend} className="rounded-xl">{sending ? editingMessage ? "Saving…" : "Sending…" : editingMessage ? "Save" : "Send"}</Button></div>
        </div>
      </div>
    </form>
  );
}
