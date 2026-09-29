"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { Button } from "@phonemail/ui/components/button";
import { Skeleton } from "@phonemail/ui/components/skeleton";
import { signOut } from "../../auth/api/auth";
import { authClient } from "../../../lib/auth-client";
import { ConversationDetails } from "./conversation-details";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageComposer } from "./message-composer";
import { MessageList } from "./message-list";
import { useBlockUser, useConversationMembers, useConversations, useMarkConversationRead, useMessages, useUnreadState } from "../api/conversations";

type Props = { name?: string; phoneNumber: string; userId: string };

export function ConversationHome({ name, phoneNumber, userId }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const conversations = useConversations();
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const activeId = selectedId ?? conversations?.[0]?.conversation._id ?? null;
  const members = useConversationMembers(activeId);
  const messages = useMessages(activeId);
  const unread = useUnreadState(activeId);
  const markRead = useMarkConversationRead();
  const sendMessage = useMutation(api.message.sendMessage);
  const replyToMessage = useMutation(api.message.replyToMessage);
  const blockUser = useBlockUser();
  const currentUser = useQuery(api.user.getCurrentUser, {});

  // useEffect(() => {
  //   if (!isPending && !session) router.replace("/?session=expired");
  // }, [isPending, router, session]);
  // useEffect(() => {
  //   if (activeId && unread && unread.unreadCount > 0) void markRead({ conversationId: activeId });
  // }, [activeId, markRead, unread]);

  const details = useMemo(() => {
    if (!members) return [];
    return members.flatMap(({ user }) => user ? [{ user }] : []);
  }, [members]);

  const senderNames = useMemo(() => new Map(details.map(({ user }) => [user._id, user.name ?? user.phoneNumber])), [details]);
  const entries = useMemo(() => (conversations ?? []).map(({ conversation, lastMessage, unreadCount, participants }) => {
  const others = participants.filter((user) => user._id !== userId);
  const otherName = conversation.type === "group"
      ? conversation.title ?? `${Math.max(participants.length - 1, 0)} people`
      : others[0]?.name ?? others[0]?.phoneNumber ?? "Conversation";
    return { conversation, otherName, preview: lastMessage?.body ?? "", unread: unreadCount, participants };
  }).sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt), [conversations, userId]);
  
  const activeConversation = conversations?.find(({ conversation }) => conversation._id === activeId)?.conversation;
  const activeTitle = activeConversation?.type === "group" ? activeConversation.title ?? "Group conversation" : details.find(({ user }) => user._id !== userId)?.user.name ?? details.find(({ user }) => user._id !== userId)?.user.phoneNumber ?? "Conversation";

  async function handleSend(body: string, parentMessageId?: string) {
    if (!activeId) return;
    setIsSending(true);
    try {
      if (parentMessageId) await replyToMessage({ conversationId: activeId, parentMessageId: parentMessageId as Id<"messages">, body });
      else await sendMessage({ conversationId: activeId, body });
    } finally { setIsSending(false); }
  }
  async function handleSignOut() {
    setIsSigningOut(true);
    try { await signOut(); router.replace("/"); router.refresh(); }
    catch { setIsSigningOut(false); }
  }
  async function handleBlock(targetId: string) {
    if (!window.confirm("Block this person? You will no longer be able to send messages to each other.")) return;
    await blockUser({ userId: targetId as Id<"users"> });
  }

  if (isPending || !session || conversations === undefined || !currentUser) return <div className="flex h-screen items-center justify-center p-6"><Skeleton className="h-[70vh] w-full max-w-6xl rounded-3xl" /></div>;
  return <main className="h-[100dvh] overflow-hidden p-0 sm:p-4 lg:p-6"><div className="mx-auto flex h-full max-w-[1680px] overflow-hidden bg-white shadow-xl shadow-[#174846]/5 sm:rounded-3xl sm:border sm:border-white/80">
    <div className={`${mobileConversation ? "hidden" : "flex"} w-full md:flex`}><ConversationSidebar entries={entries} selectedId={activeId} currentUserId={userId} onSelect={(id) => { setSelectedId(id as Id<"conversations">); setMobileConversation(true); }} onSignOut={() => void handleSignOut()} profileName={currentUser.name ?? name} profilePhone={currentUser.phoneNumber ?? phoneNumber} profileImage={currentUser.profileImage} /></div>
    <section className={`${mobileConversation ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-[#f9fcfb]`}>
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border/70 bg-white px-4 sm:px-7"><Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileConversation(false)}>← Inbox</Button><div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-primary">{activeTitle.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{activeTitle}</h1><p className="truncate text-xs text-muted-foreground">{activeConversation?.type === "group" ? `${details.length} members` : details.find(({ user }) => user._id !== userId)?.user.phoneNumber ?? phoneNumber}</p></div><span className="hidden text-xs text-muted-foreground sm:block">{name ? `Signed in as ${name}` : phoneNumber}</span></header>
      {activeId && messages !== undefined ? <MessageList messages={messages} currentUserId={userId} senderNames={senderNames} /> : <div className="flex flex-1 items-center justify-center px-6 text-center"><div><div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-accent text-2xl text-primary">✉</div><h2 className="text-lg font-semibold">Your PhoneMail inbox</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Conversations with people you connect with will appear here.</p></div></div>}
      {activeId && messages !== undefined && <MessageComposer onSend={handleSend} sending={isSending} />}
    </section>
    {activeId && activeConversation && <ConversationDetails title={activeTitle} members={details} currentUserId={userId} onBlock={(id) => void handleBlock(id)} />}
    {isSigningOut && <span className="sr-only">Signing out</span>}
  </div></main>;
}
