"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";

export function useOnboardingState() {
  return useQuery(api.user.getOnboardingState, {});
}

export function useAcceptTerms() {
  return useMutation(api.user.acceptTerms);
}

export function useCompleteOnboarding() {
  return useMutation(api.user.completeOnboarding);
}
