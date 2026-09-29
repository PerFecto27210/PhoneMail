"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@phonemail/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { Checkbox } from "@phonemail/ui/components/checkbox";
import { Separator } from "@phonemail/ui/components/separator";
import { useAcceptTerms, useOnboardingState } from "../api/onboarding";
import { OnboardingProgress } from "./progress";

export function TermsStep() {
  const router = useRouter();
  const state = useOnboardingState();
  const acceptTerms = useAcceptTerms();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (state?.onboardingComplete) router.replace("/conversation");
    else if (state?.termsAccepted) router.replace("/onboarding/avatar");
  }, [router, state]);

  async function continueFlow() {
    setBusy(true); setError(null);
    try { await acceptTerms(); router.push("/onboarding/avatar"); }
    catch { setError("We couldn't save your agreement. Please try again."); setBusy(false); }
  }

  return <div className="w-full max-w-2xl space-y-8"><OnboardingProgress step={1} /><Card className="rounded-3xl border-white/80 bg-white shadow-xl shadow-[#174846]/5"><CardHeader className="space-y-3 p-7 sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">One quick step</p><CardTitle className="text-3xl">Welcome to PhoneMail</CardTitle><CardDescription className="text-base">Your phone number is your email identity. Let’s make sure we’re on the same page.</CardDescription></CardHeader><CardContent className="space-y-6 px-7 pb-8 sm:px-10 sm:pb-10"><section className="space-y-4 rounded-2xl bg-muted/70 p-5 text-sm leading-6"><div><h2 className="font-semibold">Terms of Service</h2><p className="mt-1 text-muted-foreground">Use PhoneMail respectfully and keep your account details secure. Messages are associated with your verified phone identity.</p></div><Separator /><div><h2 className="font-semibold">Privacy Policy</h2><p className="mt-1 text-muted-foreground">We use your phone number to identify your account and deliver your conversations. You control who you communicate with.</p></div></section><label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><Checkbox checked={agreed} onCheckedChange={(value) => setAgreed(value === true)} /><span>I agree to the PhoneMail Terms of Service and Privacy Policy.</span></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="h-12 w-full rounded-xl text-base" disabled={!agreed || busy || !state} onClick={() => void continueFlow()}>{busy ? "Saving…" : "Continue"}</Button></CardContent></Card></div>;
}
