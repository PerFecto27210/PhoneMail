"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@phonemail/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { useCompleteOnboarding, useGenerateAvatarUploadUrl, useOnboardingState } from "../api/onboarding";
import { OnboardingProgress } from "./progress";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export function AvatarStep() {
  const router = useRouter(); const state = useOnboardingState();
  const complete = useCompleteOnboarding(); const createUploadUrl = useGenerateAvatarUploadUrl();
  const input = useRef<HTMLInputElement>(null); const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (state?.onboardingComplete) router.replace("/conversation"); else if (state && !state.termsAccepted) router.replace("/onboarding/terms"); }, [router, state]);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  function selectFile(next: File | undefined) {
    setError(null); if (!next) { setFile(null); return; }
    if (!next.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (next.size > MAX_AVATAR_BYTES) { setError("Choose an image smaller than 5 MB."); return; }
    setFile(next);
  }
  async function finish() {
    setBusy(true); setError(null);
    try {
      let storageId;
      if (file) {
        const uploadUrl = await createUploadUrl();
        const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        if (!response.ok) throw new Error("upload_failed");
        ({ storageId } = await response.json());
      }
      await complete({ ...(storageId ? { storageId } : {}) }); router.replace("/conversation"); router.refresh();
    } catch { setError("We couldn't save your profile image. Please try again."); setBusy(false); }
  }
  return <div className="w-full max-w-xl space-y-8"><OnboardingProgress step={2} /><Card className="rounded-3xl border-white/80 bg-white shadow-xl shadow-[#174846]/5"><CardHeader className="items-center space-y-3 p-7 text-center sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Make it yours</p><CardTitle className="text-3xl">Set up your profile</CardTitle><CardDescription className="max-w-sm text-base">Add a photo so people recognize you in their inbox.</CardDescription></CardHeader><CardContent className="space-y-6 px-7 pb-8 sm:px-10 sm:pb-10"><Avatar className="mx-auto size-28 border-4 border-white shadow-md"><AvatarImage src={preview} /><AvatarFallback className="bg-accent text-3xl text-primary">P</AvatarFallback></Avatar><input ref={input} type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} /><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>{file ? "Change image" : "Upload image"}</Button>{file && <Button variant="ghost" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} disabled={busy}>Remove</Button>}</div>{error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}<Button className="h-12 w-full rounded-xl text-base" disabled={busy || !state?.termsAccepted} onClick={() => void finish()}>{busy ? "Saving profile…" : "Continue"}</Button><p className="text-center text-xs text-muted-foreground">You can change your photo later in Profile.</p></CardContent></Card></div>;
}
