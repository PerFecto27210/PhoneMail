"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { MailIcon } from "../icons";

type ComposeDialogProps = { onClose: () => void; onCreate: (recipient: string) => Promise<void> };

export function ComposeDialog({ onClose, onCreate }: ComposeDialogProps) {
  const [recipient, setRecipient] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreate(recipient);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start this conversation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <span className="modal-icon"><MailIcon /></span>
        <h2 id="compose-title">New message</h2>
        <p>Start a conversation with a PhoneMail user.</p>
        <form onSubmit={submit}>
          <input autoFocus required inputMode="tel" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Recipient phone number" aria-label="Recipient phone number" />
          {error && <p className="convex-demo-error" role="alert">{error}</p>}
          <button className="modal-primary" type="submit" disabled={saving}>{saving ? "Starting…" : "Continue"}</button>
        </form>
      </section>
    </div>
  );
}
