"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { MailIcon, StarIcon, UsersRoundIcon } from "@phonemail/ui/components/icons";
import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import { formatTime } from "./conversation-sidebar";

export type MailEntry = {
  conversation: { _id: string; type: "direct" | "group"; title?: string; updatedAt: number };
  otherName: string;
  otherPhone: string;
  participantPreview: string;
  participantSearch: string;
  avatarUrl?: string;
  preview: string;
  subject?: string;
  unread: number;
  lastSenderId?: string;
  isStarred: boolean;
};

export function MailList({ entries, currentUserId, onOpen, onToggleFavorite, emptyTitle, emptyMessage }: {
  entries: MailEntry[]; currentUserId: string; onOpen: (id: string) => void; onToggleFavorite: (id: string) => void; emptyTitle: string; emptyMessage: string;
}) {
  if (entries.length === 0) return <div className="flex min-h-[280px] flex-1 items-center justify-center px-6 py-14 text-center"><div className="max-w-sm"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-accent text-primary"><MailIcon className="size-7" /></div><h2 className="font-semibold">{emptyTitle}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{emptyMessage}</p></div></div>;
  return <ScrollArea className="min-h-0 flex-1"><div className="divide-y divide-border/60">{entries.map((entry) => {
    const sender = entry.lastSenderId === currentUserId ? `You → ${entry.otherName}` : entry.otherName;
    return <div key={entry.conversation._id} className={`group relative flex min-h-[76px] items-center gap-2 px-3 py-3 transition hover:z-[1] hover:bg-muted/70 sm:gap-3 sm:px-5 lg:px-7 ${entry.unread > 0 ? "bg-accent/30" : "bg-card"}`}>
      <button type="button" aria-label={`Open message from ${entry.otherName}`} onClick={() => onOpen(entry.conversation._id)} className="absolute inset-0 z-0" />
      <button type="button" aria-label={entry.isStarred ? "Remove from favorites" : "Add to favorites"} aria-pressed={entry.isStarred} title={entry.isStarred ? "Remove from favorites" : "Add to favorites"} onClick={() => onToggleFavorite(entry.conversation._id)} className="relative z-[1] grid size-10 shrink-0 place-items-center rounded-full text-amber-500 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><StarIcon className="size-5" fill={entry.isStarred ? "currentColor" : "none"} strokeWidth={1.8} /></button>
      <Avatar className="relative z-[1] size-9 shrink-0 sm:size-10"><AvatarImage src={entry.avatarUrl} /><AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">{entry.conversation.type === "group" ? <UsersRoundIcon className="size-5" /> : entry.otherName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
      <span className="pointer-events-none relative z-[1] grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,2fr)_auto] sm:gap-x-4">
        <span className={`truncate text-[13px] sm:text-sm ${entry.unread ? "font-bold" : "font-medium"}`}>{entry.conversation.type === "group" && <UsersRoundIcon aria-label="Group mail" className="mr-1 inline size-3.5 align-[-2px] text-primary" />}{sender}<span className="ml-1 font-normal text-muted-foreground sm:hidden">· {entry.otherPhone}</span></span>
        <span className="col-span-2 min-w-0 truncate text-[13px] sm:col-span-1"><span className={entry.unread ? "font-semibold" : "font-medium"}>{entry.subject || "(no subject)"}</span><span className="text-muted-foreground"> — {entry.preview || "No message yet"}</span></span>
        <span className="row-start-1 text-right text-[11px] text-muted-foreground sm:row-auto sm:text-xs">{formatTime(entry.conversation.updatedAt)}</span>
        <span className="hidden truncate text-[11px] text-muted-foreground sm:col-start-2 sm:block">{entry.conversation.type === "group" ? entry.participantPreview : entry.otherPhone}</span>
      </span>
      {entry.unread > 0 && <span aria-label={`${entry.unread} unread`} className="relative z-[1] size-2 shrink-0 rounded-full bg-primary sm:mr-1" />}
    </div>;
  })}</div></ScrollArea>;
}
