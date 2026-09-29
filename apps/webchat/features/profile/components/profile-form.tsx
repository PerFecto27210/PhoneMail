"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { Input } from "@phonemail/ui/components/input";
import { Label } from "@phonemail/ui/components/label";
import { useUpdateProfile } from "../api/profile";
import { AvatarPicker } from "./avatar-picker";
import { ProfileActions } from "./profile-actions";

type Profile = { _id: string; name?: string; phoneNumber: string; profileImage?: string };

export function ProfileForm({ profile, onSignOut, signingOut }: { profile: Profile; onSignOut: () => void; signingOut: boolean }) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(profile.name ?? "");
  const [avatar, setAvatar] = useState(profile.profileImage ?? "avatar-1");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true); setFeedback(null);
    try {
      await updateProfile({ name, profileImage: avatar });
      setFeedback({ kind: "success", text: "Your profile has been saved." });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error && error.message.includes("Name must") ? "Name must be between 2 and 40 characters." : "We couldn't save your profile. Please try again." });
    } finally { setSaving(false); }
  }

  return <Card className="w-full max-w-xl rounded-3xl border-white/80 bg-white shadow-xl shadow-[#174846]/5"><CardHeader className="space-y-2 p-7 sm:p-9"><p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Your account</p><CardTitle className="text-3xl">Profile</CardTitle><CardDescription>Personalize how people see you in PhoneMail.</CardDescription></CardHeader><CardContent className="space-y-7 px-7 pb-8 sm:px-9 sm:pb-9"><AvatarPicker value={avatar} onChange={setAvatar} initials={name || profile.phoneNumber} /><div className="space-y-2"><Label htmlFor="profile-name">Display name</Label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} minLength={2} autoComplete="name" placeholder="Your name" /></div><div className="space-y-2"><Label htmlFor="profile-phone">Phone number</Label><Input id="profile-phone" value={profile.phoneNumber} readOnly aria-readonly="true" className="bg-muted/60" /><p className="text-xs text-muted-foreground">Your verified phone number is your PhoneMail identity.</p></div>{feedback && <p role="status" className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-primary"}`}>{feedback.text}</p>}<ProfileActions onSave={() => void save()} onSignOut={onSignOut} saving={saving} signingOut={signingOut} disabled={name.trim().length < 2 || name.trim().length > 40} /><p className="text-center text-xs text-muted-foreground">PhoneMail uses phone verification. No password is needed.</p></CardContent></Card>;
}
