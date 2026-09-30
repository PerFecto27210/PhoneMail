"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { Button } from "@phonemail/ui/components/button";
import { Skeleton } from "@phonemail/ui/components/skeleton";
import { signOut } from "../../auth/api/auth";
import { authClient } from "../../../lib/auth-client";
import { GroupCompose } from "./group-compose";
import { ConversationDetails } from "./conversation-details";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";
import { useConversationMembers, useConversations, useMarkConversationRead, useMessages, useToggleFavorite, useTypingUsers } from "../api/conversations";

type Props = { name?: string; phoneNumber: string; userId: string };
type ConversationFilter = "all" | "unread" | "favorites";

export function ConversationHome({ name, phoneNumber, userId }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { isAuthenticated: convexAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const conversations = useConversations();
  const currentUser = useQuery(api.user.getCurrentUser, convexAuthenticated ? {} : "skip");
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [groupComposeOpen, setGroupComposeOpen] = useState(false);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [readError, setReadError] = useState(false);

  const activeId = selectedId ?? conversations?.[0]?.conversation._id ?? null;
  const members = useConversationMembers(activeId);
  const messages = useMessages(activeId);
  const markRead = useMarkConversationRead();
  const sendMessage = useMutation(api.message.sendMessage);
  const replyToMessage = useMutation(api.message.replyToMessage);
  const toggleFavorite = useToggleFavorite();
  const typingUsers = useTypingUsers(activeId);

  const details = useMemo(() => (members ?? []).flatMap(({ user }) => user ? [{ user }] : []), [members]);
  const senderNames = useMemo(() => new Map(details.map(({ user }) => [user._id, user.name ?? user.phoneNumber])), [details]);
  const entries = useMemo(() => (conversations ?? []).map(({ conversation, lastMessage, unreadCount, participants, membership }) => {
    const others = participants.filter((user) => user._id !== userId);
    const otherName = conversation.type === "group"
      ? conversation.title ?? others.map(({ name, phoneNumber: phone }) => name ?? phone).join(", ")
      : others[0]?.name ?? others[0]?.phoneNumber ?? "Conversation";
    return {
      conversation,
      otherName,
      preview: lastMessage?.body ?? "",
      unread: unreadCount,
      participants,
      isStarred: Boolean(membership.isStarred),
    };
  }).sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt), [conversations, userId]);

  const activeConversation = conversations?.find(({ conversation }) => conversation._id === activeId)?.conversation;
  const otherMember = details.find(({ user }) => user._id !== userId)?.user;
  const activeTitle = activeConversation?.type === "group"
    ? activeConversation.title ?? "Group conversation"
    : otherMember?.name ?? otherMember?.phoneNumber ?? entries.find(({ conversation }) => conversation._id === activeId)?.otherName ?? "Conversation";
  const directBlockStatus = useQuery(
    api.blocking.getBlockStatus,
    activeConversation?.type === "direct" && otherMember ? { userId: otherMember._id } : "skip",
  );
  const blockedMessage = directBlockStatus && !directBlockStatus.canMessage
    ? directBlockStatus.isBlockedByMe ? "You blocked this person. Use the conversation menu to unblock them." : "This person has blocked you. You can’t send a direct message."
    : undefined;
  const typingNames = (typingUsers ?? []).map(({ name: typingName }) => typingName ?? "Someone");
  const typingLabel = typingNames.length === 1 ? `${typingNames[0]} is typing…`
    : typingNames.length === 2 ? `${typingNames[0]} and ${typingNames[1]} are typing…`
      : typingNames.length > 2 ? "Several people are typing…" : undefined;

  useEffect(() => {
    if (!isPending && !session) router.replace("/?session=expired");
  }, [isPending, router, session]);

  useEffect(() => {
    if (!activeId || !conversations) return;
    const entry = conversations.find(({ conversation }) => conversation._id === activeId);
    if (!entry || entry.unreadCount === 0) return;
    void markRead({ conversationId: activeId }).then(() => setReadError(false)).catch(() => setReadError(true));
  }, [activeId, conversations, markRead]);

  function openConversation(id: string) {
    setSelectedId(id as Id<"conversations">);
    setMobileConversation(true);
  }

  async function handleSend(body: string, parentMessageId?: string, attachmentUploadIds?: Id<"attachmentUploads">[]) {
    if (!activeId) return;
    setIsSending(true);
    try {
      if (parentMessageId) {
        await replyToMessage({ conversationId: activeId, parentMessageId: parentMessageId as Id<"messages">, body, attachmentUploadIds });
      } else {
        await sendMessage({ conversationId: activeId, body, attachmentUploadIds });
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(false);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
      setSignOutError(true);
    }
  }

  async function handleToggleFavorite(id: string) {
    try { await toggleFavorite({ conversationId: id as Id<"conversations"> }); }
    catch { window.alert("We couldn’t update this favorite. Please try again."); }
  }

  if (isPending || convexAuthLoading || !session || !convexAuthenticated || conversations === undefined || !currentUser) {
    return <div className="flex h-screen items-center justify-center p-6"><Skeleton className="h-[70vh] w-full max-w-6xl rounded-3xl" /></div>;
  }

  return <main className="h-[100dvh] overflow-hidden p-0 sm:p-4 lg:p-6">
    <div className="mx-auto flex h-full max-w-[1680px] overflow-hidden bg-white shadow-xl shadow-[#174846]/5 sm:rounded-3xl sm:border sm:border-white/80">
      <div className={`${mobileConversation ? "hidden" : "flex"} w-full md:flex`}>
        <ConversationSidebar
          entries={entries}
          selectedId={activeId}
          currentUserId={userId}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={openConversation}
          onNewGroup={() => setGroupComposeOpen(true)}
          onToggleFavorite={(id) => void handleToggleFavorite(id)}
          onSignOut={() => void handleSignOut()}
          signingOut={isSigningOut}
          profileName={currentUser.name ?? name}
          profilePhone={currentUser.phoneNumber ?? phoneNumber}
          avatarUrl={currentUser.avatarUrl ?? undefined}
        />
      </div>
      <section className={`${mobileConversation ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#f9fcfb]`}>
        {activeId ? <>
          <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border/70 bg-white px-4 sm:px-7">
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileConversation(false)}>← Inbox</Button>
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-primary">{activeTitle.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{activeTitle}</h1><p className="truncate text-xs text-muted-foreground">{activeConversation?.type === "group" ? `${details.length} members` : otherMember?.phoneNumber ?? phoneNumber}</p></div>
            <span className="hidden text-xs text-muted-foreground sm:block">{name ? `Signed in as ${name}` : phoneNumber}</span>
          </header>
          {readError && <p role="status" className="px-5 py-2 text-xs text-destructive">Read status could not be updated. Reopen this conversation to retry.</p>}
          {messages !== undefined ? <MessageList messages={messages} currentUserId={userId} senderNames={senderNames} /> : <div className="min-h-0 flex-1" />}
          {messages !== undefined && <MessageComposer conversationId={activeId} onSend={handleSend} sending={isSending} blockedMessage={blockedMessage} typingLabel={typingLabel} />}
        </> : <>
          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-border/70 bg-white px-5 sm:px-7"><div><p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">PhoneMail</p><h1 className="text-xl font-semibold tracking-tight">Your inbox</h1></div><Button onClick={() => setGroupComposeOpen(true)} variant="outline" className="rounded-xl">Start a group</Button></header>
          <div className="flex flex-1 items-center justify-center px-6 text-center"><div><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-accent text-2xl text-primary">✉</div><h2 className="text-lg font-semibold">Your PhoneMail inbox</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Search for someone by name or phone number to start a conversation, or create a group.</p></div></div>
        </>}
      </section>
      {activeId && activeConversation && <ConversationDetails title={activeTitle} members={details} currentUserId={userId} conversationType={activeConversation.type} />}
      {isSigningOut && <span className="sr-only">Signing out</span>}
    </div>
    {signOutError && <p role="alert" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-lg">We couldn’t sign you out. Please try again.</p>}
    <GroupCompose open={groupComposeOpen} onOpenChange={setGroupComposeOpen} onCreated={(id) => { setSelectedId(id); setMobileConversation(true); }} />
  </main>;
}
