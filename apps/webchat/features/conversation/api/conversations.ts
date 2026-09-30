"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { api } from "../../../../../db/convex/_generated/api";

export function useConversations() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.conversation.listMyConversations, isAuthenticated ? {} : "skip");
}
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
export function useUnblockUser() { return useMutation(api.blocking.unblockUser); }
export function useBlockStatus(userId: Id<"users"> | null) {
  return useQuery(api.blocking.getBlockStatus, userId ? { userId } : "skip");
}
export function useToggleFavorite() { return useMutation(api.conversation.toggleFavorite); }
export function useTypingUsers(conversationId: Id<"conversations"> | null) {
  return useQuery(api.typing.getTypingUsers, conversationId ? { conversationId } : "skip");
}

export function useConversationTyping(conversationId: Id<"conversations"> | null) {
  const startTyping = useMutation(api.typing.startTyping);
  const stopTyping = useMutation(api.typing.stopTyping);
  const activeRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState(false);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!activeRef.current || !conversationId) return;
    activeRef.current = false;
    void stopTyping({ conversationId }).catch(() => setError(true));
  }, [conversationId, stopTyping]);

  const reportTyping = useCallback(() => {
    if (!conversationId) return;
    setError(false);
    const now = Date.now();
    if (!activeRef.current || now - lastRefreshRef.current >= 1_800) {
      activeRef.current = true;
      lastRefreshRef.current = now;
      void startTyping({ conversationId }).catch(() => {
        activeRef.current = false;
        setError(true);
      });
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(stop, 1_300);
  }, [conversationId, startTyping, stop]);

  useEffect(() => () => stop(), [stop]);

  return { reportTyping, stopTyping: stop, typingError: error };
}
