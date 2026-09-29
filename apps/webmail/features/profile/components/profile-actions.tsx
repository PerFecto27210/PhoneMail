import { Button } from "@phonemail/ui/components/button";

export function ProfileActions({ onSave, onSignOut, saving, signingOut, disabled }: {
  onSave: () => void; onSignOut: () => void; saving: boolean; signingOut: boolean; disabled: boolean;
}) {
  return <div className="space-y-3"><Button className="h-11 w-full rounded-xl" onClick={onSave} disabled={disabled || saving}>{saving ? "Saving changes…" : "Save changes"}</Button><Button variant="outline" className="h-11 w-full rounded-xl" onClick={onSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</Button></div>;
}
