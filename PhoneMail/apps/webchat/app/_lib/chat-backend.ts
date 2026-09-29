"use client";

import { useAction, useMutation, useQuery, useConvex } from "convex/react";
import { api } from "../../../../db/convex/_generated/api";
import type { Id } from "../../../../db/convex/_generated/dataModel";
import type { MessageAttachment, Thread } from "../_types/chat";

const colors = ["peach", "mint", "lavender", "blue"] as const;

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function getContactColor(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function useChatBackend(phoneNumber: string | null) {
  const convex = useConvex();
  const user = useQuery(api.user.getUserByPhone, phoneNumber ? { phoneNumber } : "skip");
  const conversations = useQuery(api.conversation.listForUser, phoneNumber ? { phoneNumber } : "skip");
  const sendOtpMutation = useAction(api.twilio.sendOtp);
  const verifyPin = useMutation(api.otp.verifyPin);
  const createDirect = useMutation(api.conversation.createDirect);
  const sendMessageMutation = useMutation(api.message.sendMessage);
  const markReadMutation = useMutation(api.conversation.markRead);
  const clearMessagesMutation = useMutation(api.conversation.clearMessages);
  const setFavoriteMutation = useMutation(api.conversation.setFavorite);
  const setBlockedMutation = useMutation(api.conversation.setBlocked);
  const updateProfileMutation = useMutation(api.user.updateProfileByPhone);

  const threads: Thread[] = (conversations ?? []).map((conversation) => {
    const contactName = conversation.contact?.name || conversation.contact?.phoneNumber || conversation.title || "New conversation";
    const contactPhone = conversation.contact?.phoneNumber ?? "";
    const contactEmail = conversation.contact?.emailAddress ?? (contactPhone ? `${contactPhone}@phonemail.com` : "PhoneMail conversation");
    const messages = conversation.messages.map((message) => ({
      id: message._id,
      from: message.senderId === user?._id ? "me" as const : "them" as const,
      text: message.body,
      time: formatMessageTime(message._creationTime),
      attachments: message.attachments as MessageAttachment[] | undefined,
    }));
    const latestMessage = conversation.messages.at(-1);

    return {
      id: conversation._id,
      name: contactName,
      email: contactEmail,
      initials: getInitials(contactName),
      color: getContactColor(contactPhone || conversation._id),
      time: latestMessage ? formatMessageTime(latestMessage._creationTime) : "New",
      unread: conversation.unread || undefined,
      favorite: conversation.favorite,
      attachment: conversation.messages.some((message) => Boolean(message.attachments?.length)),
      blocked: conversation.blocked,
      messages,
    };
  });

  return {
    user,
    threads,
    loading: phoneNumber !== null && (user === undefined || conversations === undefined),
    sendPin: async (phone: string) => {
      const existingUser = await convex.query(api.user.getUserByPhone, { phoneNumber: phone });
      const localPhone = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
      const result = await sendOtpMutation({ phoneNumber: localPhone, toPhoneNumber: `+91${localPhone}` });
      return { exists: existingUser !== null, pin: result.demoPin ?? "" };
    },
    verifyPin: (phone: string, pin: string) => verifyPin({ phoneNumber: phone, pin }),
    createConversation: (phone: string, recipientPhone: string) => createDirect({ phoneNumber: phone, recipientPhone }),
    sendMessage: (phone: string, conversationId: string, body: string, attachments: MessageAttachment[]) => sendMessageMutation({
      phoneNumber: phone,
      conversationId: conversationId as Id<"conversations">,
      body,
      attachments,
    }),
    markRead: (phone: string, conversationId: string) => markReadMutation({ phoneNumber: phone, conversationId: conversationId as Id<"conversations"> }),
    clearMessages: (phone: string, conversationId: string) => clearMessagesMutation({ phoneNumber: phone, conversationId: conversationId as Id<"conversations"> }),
    setFavorite: (phone: string, conversationId: string, favorite: boolean) => setFavoriteMutation({ phoneNumber: phone, conversationId: conversationId as Id<"conversations">, favorite }),
    setBlocked: (phone: string, conversationId: string, blocked: boolean) => setBlockedMutation({ phoneNumber: phone, conversationId: conversationId as Id<"conversations">, blocked }),
    updateProfile: (phone: string, name: string, profileImage?: string) => updateProfileMutation({
      phoneNumber: phone,
      name,
      profileImage: profileImage ?? null,
    }),
  };
}
