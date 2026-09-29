"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";

export function useSearchUsers(searchText: string) {
  return useQuery(api.user.searchUsers, searchText.trim() ? { searchText: searchText.trim() } : "skip");
}

export function useGetOrCreateDirectConversation() {
  return useMutation(api.conversation.getOrCreateDirectConversation);
}
