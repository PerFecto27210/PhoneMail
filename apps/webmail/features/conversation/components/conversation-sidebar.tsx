"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Button } from "@phonemail/ui/components/button";
import { FileTextIcon, InboxIcon, LogOutIcon, MailIcon, PaperclipIcon, PlusIcon, SettingsIcon, StarIcon } from "@phonemail/ui/components/icons";

export type MailFolder = "all" | "unread" | "favorites" | "attachments" | "drafts";
const folders: Array<{ id: MailFolder; label: string; icon: ReactNode }> = [
  { id: "all", label: "All Mail", icon: <InboxIcon className="size-5" /> },
  { id: "unread", label: "Unread", icon: <MailIcon className="size-5" /> },
  { id: "favorites", label: "Favorites", icon: <StarIcon className="size-5" /> },
  { id: "attachments", label: "Attachments", icon: <PaperclipIcon className="size-5" /> },
  { id: "drafts", label: "Drafts", icon: <FileTextIcon className="size-5" /> },
];

export function ConversationSidebar({ folder, onFolderChange, onCompose, onClose, unreadCount, profileName, profilePhone, avatarUrl, onSignOut, signingOut }: {
  folder: MailFolder; onFolderChange: (folder: MailFolder) => void; onCompose: () => void; onClose?: () => void;
  unreadCount: number; profileName?: string; profilePhone: string; avatarUrl?: string; onSignOut: () => void; signingOut: boolean;
}) {
  return <aside className="relative z-10 flex h-full w-[min(86vw,280px)] shrink-0 flex-col border-r border-border/70 bg-background md:w-[72px] md:pt-3 lg:w-[256px]">
    <div className="hidden h-14 items-center gap-3 px-5 lg:flex"><span className="grid size-9 place-items-center rounded-full bg-primary font-bold text-primary-foreground">p</span><span className="text-lg font-bold tracking-tight">PhoneMail</span></div>
    <div className="px-4 pb-5 pt-3 md:px-2 md:pt-2 lg:px-4"><Button aria-label="Compose Mail" title="Compose Mail" onClick={() => { onCompose(); onClose?.(); }} className="h-12 w-full justify-start gap-3 rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 md:justify-center md:px-0 lg:justify-start lg:px-5"><PlusIcon aria-hidden="true" className="size-5" /><span className="md:hidden lg:inline">Compose Mail</span></Button></div>
    <nav aria-label="Mail folders" className="space-y-1 px-3 md:px-2 lg:px-3">{folders.map((item) => <button key={item.id} type="button" title={item.label} onClick={() => { onFolderChange(item.id); onClose?.(); }} aria-current={folder === item.id ? "page" : undefined} className={`flex h-11 w-full items-center gap-4 rounded-full px-4 text-left text-sm transition md:justify-center md:px-0 lg:justify-start lg:px-4 ${folder === item.id ? "bg-accent font-semibold text-accent-foreground" : "text-foreground/80 hover:bg-muted/80"}`}><span aria-hidden="true" className="grid w-5 place-items-center">{item.icon}</span><span className="flex-1 md:hidden lg:inline">{item.label}</span>{item.id === "unread" && unreadCount > 0 && <span className="text-xs font-semibold md:hidden lg:inline">{unreadCount}</span>}</button>)}</nav>
    <div className="mt-auto border-t border-border/70 p-3 md:px-2 lg:px-3"><Link onClick={onClose} href="/profile" title="Profile and settings" className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-muted/70 md:justify-center md:px-0 lg:justify-start lg:px-2"><Avatar className="size-10"><AvatarImage src={avatarUrl} /><AvatarFallback className="bg-accent font-semibold text-primary">{(profileName || profilePhone).slice(0, 1).toUpperCase()}</AvatarFallback></Avatar><span className="min-w-0 flex-1 md:hidden lg:block"><span className="block truncate text-sm font-semibold">{profileName || "Your profile"}</span><span className="block truncate text-xs text-muted-foreground">{profilePhone}</span></span><SettingsIcon aria-hidden="true" className="hidden size-5 text-muted-foreground md:hidden lg:block" /></Link><Button aria-label="Sign out" title="Sign out" variant="ghost" className="mt-1 w-full justify-start rounded-xl px-3 text-sm text-muted-foreground md:justify-center md:px-0 lg:justify-start lg:px-3" onClick={onSignOut} disabled={signingOut}>{signingOut ? <span className="md:hidden lg:inline">Signing out…</span> : <><LogOutIcon aria-hidden="true" className="size-5" /><span className="md:hidden lg:inline">Sign out</span></>}</Button></div>
  </aside>;
}

export function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(timestamp);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}
