"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { Input } from "@phonemail/ui/components/input";
import { Skeleton } from "@phonemail/ui/components/skeleton";
import { ArrowLeftIcon, MenuIcon, MessageSquareIcon, PlusIcon, SearchIcon, UsersRoundIcon } from "@phonemail/ui/components/icons";
import { signOut } from "../../auth/api/auth";
import { authClient } from "../../../lib/auth-client";
import { ConversationDetails } from "./conversation-details";
import { ConversationSidebar, type MailFolder } from "./conversation-sidebar";
import { ComposeMail } from "./compose-mail";
import { MailList, type MailEntry } from "./mail-list";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";
import { useBlockStatus, useConversationMembers, useConversations, useMarkConversationRead, useMessages, useToggleFavorite, useTypingUsers } from "../api/conversations";
import { ConversationMemberActions } from "./conversation-member-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@phonemail/ui/components/dialog";

type Props = { name?: string; phoneNumber: string; userId: string };
const folderTitles: Record<MailFolder, string> = { all: "All Mail", unread: "Unread", favorites: "Favorites", attachments: "Attachments", drafts: "Drafts" };

export function ConversationHome({ name, phoneNumber, userId }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const conversations = useConversations();
  const currentUser = useQuery(api.user.getCurrentUser, {});
  const [folder, setFolder] = useState<MailFolder>("all");
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const members = useConversationMembers(selectedId);
  const messages = useMessages(selectedId);
  const markRead = useMarkConversationRead();
  const sendMessage = useMutation(api.message.sendMessage);
  const replyToMessage = useMutation(api.message.replyToMessage);
  const toggleFavorite = useToggleFavorite();

  const entries = useMemo<MailEntry[]>(() => (conversations ?? []).map(({ conversation, lastMessage, unreadCount, participants, membership }) => {
    const others = participants.filter((participant) => participant._id !== userId);
    const other = others[0];
    const otherName = conversation.type === "group"
      ? conversation.title ?? others.map(({ name, phoneNumber }) => name ?? phoneNumber).join(", ")
      : other?.name ?? other?.phoneNumber ?? "Conversation";
    const participantPreview = conversation.type === "group"
      ? others.map(({ name, phoneNumber }) => name ?? phoneNumber).join(", ")
      : other?.phoneNumber ?? "";
    const participantSearch = conversation.type === "group"
      ? participants.map(({ name, phoneNumber }) => `${name ?? ""} ${phoneNumber}`).join(" ")
      : "";
    return {
      conversation,
      otherName,
      otherPhone: conversation.type === "group" ? `${participants.length} participants` : other?.phoneNumber ?? "",
      participantPreview,
      avatarUrl: conversation.type === "group" ? undefined : other?.avatarUrl ?? undefined,
      participantSearch,
      preview: lastMessage?.body ?? "",
      subject: lastMessage?.subject,
      lastSenderId: lastMessage?.senderId,
      unread: unreadCount,
      isStarred: Boolean(membership.isStarred),
    };
  }).sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt), [conversations, userId]);

  const unreadCount = entries.reduce((total, entry) => total + entry.unread, 0);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleEntries = useMemo(() => entries.filter((entry) => {
    if (folder === "unread" && entry.unread === 0) return false;
    if (folder === "favorites" && !entry.isStarred) return false;
    if (folder === "attachments" || folder === "drafts") return false;
    return !normalizedSearch || [entry.otherName, entry.otherPhone, entry.participantSearch, entry.subject, entry.preview].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalizedSearch);
  }), [entries, folder, normalizedSearch]);

  const details = useMemo(() => (members ?? []).flatMap(({ user }) => user ? [{ user }] : []), [members]);
  const senderNames = useMemo(() => new Map<string, string>(details.map(({ user }) => [user._id, user.name ?? user.phoneNumber] as [string, string])), [details]);
  const activeConversation = conversations?.find(({ conversation }) => conversation._id === selectedId)?.conversation;
  const selectedEntry = entries.find((entry) => entry.conversation._id === selectedId);
  const otherMember = details.find(({ user }) => user._id !== userId)?.user;
  const groupParticipantPreview = details.map(({ user }) => user.name ?? user.phoneNumber).join(", ");
  const blockStatus = useBlockStatus(activeConversation?.type === "direct" && otherMember ? otherMember._id : null);
  const typingUsers = useTypingUsers(selectedId);
  const typingNames = (typingUsers ?? []).map(({ name }) => name ?? "Someone");
  const typingLabel = typingNames.length === 1 ? `${typingNames[0]} is typing…` : typingNames.length === 2 ? `${typingNames[0]} and ${typingNames[1]} are typing…` : typingNames.length > 2 ? "Several people are typing…" : undefined;
  const blockedMessage = blockStatus && !blockStatus.canMessage
    ? blockStatus.isBlockedByMe ? "You blocked this person. Use the conversation menu to unblock them." : "This person has blocked you. You can’t send a direct message."
    : undefined;
  const activeTitle = activeConversation?.type === "group" ? activeConversation.title ?? "Group conversation" : otherMember?.name ?? otherMember?.phoneNumber ?? selectedEntry?.otherName ?? "Conversation";

  useEffect(() => {
    if (!selectedId || !conversations) return;
    const entry = conversations.find(({ conversation }) => conversation._id === selectedId);
    if (entry && entry.unreadCount > 0) void markRead({ conversationId: selectedId });
  }, [conversations, markRead, selectedId]);

  function openConversation(id: string) {
    const conversationId = id as Id<"conversations">;
    setSelectedId(conversationId);
    setMobileConversation(true);
    const entry = conversations?.find(({ conversation }) => conversation._id === conversationId);
    if (entry?.unreadCount) void markRead({ conversationId });
  }
  async function handleSend(body: string, parentMessageId?: string, attachmentUploadIds?: Id<"attachmentUploads">[]) {
    if (!selectedId) return;
    setIsSending(true);
    try {
      if (parentMessageId) await replyToMessage({ conversationId: selectedId, parentMessageId: parentMessageId as Id<"messages">, body, attachmentUploadIds });
      else await sendMessage({ conversationId: selectedId, body, attachmentUploadIds });
    } finally { setIsSending(false); }
  }
  async function handleSignOut() {
    setIsSigningOut(true);
    try { await signOut(); router.replace("/"); router.refresh(); }
    catch { setIsSigningOut(false); }
  }
  async function handleToggleFavorite(id: string) {
    try { await toggleFavorite({ conversationId: id as Id<"conversations"> }); }
    catch { /* The authenticated list remains unchanged if the update fails. */ }
  }

  if (isPending || !session || conversations === undefined || !currentUser) return <div className="flex h-[100dvh] items-center justify-center p-6"><Skeleton className="h-[82vh] w-full max-w-6xl rounded-3xl" /></div>;
  const isFolderUnsupported = folder === "attachments" || folder === "drafts";
  const emptyTitle = isFolderUnsupported ? `No ${folderTitles[folder].toLowerCase()} yet` : normalizedSearch ? "No messages found" : folder === "favorites" ? "No favorites yet" : "Your inbox is clear";
  const emptyMessage = isFolderUnsupported ? `${folderTitles[folder]} aren't supported by the current message model yet.` : normalizedSearch ? "Try another name, phone number, subject, or keyword." : folder === "favorites" ? "Star a conversation to keep it close at hand." : "Messages sent to your PhoneMail number will appear here. Compose a message to get started.";

  return <main className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
    <div className="hidden shrink-0 md:flex"><ConversationSidebar folder={folder} onFolderChange={setFolder} onCompose={() => setComposeOpen(true)} unreadCount={unreadCount} profileName={currentUser.name ?? name} profilePhone={currentUser.phoneNumber ?? phoneNumber} avatarUrl={currentUser.avatarUrl} onSignOut={() => void handleSignOut()} signingOut={isSigningOut} /></div>
    {mobileMenu && <div className="fixed inset-0 z-40 flex md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-black/30" onClick={() => setMobileMenu(false)} /><ConversationSidebar folder={folder} onFolderChange={setFolder} onCompose={() => setComposeOpen(true)} onClose={() => setMobileMenu(false)} unreadCount={unreadCount} profileName={currentUser.name ?? name} profilePhone={currentUser.phoneNumber ?? phoneNumber} avatarUrl={currentUser.avatarUrl} onSignOut={() => void handleSignOut()} signingOut={isSigningOut} /></div>}

    <section className="flex min-w-0 flex-1 flex-col">
      {!mobileConversation && <header className="z-10 flex h-[68px] shrink-0 items-center gap-3 border-b border-border/70 bg-background px-3 sm:px-5 lg:px-7">
        <Button type="button" variant="ghost" size="icon" aria-label="Open mail folders" className="shrink-0 rounded-full md:hidden" onClick={() => setMobileMenu(true)}><MenuIcon className="size-5" /></Button>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:hidden">p</span>
        <div className="hidden items-center gap-2 pr-2 md:flex lg:hidden"><span className="grid size-9 place-items-center rounded-full bg-primary font-bold text-primary-foreground">p</span></div>
        <div className="relative min-w-0 max-w-2xl flex-1"><SearchIcon aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mail" aria-label="Search mail" className="h-11 rounded-full border-0 bg-muted pl-11 pr-10 shadow-none focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">×</button>}</div>
        <LinkProfile name={currentUser.name ?? name} phone={currentUser.phoneNumber ?? phoneNumber} avatarUrl={currentUser.avatarUrl} />
      </header>}

      {selectedId ? <>
        <header className="flex h-[62px] shrink-0 items-center gap-2 border-b border-border/70 bg-background px-2 sm:gap-3 sm:px-5"><Button type="button" variant="ghost" size="icon" aria-label="Back to All Mail" onClick={() => { setSelectedId(null); setMobileConversation(false); }} className="rounded-full"><ArrowLeftIcon className="size-5" /></Button><Avatar className="size-9"><AvatarImage src={selectedEntry?.avatarUrl} /><AvatarFallback className="bg-accent text-accent-foreground">{activeConversation?.type === "group" ? <UsersRoundIcon className="size-5" /> : activeTitle.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold sm:text-base">{activeTitle}</h1><p className="truncate text-xs text-muted-foreground">{activeConversation?.type === "group" ? `${groupParticipantPreview} · ${details.length} participants` : otherMember?.phoneNumber ?? selectedEntry?.otherPhone}</p></div>{activeConversation?.type === "direct" && otherMember && <div className="xl:hidden"><ConversationMemberActions userId={otherMember._id} label={activeTitle} direct /></div>}{activeConversation?.type === "group" && <Button type="button" variant="ghost" size="icon" aria-label="Group information" className="xl:hidden" onClick={() => setDetailsOpen(true)}><MessageSquareIcon className="size-5" /></Button>}<Button type="button" variant="ghost" size="icon" aria-label="Compose mail" onClick={() => setComposeOpen(true)} className="rounded-full"><PlusIcon className="size-5" /></Button><LinkProfile name={currentUser.name ?? name} phone={currentUser.phoneNumber ?? phoneNumber} avatarUrl={currentUser.avatarUrl} compact /></header>
        {messages !== undefined ? <MessageList messages={messages} currentUserId={userId} senderNames={senderNames} /> : <div className="min-h-0 flex-1" />}
        {messages !== undefined && <MessageComposer conversationId={selectedId} onSend={handleSend} sending={isSending} blockedMessage={blockedMessage} typingLabel={typingLabel} />}
      </> : <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card md:m-3 md:rounded-2xl md:border md:border-border/70 md:shadow-sm lg:m-5">
          <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 sm:px-6"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">Your messages</p><h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{folderTitles[folder]}</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">{folder === "unread" ? `${unreadCount} unread` : `${entries.length} conversations`}</span><Button type="button" variant="outline" size="sm" className="rounded-full md:hidden" onClick={() => setComposeOpen(true)}><PlusIcon className="mr-1 size-5" />Compose</Button><Button type="button" variant="ghost" size="icon" aria-label="Compose mail" title="Compose mail" className="hidden rounded-full md:inline-flex lg:hidden" onClick={() => setComposeOpen(true)}><PlusIcon className="size-5" /></Button></div></div>
          <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border/60 px-4 text-xs text-muted-foreground sm:px-6"><span className="font-medium text-foreground">▣</span><span>{normalizedSearch ? `Search results for “${search.trim()}”` : folder === "all" ? "Everything in your inbox" : folder === "unread" ? "Messages you haven’t read" : `Browse ${folderTitles[folder].toLowerCase()}`}</span></div>
          <MailList entries={visibleEntries} currentUserId={userId} onOpen={openConversation} onToggleFavorite={(id) => void handleToggleFavorite(id)} emptyTitle={emptyTitle} emptyMessage={emptyMessage} />
        </div>
        <Button type="button" onClick={() => setComposeOpen(true)} className="fixed bottom-5 right-5 z-20 size-14 rounded-2xl shadow-lg md:hidden" aria-label="Compose mail"><PlusIcon className="size-6" /></Button>
      </>}
    </section>

    {selectedId && activeConversation && <ConversationDetails title={activeTitle} members={details} currentUserId={userId} conversationType={activeConversation.type} />}
    {selectedId && activeConversation?.type === "group" && <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-sm"><DialogHeader><DialogTitle>Conversation details</DialogTitle><DialogDescription>People in this conversation</DialogDescription></DialogHeader><ConversationDetails title={activeTitle} members={details} currentUserId={userId} conversationType="group" embedded /></DialogContent></Dialog>}
    {composeOpen && <ComposeMail onClose={() => setComposeOpen(false)} onSent={(id) => { setComposeOpen(false); setFolder("all"); setSelectedId(id); setMobileConversation(true); }} />}
    {isSigningOut && <span className="sr-only">Signing out</span>}
  </main>;
}

function LinkProfile({ name, phone, avatarUrl, compact = false }: { name?: string; phone: string; avatarUrl?: string; compact?: boolean }) {
  return <Link href="/profile" aria-label="Profile and settings" title="Profile and settings" className={`flex shrink-0 items-center gap-2 rounded-full p-1.5 hover:bg-muted/70 ${compact ? "" : "pl-2"}`}><Avatar className="size-9"><AvatarImage src={avatarUrl} /><AvatarFallback className="bg-accent text-sm font-semibold text-primary">{(name || phone).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>{!compact && <span className="hidden max-w-32 truncate text-xs text-muted-foreground lg:block">{name || phone}</span>}</Link>;
}
