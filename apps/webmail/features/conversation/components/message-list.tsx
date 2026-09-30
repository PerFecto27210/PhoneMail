"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";
import { MESSAGE_EDIT_WINDOW_MS } from "../../../../../db/convex/messagePolicy";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@phonemail/ui/components/alert-dialog";
import { Avatar, AvatarFallback } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@phonemail/ui/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@phonemail/ui/components/dropdown-menu";
import { FileTextIcon, MailIcon, MoreHorizontalIcon, PencilIcon, ReplyIcon, Trash2Icon } from "@phonemail/ui/components/icons";
import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import { formatTime } from "./conversation-sidebar";

type Attachment = {
  storageId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string | null;
};

type Message = {
  _id: Id<"messages">;
  senderId: string;
  body: string;
  subject?: string;
  createdAt: number;
  updatedAt?: number;
  editedAt?: number;
  deletedAt?: number;
  attachments?: Attachment[];
};

function formatFileSize(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageList({ messages, currentUserId, senderNames }: { messages: Message[]; currentUserId: string; senderNames: Map<string, string> }) {
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"messages"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const deleteMessage = useMutation(api.message.deleteMessage);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMessage({ messageId: deleteTarget });
      setDeleteTarget(null);
    } catch {
      setDeleteError("This message could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <ScrollArea className="min-h-0 flex-1"><div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-8 sm:py-7">
      {messages.map((message) => {
        const own = message.senderId === currentUserId;
        const deleted = message.deletedAt !== undefined;
        const name = own ? "You" : senderNames.get(message.senderId) ?? "PhoneMail member";
        const canEdit = own && !deleted && now - message.createdAt <= MESSAGE_EDIT_WINDOW_MS;
        return <article key={message._id} className={`min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6 ${own ? "ml-3 sm:ml-12" : "mr-3 sm:mr-12"}`}>
          <header className="mb-4 flex min-w-0 items-center gap-3"><Avatar className="size-9 shrink-0"><AvatarFallback className={own ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}>{name.slice(0, 1)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleDateString()} · {formatTime(message.createdAt)}</p></div>{message.editedAt && !deleted && <span className="text-xs text-muted-foreground">edited</span>}<MessageActions message={message} own={own} canEdit={canEdit} onDelete={() => { setDeleteError(null); setDeleteTarget(message._id); }} /></header>
          {deleted ? <p className="text-sm italic text-muted-foreground">This message was deleted.</p> : <>
            {message.subject && <h3 className="mb-2 break-words font-semibold">{message.subject}</h3>}
            {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground/90">{message.body}</p>}
            {!!message.attachments?.length && <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {message.attachments.map((attachment) => <div key={attachment.storageId} className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                {attachment.mimeType.startsWith("image/") && attachment.url ? <button type="button" className="block w-full overflow-hidden bg-muted" onClick={() => setPreview(attachment)} aria-label={`Open image ${attachment.fileName}`}><Image src={attachment.url} alt={attachment.fileName} width={1200} height={800} unoptimized className="max-h-80 w-full object-contain" /></button> : null}
                {attachment.mimeType.startsWith("video/") && attachment.url ? <video src={attachment.url} controls preload="metadata" className="max-h-80 w-full bg-black" aria-label={attachment.fileName} /> : null}
                {!attachment.mimeType.startsWith("image/") && !attachment.mimeType.startsWith("video/") && <div className="flex items-center gap-3 p-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><FileTextIcon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{attachment.fileName}</span><span className="block text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span></span></div>}
                <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border/60 px-3 py-2"><span className="min-w-0 truncate text-xs text-muted-foreground">{attachment.fileName}</span>{attachment.url ? <a className="shrink-0 text-xs font-medium text-primary hover:underline" href={attachment.url} target="_blank" rel="noreferrer" download={attachment.fileName}>Download</a> : <span className="shrink-0 text-xs text-destructive">File unavailable</span>}</div>
              </div>)}
            </div>}
          </>}
        </article>;
      })}
      {messages.length === 0 && <div className="grid flex-1 place-items-center py-20 text-center"><div><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-primary"><MailIcon className="size-7" /></div><h2 className="font-semibold">A fresh conversation</h2><p className="mt-1 text-sm text-muted-foreground">Send a message to start the conversation.</p></div></div>}
    </div></ScrollArea>
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
      <DialogContent className="max-h-[92dvh] w-[min(96vw,64rem)] overflow-hidden p-2 sm:p-4">
        <DialogTitle className="sr-only">{preview?.fileName ?? "Image preview"}</DialogTitle>
        {preview?.url && <Image src={preview.url} alt={preview.fileName} width={1600} height={1200} unoptimized className="max-h-[82dvh] w-full object-contain" />}
        <div className="flex min-w-0 items-center justify-between gap-2 px-2 pb-1"><span className="truncate text-xs text-muted-foreground">{preview?.fileName}</span>{preview?.url && <Button asChild variant="ghost" size="sm"><a href={preview.url} target="_blank" rel="noreferrer" download={preview.fileName}>Download</a></Button>}</div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) { setDeleteTarget(null); setDeleteError(null); } }}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <AlertDialogHeader><AlertDialogTitle>Delete message?</AlertDialogTitle><AlertDialogDescription>This message will be deleted from the conversation.</AlertDialogDescription></AlertDialogHeader>
        {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>{deleting ? "Deleting…" : "Delete message"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function MessageActions({ message, own, canEdit, onDelete }: { message: Message; own: boolean; canEdit: boolean; onDelete: () => void }) {
  function reply() {
    window.dispatchEvent(new CustomEvent("phonemail:reply", { detail: { _id: message._id, body: message.body } }));
  }
  function edit() {
    window.dispatchEvent(new CustomEvent("phonemail:edit", { detail: { _id: message._id, body: message.body, hasAttachments: Boolean(message.attachments?.length) } }));
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-10 shrink-0 rounded-full" aria-label="Message actions" title="Message actions"><MoreHorizontalIcon className="size-5" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-44">
      <DropdownMenuItem onSelect={reply}><ReplyIcon className="mr-2 size-4" />Reply</DropdownMenuItem>
      {canEdit && <DropdownMenuItem onSelect={edit}><PencilIcon className="mr-2 size-4" />Edit</DropdownMenuItem>}
      {own && message.deletedAt === undefined && <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2Icon className="mr-2 size-4" />Delete</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
