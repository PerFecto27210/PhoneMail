"use client";

import { useState } from "react";
import type { Id } from "../../../../../db/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../db/convex/_generated/api";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@phonemail/ui/components/alert-dialog";
import { Button } from "@phonemail/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@phonemail/ui/components/dropdown-menu";

export function ConversationMemberActions({
  userId,
  label,
  direct,
}: {
  userId: Id<"users">;
  label: string;
  direct: boolean;
}) {
  const status = useQuery(api.blocking.getBlockStatus, { userId });
  const blockUser = useMutation(api.blocking.blockUser);
  const unblockUser = useMutation(api.blocking.unblockUser);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unblock() {
    setPending(true);
    setError(null);
    try {
      await unblockUser({ userId });
    } catch {
      setError("We couldn’t unblock this person. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function block() {
    setPending(true);
    setError(null);
    try {
      await blockUser({ userId });
      setConfirmOpen(false);
    } catch {
      setError("We couldn’t block this person. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label={`Actions for ${label}`}>
            <span aria-hidden="true" className="text-lg leading-none">⋮</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {status?.isBlockedByMe ? (
            <DropdownMenuItem disabled={pending} onSelect={() => void unblock()}>
              Unblock user
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" disabled={pending} onSelect={() => setConfirmOpen(true)}>
              Block user
            </DropdownMenuItem>
          )}
          {status?.isBlockedByThem && !status.isBlockedByMe && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">This person has blocked you.</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p role="alert" className="mt-1 max-w-44 text-xs text-destructive">{error}</p>}
      {direct && status && !status.canMessage && (
        <p className="sr-only" role="status">
          {status.isBlockedByMe ? "You blocked this person." : "This person blocked you."}
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {direct
                ? "Blocked users can’t send direct messages to each other. Shared group conversations remain available."
                : "This only blocks direct messages. Shared group conversations remain available."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); void block(); }}>
              {pending ? "Blocking…" : "Block user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
