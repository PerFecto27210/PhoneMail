"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@phonemail/ui/components/avatar";
import { Separator } from "@phonemail/ui/components/separator";
import { UsersRoundIcon } from "@phonemail/ui/components/icons";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { ConversationMemberActions } from "./conversation-member-actions";

type Member = {
  user: {
    _id: Id<"users">;
    phoneNumber: string;
    name?: string;
    avatarUrl?: string;
  } | null;
};

export function ConversationDetails({
  title,
  members,
  currentUserId,
  conversationType,
  embedded = false,
}: {
  title: string;
  members: Member[];
  currentUserId: string;
  conversationType: "direct" | "group";
  embedded?: boolean;
}) {
  return (
    <aside className={embedded ? "block w-full bg-card p-1" : "hidden w-[280px] shrink-0 border-l border-border/70 bg-card p-6 xl:block"}>
      <div className="py-5 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-accent text-2xl font-semibold text-primary">
          {conversationType === "group" ? <UsersRoundIcon className="size-9" /> : title.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{members.filter(({ user }) => user).length} participants</p>
      </div>
      <Separator className="my-5" />
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participants</h3>
      <div className="space-y-4">
        {members.map(({ user }) => user && (
          <div key={user._id} className="flex min-w-0 items-center gap-2">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-secondary text-sm font-medium">
                {(user.name ?? user.phoneNumber).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name ?? "PhoneMail member"}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.phoneNumber}</span>
            </span>
            {user._id !== currentUserId && (
              <ConversationMemberActions
                userId={user._id}
                label={user.name ?? user.phoneNumber}
                direct={conversationType === "direct"}
              />
            )}
          </div>
        ))}
      </div>
      {conversationType === "group" && <p className="mt-6 text-xs text-muted-foreground">Group membership is read-only. Anyone in this conversation can send messages.</p>}
      <p className="mt-8 text-xs leading-5 text-muted-foreground">
        Blocking stops direct messages between two people. Shared group conversations stay available.
      </p>
    </aside>
  );
}
