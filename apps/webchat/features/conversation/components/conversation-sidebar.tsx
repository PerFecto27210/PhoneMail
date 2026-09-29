"use client";

import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import Link from "next/link";
import { ConversationSearch, type SearchConversation } from "./conversation-search";

export function ConversationSidebar({ entries, selectedId, onSelect, onSignOut, profileName, profilePhone, profileImage, currentUserId }: {
  entries: SearchConversation[]; selectedId: string | null;
  onSelect: (id: string) => void; onSignOut: () => void; profileName?: string; profilePhone: string; profileImage?: string; currentUserId: string;
}) {
  return <aside className="flex min-h-0 w-full flex-col border-r border-border/80 bg-white md:w-[340px] md:shrink-0">
    <header className="flex h-[72px] items-center border-b border-border/70 px-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary font-bold text-white">p</span><span className="text-lg font-bold tracking-tight">PhoneMail</span></div></header>
    <div className="border-b border-border/70"><div className="px-4 pt-4"><h1 className="text-xl font-semibold tracking-tight">Inbox <span className="ml-1 text-sm font-normal text-muted-foreground">{entries.length}</span></h1></div><ConversationSearch entries={entries} currentUserId={currentUserId} onSelectConversation={onSelect} /></div>
    <ScrollArea className="min-h-0 flex-1"><div className="p-2">{entries.map((entry) => {
      const active = selectedId === entry.conversation._id;
      return <button key={entry.conversation._id} onClick={() => onSelect(entry.conversation._id)} className={`mb-1 w-full rounded-xl p-3 text-left transition ${active ? "bg-accent" : "hover:bg-muted/70"}`}>
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#dff0e8] font-semibold text-[#28635f]">{entry.otherName.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{entry.conversation.title ?? entry.otherName}</span><time className="shrink-0 text-[11px] text-muted-foreground">{formatTime(entry.conversation.updatedAt)}</time></span><span className="mt-1 block truncate text-xs text-muted-foreground">{entry.preview || "No messages yet"}</span></span>{entry.unread > 0 && <span className="mt-1 grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">{entry.unread}</span>}</div>
      </button>;
    })}{entries.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">Your conversations will appear here.</p>}</div></ScrollArea>
    <footer className="border-t border-border/70 p-3"><div className="flex items-center gap-2"><Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 hover:bg-muted/70"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-primary">{profileImage ? profileImage.slice(-1) : (profileName ?? profilePhone).slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{profileName || profilePhone}</span><span className="block text-xs text-muted-foreground">Profile & settings</span></span></Link><button onClick={onSignOut} className="rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted" aria-label="Sign out">Sign out</button></div></footer>
  </aside>;
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
}
