"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@phonemail/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { useCompleteOnboarding, useOnboardingState } from "../api/onboarding";
import { AVATAR_OPTIONS } from "../../profile/lib/avatars";
import { AvatarPicker } from "../../profile/components/avatar-picker";
import { OnboardingProgress } from "./progress";

export function AvatarStep() {
  const router = useRouter();
  const state = useOnboardingState();
  const complete = useCompleteOnboarding();
  const [selected, setSelected] = useState<string>(AVATAR_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (state?.onboardingComplete) router.replace("/conversation");
    else if (state && !state.termsAccepted) router.replace("/onboarding/terms");
  }, [router, state]);
  async function finish() {
    setBusy(true); setError(null);
    try { await complete({ profileImage: selected }); router.replace("/conversation"); router.refresh(); }
    catch { setError("We couldn't save your profile. Please try again."); setBusy(false); }
  }

  
  return <div className="w-full max-w-xl space-y-8"><OnboardingProgress step={2} /><Card className="rounded-3xl border-white/80 bg-white shadow-xl shadow-[#174846]/5"><CardHeader className="items-center space-y-3 p-7 text-center sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Make it yours</p><CardTitle className="text-3xl">Set up your profile</CardTitle><CardDescription className="max-w-sm text-base">Choose an avatar to help friends recognize you in conversations.</CardDescription></CardHeader><CardContent className="space-y-7 px-7 pb-8 sm:px-10 sm:pb-10"><AvatarPicker value={selected} onChange={setSelected} /><p className="text-center text-sm text-muted-foreground">Pick a color that feels like you.</p>{error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}<div className="space-y-3"><Button className="h-12 w-full rounded-xl text-base" disabled={busy || !state?.termsAccepted} onClick={() => void finish()}>{busy ? "Saving profile…" : "Continue"}</Button><Button variant="ghost" className="w-full" disabled={busy} onClick={() => void finish()}>Skip for now</Button></div></CardContent></Card></div>;
}
