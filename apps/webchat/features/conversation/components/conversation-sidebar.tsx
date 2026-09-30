"use client";

import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { InboxIcon, MailIcon, StarIcon, UsersRoundIcon } from "@phonemail/ui/components/icons";
import { ConversationSearch, type SearchConversation } from "./conversation-search";

export type ConversationFilter = "all" | "unread" | "favorites";

export function ConversationSidebar({ entries, selectedId, onSelect, onSignOut, signingOut, onNewGroup, onToggleFavorite, onFilterChange, filter, profileName, profilePhone, avatarUrl, currentUserId }: {
  entries: SearchConversation[]; selectedId: string | null;
  onSelect: (id: string) => void; onSignOut: () => void; signingOut: boolean; onNewGroup: () => void; onToggleFavorite: (id: string) => void; profileName?: string; profilePhone: string; avatarUrl?: string; currentUserId: string;
  filter: ConversationFilter; onFilterChange: (filter: ConversationFilter) => void;
}) {
  const visibleEntries = entries.filter((entry) => filter === "unread" ? entry.unread > 0 : filter === "favorites" ? entry.isStarred : true);
  const unreadCount = entries.reduce((total, entry) => total + entry.unread, 0);
  return <aside className="flex min-h-0 w-full flex-col border-r border-border/80 bg-white md:w-[340px] md:shrink-0">
    <header className="flex h-[72px] items-center border-b border-border/70 px-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary font-bold text-white">p</span><span className="text-lg font-bold tracking-tight">PhoneMail</span></div></header>
    <div className="border-b border-border/70"><div className="flex items-center justify-between px-4 pt-4"><h1 className="text-xl font-semibold tracking-tight">{filter === "unread" ? "Unread" : filter === "favorites" ? "Favorites" : "Inbox"} <span className="ml-1 text-sm font-normal text-muted-foreground">{filter === "unread" ? unreadCount : visibleEntries.length}</span></h1><Button type="button" variant="ghost" size="icon" className="size-9 rounded-full" title="Start a group" aria-label="Start a group conversation" onClick={onNewGroup}><UsersRoundIcon className="size-4" /></Button></div><ConversationSearch entries={entries} currentUserId={currentUserId} onSelectConversation={onSelect} /><nav aria-label="Conversation filters" className="flex gap-1 px-3 pb-3">{([{ id: "all", label: "All", icon: InboxIcon }, { id: "unread", label: "Unread", icon: MailIcon }, { id: "favorites", label: "Favorites", icon: StarIcon }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => onFilterChange(id)} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${filter === id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}><Icon className="size-3.5" />{label}</button>)}</nav></div>
    <ScrollArea className="min-h-0 flex-1"><div className="p-2">{visibleEntries.map((entry) => {
      const active = selectedId === entry.conversation._id;
      return <div key={entry.conversation._id} className={`mb-1 flex items-center gap-1 rounded-xl pr-2 transition ${active ? "bg-accent" : "hover:bg-muted/70"}`}>
        <button type="button" onClick={() => onSelect(entry.conversation._id)} aria-current={active ? "page" : undefined} className="min-w-0 flex-1 rounded-xl p-3 text-left">
          <span className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dff0e8] font-semibold text-[#28635f]"><Avatar className="size-11"><AvatarImage src={entry.conversation.type === "direct" ? entry.participants.find(({ _id }) => _id !== currentUserId)?.avatarUrl ?? undefined : undefined} /><AvatarFallback className="bg-[#dff0e8] text-[#28635f]">{entry.otherName.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{entry.conversation.title ?? entry.otherName}</span><time className="shrink-0 text-[11px] text-muted-foreground">{formatTime(entry.conversation.updatedAt)}</time></span><span className="mt-1 block truncate text-xs text-muted-foreground">{entry.preview || "No messages yet"}</span></span>{entry.unread > 0 && <span className="mt-1 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{entry.unread}</span>}</span>
        </button>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 rounded-full" aria-label={entry.isStarred ? "Remove favorite" : "Add favorite"} title={entry.isStarred ? "Remove favorite" : "Add favorite"} onClick={() => onToggleFavorite(entry.conversation._id)}><StarIcon className={`size-4 ${entry.isStarred ? "fill-current text-amber-500" : "text-muted-foreground"}`} /></Button>
      </div>;
    })}{visibleEntries.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">{filter === "favorites" ? "Star a conversation to keep it close at hand." : filter === "unread" ? "You’re all caught up." : "Your conversations will appear here."}</p>}</div></ScrollArea>
    <footer className="border-t border-border/70 p-3"><div className="flex items-center gap-2"><Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 hover:bg-muted/70"><Avatar className="size-10 shrink-0"><AvatarImage src={avatarUrl} /><AvatarFallback className="bg-accent text-sm font-semibold text-primary">{(profileName ?? profilePhone).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm font-medium">{profileName || profilePhone}</span><span className="block text-xs text-muted-foreground">Profile & settings</span></span></Link><button onClick={onSignOut} disabled={signingOut} className="rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60" aria-label="Sign out">{signingOut ? "Signing out…" : "Sign out"}</button></div></footer>
  </aside>;
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
}
