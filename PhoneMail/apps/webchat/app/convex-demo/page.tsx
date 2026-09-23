"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../../../db/convex/_generated/api";

export default function ConvexDemoPage() {
  const users = useQuery(api.user.getUsers);
  const createTestUser = useMutation(api.user.createTestUser);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createTestUser({
        phoneNumber: phoneNumber.trim(),
        emailAddress: emailAddress.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      setPhoneNumber("");
      setEmailAddress("");
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="convex-demo-page">
      <div className="convex-demo-content">
        <Link className="convex-demo-back" href="/">← Back to PhoneMail</Link>
        <header className="convex-demo-heading">
          <p className="eyebrow">CONVEX CONNECTION</p>
          <h1>Users test</h1>
          <p>Test reading and creating users in the Convex database.</p>
        </header>

        <section className="convex-demo-card">
          <h2>Create a test user</h2>
          <form className="convex-demo-form" onSubmit={handleSubmit}>
            <label>
              Phone number
              <input required value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="9876543210" />
            </label>
            <label>
              Email address
              <input required type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              Name <span>(optional)</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
            <button className="auth-primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Create user"}</button>
            {error && <p className="convex-demo-error" role="alert">{error}</p>}
          </form>
        </section>

        <section className="convex-demo-card">
          <div className="convex-demo-list-heading">
            <h2>Users</h2>
            <span>{users ? users.length : "…"}</span>
          </div>
          {users === undefined ? <p className="convex-demo-muted">Loading users…</p> : users.length === 0 ? <p className="convex-demo-muted">No users yet. Create one above.</p> : (
            <ul className="convex-demo-users">
              {users.map((user) => <li key={user._id}>
                <strong>{user.name || "Unnamed user"}</strong>
                <span>{user.phoneNumber}</span>
                <span>{user.emailAddress}</span>
              </li>)}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
