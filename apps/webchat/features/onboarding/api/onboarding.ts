"use client";

import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";

export function useOnboardingState() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.user.getOnboardingState, isAuthenticated ? {} : "skip");
}

export function useAcceptTerms() {
  return useMutation(api.user.acceptTerms);
}

export function useCompleteOnboarding() {
  return useMutation(api.user.completeOnboarding);
}
export function useGenerateAvatarUploadUrl() { return useMutation(api.user.generateAvatarUploadUrl); }
