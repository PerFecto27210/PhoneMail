"use client";

import { Component, type ReactNode, useMemo, useState } from "react";
import { Input } from "@phonemail/ui/components/input";
import { ScrollArea } from "@phonemail/ui/components/scroll-area";
import { useGetOrCreateDirectConversation, useSearchUsers } from "../api/search";
import type { Id } from "../../../../../db/convex/_generated/dataModel";

export type SearchConversation = {
  conversation: { _id: string; type: "direct" | "group"; title?: string; updatedAt: number };
  otherName: string;
  preview: string;
  unread: number;
  isStarred: boolean;
  participants: Array<{ _id: string; name: string | null; phoneNumber: string; avatarUrl: string | null }>;
};

export function ConversationSearch({ entries, currentUserId, onSelectConversation }: {
  entries: SearchConversation[]; currentUserId: string; onSelectConversation: (id: string) => void;
}) {
  return <SearchErrorBoundary><ConversationSearchContent entries={entries} currentUserId={currentUserId} onSelectConversation={onSelectConversation} /></SearchErrorBoundary>;
}

type SearchErrorBoundaryProps = { children: ReactNode };
type SearchErrorBoundaryState = { failed: boolean };

class SearchErrorBoundary extends Component<SearchErrorBoundaryProps, SearchErrorBoundaryState> {
  state: SearchErrorBoundaryState = { failed: false };
  static getDerivedStateFromError(): SearchErrorBoundaryState { return { failed: true }; }
  render() {
    if (this.state.failed) return <p role="alert" className="px-4 py-3 text-xs text-destructive">Search is temporarily unavailable. Try again in a moment.</p>;
    return this.props.children;
  }
}

function ConversationSearchContent({ entries, currentUserId, onSelectConversation }: {
  entries: SearchConversation[]; currentUserId: string; onSelectConversation: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [creatingUserId, setCreatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const users = useSearchUsers(query);
  const getOrCreateDirect = useGetOrCreateDirectConversation();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const conversationMatches = useMemo(() => entries.filter(({ conversation, otherName, participants }) => {
    const otherParticipants = participants.filter((user) => user._id !== currentUserId);
    const haystack = [conversation.title, otherName, ...otherParticipants.map((user) => user.name), ...otherParticipants.map((user) => user.phoneNumber)].filter(Boolean).join(" ").toLocaleLowerCase();
    return haystack.includes(normalizedQuery);
  }), [currentUserId, entries, normalizedQuery]);
  const directMatches = conversationMatches.filter(({ conversation }) => conversation.type === "direct");
  const groupMatches = conversationMatches.filter(({ conversation }) => conversation.type === "group");

  async function startConversation(userId: string) {
    setCreatingUserId(userId); setError(null);
    try {
      const conversation = await getOrCreateDirect({ recipientId: userId as Id<"users"> });
      if (!conversation) throw new Error("conversation_unavailable");
      setQuery(""); setFocused(false); onSelectConversation(conversation._id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : "";
      setError(message.includes("blocked")
        ? "You can’t start a conversation because one of you has blocked the other."
        : message.includes("recipient_not_found")
          ? "That PhoneMail user is no longer available."
          : "We couldn’t start that conversation. Please try again.");
    } finally { setCreatingUserId(null); }
  }

  return <div className="border-b border-border/70 p-4">
    <div className="relative"><Input placeholder="Search people or conversations" aria-label="Search people and conversations" value={query} onFocus={() => setFocused(true)} onChange={(event) => { setQuery(event.target.value); setError(null); }} onKeyDown={(event) => { if (event.key === "Escape") { setFocused(false); setQuery(""); } }} className="h-10 rounded-xl bg-muted/60 pr-12" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Clear</button>}</div>
    {focused && <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white shadow-lg shadow-[#174846]/5">
      <ScrollArea className="max-h-[min(60vh,520px)]"><div className="space-y-4 p-3">
        {!normalizedQuery && <section><SectionTitle>Recent conversations</SectionTitle>{entries.length ? entries.slice(0, 8).map((entry) => <ConversationResult key={entry.conversation._id} entry={entry} onClick={() => { setFocused(false); onSelectConversation(entry.conversation._id); }} />) : <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet. Search for someone by name or phone number to start one.</p>}</section>}
        {normalizedQuery && <>
          <section><SectionTitle>People</SectionTitle>{users === undefined ? <p className="px-2 py-3 text-xs text-muted-foreground">Searching PhoneMail…</p> : users.length ? users.map((user) => <button key={user._id} type="button" onClick={() => void startConversation(user._id)} disabled={creatingUserId !== null} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent disabled:opacity-60"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">{(user.name ?? user.phoneNumber).slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name ?? "PhoneMail member"}</span><span className="block truncate text-xs text-muted-foreground">{user.phoneNumber}</span></span><span className="text-xs text-primary">{creatingUserId === user._id ? "Opening…" : "Message"}</span></button>) : <p className="px-2 py-2 text-xs text-muted-foreground">No people found.</p>}</section>
          <section><SectionTitle>Conversations</SectionTitle>{directMatches.length ? directMatches.map((entry) => <ConversationResult key={entry.conversation._id} entry={entry} onClick={() => { setFocused(false); onSelectConversation(entry.conversation._id); }} />) : <p className="px-2 py-2 text-xs text-muted-foreground">No conversations found.</p>}</section>
          <section><SectionTitle>Groups</SectionTitle>{groupMatches.length ? groupMatches.map((entry) => <ConversationResult key={entry.conversation._id} entry={entry} onClick={() => { setFocused(false); onSelectConversation(entry.conversation._id); }} />) : <p className="px-2 py-2 text-xs text-muted-foreground">No groups found.</p>}</section>
        </>}
        {normalizedQuery && users !== undefined && users.length === 0 && directMatches.length === 0 && groupMatches.length === 0 && <p className="rounded-lg bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">No results found.</p>}
        {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{error}</p>}
      </div></ScrollArea>
      <div className="border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">Phone number searches work best with a country code.</div>
    </div>}
  </div>;
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-1 px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h2>;
}

function ConversationResult({ entry, onClick }: { entry: SearchConversation; onClick: () => void }) {
  const title = entry.conversation.title ?? entry.otherName;
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dff0e8] text-sm font-semibold text-[#28635f]">{title.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{entry.preview || (entry.conversation.type === "group" ? `${entry.participants.length} members` : entry.otherName)}</span></span>{entry.unread > 0 && <span className="text-xs font-semibold text-primary">{entry.unread}</span>}</button>;
}
