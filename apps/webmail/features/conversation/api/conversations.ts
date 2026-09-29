"use client";

import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";

export function useConversations() { return useQuery(api.conversation.listMyConversations, {}); }
export function useConversationMembers(conversationId: Id<"conversations"> | null) {
  return useQuery(api.conversation.getConversationMembers, conversationId ? { conversationId } : "skip");
}
export function useMessages(conversationId: Id<"conversations"> | null) {
  return useQuery(api.message.listMessages, conversationId ? { conversationId } : "skip");
}
export function useUnreadState(conversationId: Id<"conversations"> | null) {
  return useQuery(api.readState.getConversationUnreadState, conversationId ? { conversationId } : "skip");
}
export function useSendMessage() { return useMutation(api.message.sendMessage); }
export function useMarkConversationRead() { return useMutation(api.readState.markConversationRead); }
export function useBlockUser() { return useMutation(api.blocking.blockUser); }
export function useGenerateAvatarUploadUrl() { return useMutation(api.user.generateAvatarUploadUrl); }
