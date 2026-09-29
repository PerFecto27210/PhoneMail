"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@phonemail/ui/components/card";
import { Input } from "@phonemail/ui/components/input";
import { Label } from "@phonemail/ui/components/label";
import { useUpdateProfile } from "../api/profile";
import { useGenerateAvatarUploadUrl } from "../../conversation/api/conversations";

type Profile = { _id: string; name?: string; phoneNumber: string; avatarUrl?: string };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export function ProfileForm({ profile, onSignOut, signingOut }: { profile: Profile; onSignOut: () => void; signingOut: boolean }) {
  const updateProfile = useUpdateProfile(); const createUploadUrl = useGenerateAvatarUploadUrl();
  const input = useRef<HTMLInputElement>(null); const [name, setName] = useState(profile.name ?? "");
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  async function save() {
    setSaving(true); setFeedback(null);
    try {
      let storageId;
      if (file) { const url = await createUploadUrl(); const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file }); if (!response.ok) throw new Error("upload_failed"); ({ storageId } = await response.json()); }
      await updateProfile({ name, ...(storageId ? { storageId } : {}) }); setFile(null);
      setFeedback({ kind: "success", text: "Your profile has been saved." });
    } catch (error) { setFeedback({ kind: "error", text: error instanceof Error && error.message.includes("Name must") ? "Name must be between 2 and 40 characters." : "We couldn't save your profile. Please try again." }); }
    finally { setSaving(false); }
  }
  function selectFile(next?: File) {
    if (!next) return; setFeedback(null);
    if (!next.type.startsWith("image/")) { setFeedback({ kind: "error", text: "Choose an image file." }); return; }
    if (next.size > MAX_AVATAR_BYTES) { setFeedback({ kind: "error", text: "Choose an image smaller than 5 MB." }); return; }
    setFile(next);
  }
  const initials = (name || profile.phoneNumber).slice(0, 1).toUpperCase();
  return <Card className="w-full max-w-xl rounded-3xl border-white/80 bg-white shadow-xl shadow-[#174846]/5"><CardHeader className="space-y-2 p-7 sm:p-9"><Link href="/conversation" className="mb-2 inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline">← Back to Mail</Link><p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">Your account</p><CardTitle className="text-3xl">Profile</CardTitle><CardDescription>Personalize how people see you in PhoneMail.</CardDescription></CardHeader><CardContent className="space-y-7 px-7 pb-8 sm:px-9 sm:pb-9"><div className="flex flex-col items-center gap-3"><Avatar className="size-24 border-4 border-white shadow-md"><AvatarImage src={preview || profile.avatarUrl} /><AvatarFallback className="bg-accent text-3xl text-primary">{initials}</AvatarFallback></Avatar><input ref={input} type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} /><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>{file ? "Change image" : "Change avatar"}</Button>{file && <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}>Remove</Button>}</div></div><div className="space-y-2"><Label htmlFor="profile-name">Display name</Label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} minLength={2} autoComplete="name" placeholder="Your name" /></div><div className="space-y-2"><Label htmlFor="profile-phone">Phone number</Label><Input id="profile-phone" value={profile.phoneNumber} readOnly aria-readonly="true" className="bg-muted/60" /><p className="text-xs text-muted-foreground">Your verified phone number is your PhoneMail identity.</p></div>{feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-primary"}`}>{feedback.text}</p>}<div className="space-y-3"><Button className="h-11 w-full rounded-xl" onClick={() => void save()} disabled={name.trim().length < 2 || name.trim().length > 40 || saving}>{saving ? "Saving changes…" : "Save changes"}</Button><Button variant="outline" className="h-11 w-full rounded-xl" onClick={onSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</Button></div><p className="text-center text-xs text-muted-foreground">PhoneMail uses phone verification. No password is needed.</p></CardContent></Card>;
}
