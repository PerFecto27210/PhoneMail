"use client";

import { Avatar, AvatarFallback } from "@phonemail/ui/components/avatar";
import { AVATAR_OPTIONS, avatarColor } from "../lib/avatars";

export function AvatarPicker({ value, onChange, initials = "P" }: { value: string; onChange: (value: string) => void; initials?: string }) {
  return <div className="space-y-5">
    <Avatar className="mx-auto size-24 border-4 border-background shadow-md"><AvatarFallback style={{ backgroundColor: avatarColor(value) }} className="text-3xl font-semibold text-foreground">{initials.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
    <div role="radiogroup" aria-label="Choose an avatar" className="mx-auto grid max-w-xs grid-cols-4 gap-4">
      {AVATAR_OPTIONS.map((avatar, index) => <button key={avatar.value} type="button" role="radio" aria-checked={value === avatar.value} aria-label={`${avatar.label} avatar`} title={avatar.label} onClick={() => onChange(avatar.value)} className={`grid size-12 place-items-center rounded-full transition sm:size-14 ${value === avatar.value ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : "hover:scale-105"}`} style={{ backgroundColor: avatar.color }}><span className="text-base font-semibold text-foreground">{String.fromCharCode(65 + index)}</span></button>)}
    </div>
  </div>;
}
