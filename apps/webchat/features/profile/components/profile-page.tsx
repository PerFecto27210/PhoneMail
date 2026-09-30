"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@phonemail/ui/components/skeleton";
import { signOut } from "../../auth/api/auth";
import { authClient } from "../../../lib/auth-client";
import { useCurrentProfile } from "../api/profile";
import { ProfileForm } from "./profile-form";

export function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const profile = useCurrentProfile(Boolean(session));
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  useEffect(() => { if (!isPending && !session) router.replace("/"); }, [isPending, router, session]);
  async function handleSignOut() {
    setSigningOut(true); setSignOutError(null);
    try { await signOut(); router.replace("/"); router.refresh(); }
    catch { setSignOutError("We couldn't sign you out. Please try again."); setSigningOut(false); }
  }
  if (isPending || !session || profile === undefined) return <Skeleton className="h-[620px] w-full max-w-xl rounded-3xl" />;
  return <div className="w-full">{profile ? <ProfileForm key={profile._id} profile={profile} onSignOut={() => void handleSignOut()} signingOut={signingOut} /> : <p role="alert" className="text-sm text-destructive">We couldn&apos;t load your profile.</p>}{signOutError && <p role="alert" className="mx-auto mt-4 max-w-xl text-sm text-destructive">We couldn&apos;t sign you out. Please try again.</p>}</div>;
}
