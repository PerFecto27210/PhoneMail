"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";

export function useCurrentProfile(enabled = true) {
  return useQuery(api.user.getCurrentUser, enabled ? {} : "skip");
}

export function useUpdateProfile() {
  return useMutation(api.user.updateUserProfile);
}

export function useGenerateAvatarUploadUrl() {
  return useMutation(api.user.generateAvatarUploadUrl);
}
