"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { filters } from "./_data/filters";
import { SearchIcon, StarIcon } from "./_components/icons";
import type { Filter, MessageAttachment, Thread } from "./_types/chat";
import { ChatActionsMenu } from "./_components/chat/ChatActionsMenu";
import { ComposeDialog } from "./_components/compose/ComposeDialog";
import { ContactProfileDialog } from "./_components/profile/ContactProfileDialog";
import { SettingsDialog } from "./_components/settings/SettingsDialog";
import { InboxSidebar } from "./_components/inbox/InboxSidebar";
import { PhoneAuthScreen } from "./_components/auth/PhoneAuthScreen";
import { ChatComposer } from "./_components/chat/ChatComposer";
import { ChatMessages } from "./_components/chat/ChatMessages";
import { useChatBackend } from "./_lib/chat-backend";

const activeSessionKey = "phonemail.activeSession";
const activeSessionChangedEvent = "phonemail:active-session-changed";
const demoAccountsKey = "phonemail.demoAccounts";
const demoAccountsChangedEvent = "phonemail:demo-accounts-changed";

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function getActiveSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const phone = normalizeIndianPhone(window.localStorage.getItem(activeSessionKey) ?? "");
    return phone.length === 10 ? phone : null;
  } catch {
    return null;
  }
}

function subscribeToActiveSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(activeSessionChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(activeSessionChangedEvent, onChange);
  };
}

function saveActiveSession(phone: string) {
  try { window.localStorage.setItem(activeSessionKey, phone); } catch { /* Session remains active for this visit. */ }
  window.dispatchEvent(new Event(activeSessionChangedEvent));
}

function clearActiveSession() {
  try { window.localStorage.removeItem(activeSessionKey); } catch { /* The page still logs out for this visit. */ }
  window.dispatchEvent(new Event(activeSessionChangedEvent));
}

function getSavedPhones(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(demoAccountsKey) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function getSavedPhonesSnapshot() {
  try { return window.localStorage.getItem(demoAccountsKey) ?? "[]"; } catch { return "[]"; }
}

function subscribeToSavedPhones(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(demoAccountsChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(demoAccountsChangedEvent, onChange);
  };
}

function rememberPhone(phone: string) {
  try { window.localStorage.setItem(demoAccountsKey, JSON.stringify([...new Set([...getSavedPhones(), phone])])); } catch { /* Suggestions are optional. */ }
  window.dispatchEvent(new Event(demoAccountsChangedEvent));
}

const emptyThread: Thread = {
  id: "",
  name: "Your conversations",
  email: "Start a conversation with a PhoneMail user",
  initials: "PM",
  color: "mint",
  time: "",
  messages: [],
};

export default function Home() {
  const activeSessionPhone = useSyncExternalStore(subscribeToActiveSession, getActiveSession, () => null);
  const savedPhonesSnapshot = useSyncExternalStore(subscribeToSavedPhones, getSavedPhonesSnapshot, () => "[]");
  const savedPhoneNumbers = useMemo(() => {
    try {
      const saved: unknown = JSON.parse(savedPhonesSnapshot);
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string") : [];
    } catch { return []; }
  }, [savedPhonesSnapshot]);
  const backend = useChatBackend(activeSessionPhone);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [screen, setScreen] = useState<"login" | "otp">("login");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showSavedPhones, setShowSavedPhones] = useState(false);
  const [otp, setOtp] = useState("");
  const [demoPin, setDemoPin] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [chatActionsOpen, setChatActionsOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [profileName, setProfileName] = useState("PhoneMail user");
  const [profilePicture, setProfilePicture] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const storedTheme = document.documentElement.dataset.theme;
    if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
  }, []);

  useEffect(() => {
    if (activeSessionPhone) setPhoneNumber(activeSessionPhone);
  }, [activeSessionPhone]);

  useEffect(() => {
    if (!backend.user) return;
    setProfileName(backend.user.name || "PhoneMail user");
    setProfilePicture(backend.user.profileImage || "");
  }, [backend.user?.name, backend.user?.profileImage]);

  useEffect(() => {
    if (!activeId && backend.threads.length > 0) setActiveId(backend.threads[0].id);
    if (activeId && !backend.threads.some((thread) => thread.id === activeId)) setActiveId(backend.threads[0]?.id ?? "");
  }, [activeId, backend.threads]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try { window.localStorage.setItem("phonemail.theme", nextTheme); } catch { /* Theme still changes for this visit. */ }
  }

  function loadProfilePicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 320 / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setProfilePicture(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const activeThread = backend.threads.find((thread) => thread.id === activeId) ?? backend.threads[0] ?? emptyThread;
  const normalizedChatSearch = chatSearch.trim().toLowerCase();
  const displayedMessages = normalizedChatSearch
    ? activeThread.messages.filter((message) => `${message.text} ${message.attachments?.map((attachment) => attachment.name).join(" ") ?? ""}`.toLowerCase().includes(normalizedChatSearch))
    : activeThread.messages;
  const visibleThreads = useMemo(() => backend.threads.filter((thread) => {
    const matchesSearch = `${thread.name} ${thread.email} ${thread.messages.map((message) => message.text).join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" ||
      (filter === "Unread" && Boolean(thread.unread)) ||
      (filter === "Attachments" && Boolean(thread.attachment)) ||
      (filter === "Favorites" && Boolean(thread.favorite));
    return matchesSearch && matchesFilter;
  }).sort((first, second) => Number(Boolean(second.favorite)) - Number(Boolean(first.favorite))), [backend.threads, search, filter]);

  async function openThread(id: string) {
    setActiveId(id);
    setChatOpen(true);
    setChatActionsOpen(false);
    setChatSearchOpen(false);
    setChatSearch("");
    setActionError("");
    if (activeSessionPhone) {
      try { await backend.markRead(activeSessionPhone, id); }
      catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not mark messages as read."); }
    }
  }

  async function toggleFavorite(id: string) {
    if (!activeSessionPhone) return;
    const target = backend.threads.find((thread) => thread.id === id);
    if (!target) return;
    try { await backend.setFavorite(activeSessionPhone, id, !target.favorite); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not update this conversation."); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSessionPhone || !activeThread.id || activeThread.blocked) return;
    const text = draft.trim();
    if (uploadsInProgress > 0 || (!text && pendingAttachments.length === 0)) return;
    setActionError("");
    try {
      await backend.sendMessage(activeSessionPhone, activeThread.id, text, pendingAttachments);
      setDraft("");
      setPendingAttachments([]);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not send your message."); }
  }

  async function clearActiveChat() {
    if (!activeSessionPhone || !activeThread.id) return;
    try {
      await backend.clearMessages(activeSessionPhone, activeThread.id);
      setDraft("");
      setPendingAttachments([]);
      setChatSearch("");
      setChatSearchOpen(false);
      setChatActionsOpen(false);
      setActionError("");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not clear this conversation."); }
  }

  async function toggleChatBlock() {
    if (!activeSessionPhone || !activeThread.id) return;
    try {
      await backend.setBlocked(activeSessionPhone, activeThread.id, !activeThread.blocked);
      setChatActionsOpen(false);
      setChatSearchOpen(false);
      setChatSearch("");
      if (!activeThread.blocked) {
        setDraft("");
        setPendingAttachments([]);
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not update this conversation."); }
  }

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const totalBytes = pendingAttachments.reduce((total, attachment) => total + attachment.size, 0) + files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > 500_000) {
      setActionError("Attachments must total 500 KB or less.");
      return;
    }
    setActionError("");
    setUploadsInProgress((current) => current + files.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        setPendingAttachments((current) => [...current, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: reader.result as string,
        }]);
      };
      reader.onloadend = () => setUploadsInProgress((current) => Math.max(0, current - 1));
      reader.readAsDataURL(file);
    });
  }

  async function startPhoneAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizeIndianPhone(phoneNumber);
    if (normalizedPhone.length !== 10) {
      setAuthError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await backend.sendPin(normalizedPhone);
      setPhoneNumber(normalizedPhone);
      setShowSavedPhones(false);
      setAuthMode(result.exists ? "signin" : "signup");
      setOtp("");
      setDemoPin(result.pin);
      setScreen("otp");
    } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Could not send a verification code."); }
    finally { setAuthBusy(false); }
  }

  async function completePhoneAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const normalizedPhone = normalizeIndianPhone(phoneNumber);
      const result = await backend.verifyPin(normalizedPhone, otp);
      if (!result.success) {
        setAuthError(result.message || "Could not verify this code.");
        return;
      }
      rememberPhone(normalizedPhone);
      saveActiveSession(normalizedPhone);
      setDemoPin("");
    } catch (cause) { setAuthError(cause instanceof Error ? cause.message : "Could not verify this code."); }
    finally { setAuthBusy(false); }
  }

  async function createConversation(recipient: string) {
    if (!activeSessionPhone) throw new Error("Sign in to start a conversation.");
    const recipientPhone = recipient.replace(/\D/g, "");
    if (recipientPhone.length < 10) throw new Error("Enter a valid phone number.");
    const id = await backend.createConversation(activeSessionPhone, recipientPhone);
    setActiveId(id);
    setChatOpen(true);
    setComposeOpen(false);
    await backend.markRead(activeSessionPhone, id);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSessionPhone) return;
    const cleanName = profileName.trim() || "PhoneMail user";
    try {
      await backend.updateProfile(activeSessionPhone, cleanName, profilePicture || undefined);
      setProfileName(cleanName);
      document.documentElement.dataset.theme = theme;
      try { window.localStorage.setItem("phonemail.theme", theme); } catch { /* Theme remains active for this visit. */ }
      setSettingsOpen(false);
      setActionError("");
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : "Could not save your profile."); }
  }

  if (!activeSessionPhone) {
    const phoneDigits = normalizeIndianPhone(phoneNumber);
    const matchingSavedPhones = showSavedPhones
      ? savedPhoneNumbers.filter((phone) => phone.startsWith(phoneDigits) && phone !== phoneDigits).slice(0, 4)
      : [];
    return <PhoneAuthScreen
      screen={screen}
      authMode={authMode}
      theme={theme}
      phoneNumber={phoneNumber}
      otp={otp}
      demoPin={demoPin}
      busy={authBusy}
      error={authError}
      savedPhoneSuggestions={matchingSavedPhones}
      onThemeToggle={toggleTheme}
      onPhoneChange={(event) => setPhoneNumber(event.target.value)}
      onPhoneFocus={() => setShowSavedPhones(true)}
      onPhoneEntryBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) setShowSavedPhones(false);
      }}
      onSelectSavedPhone={(phone) => { setPhoneNumber(phone); setShowSavedPhones(false); }}
      onPhoneFormSubmit={startPhoneAuth}
      onOtpChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
      onOtpFormSubmit={completePhoneAuth}
      onChangeNumber={() => { setShowSavedPhones(false); setAuthError(""); setScreen("login"); }}
    />;
  }

  return (
    <main className="app-shell">
      <InboxSidebar
        chatOpen={chatOpen}
        theme={theme}
        profileName={profileName}
        profilePicture={profilePicture}
        phoneNumber={phoneNumber}
        activeSessionPhone={activeSessionPhone}
        profileMenuOpen={profileMenuOpen}
        search={search}
        filter={filter}
        filters={filters}
        allThreads={backend.threads}
        visibleThreads={visibleThreads}
        activeId={activeId}
        onThemeToggle={toggleTheme}
        onProfileMenuToggle={() => setProfileMenuOpen((open) => !open)}
        onSettings={() => { setProfileMenuOpen(false); setSettingsOpen(true); }}
        onLogout={() => { clearActiveSession(); setProfileMenuOpen(false); setChatOpen(false); setOtp(""); setDemoPin(""); setPhoneNumber(""); setAuthMode("signin"); setScreen("login"); }}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onOpenThread={(id) => { void openThread(id); }}
        onCompose={() => setComposeOpen(true)}
      />

      <section className={`chat-panel ${chatOpen ? "chat-panel-open" : ""}`} aria-label="Conversation" onClick={(event) => {
        if (chatActionsOpen && !(event.target as HTMLElement).closest(".chat-actions-menu, .chat-more")) setChatActionsOpen(false);
      }}>
        <header className="chat-header" onClick={(event) => {
          if ((event.target as HTMLElement).closest(".chat-more")) setChatActionsOpen((open) => !open);
        }}>
          <button className="mobile-back" onClick={() => setChatOpen(false)} aria-label="Back to inbox">←</button>
          <button className="chat-profile-trigger" type="button" onClick={() => activeThread.id && setContactOpen(true)} aria-label={`View ${activeThread.name}'s profile`} aria-haspopup="dialog">
            <span className={`avatar avatar-${activeThread.color}`}>{activeThread.initials}</span>
            <span className="chat-person"><strong>{activeThread.name}</strong><span>{activeThread.email}</span></span>
          </button>
          <button className={`icon-button favorite-toggle ${activeThread.favorite ? "favorite-toggle-active" : ""}`} type="button" onClick={() => { if (activeThread.id) void toggleFavorite(activeThread.id); }} aria-label={activeThread.favorite ? `Remove ${activeThread.name} from favorites` : `Add ${activeThread.name} to favorites`} aria-pressed={Boolean(activeThread.favorite)} title={activeThread.favorite ? "Remove from favorites" : "Add to favorites"} disabled={!activeThread.id}>
            <StarIcon filled={Boolean(activeThread.favorite)} />
          </button>
          <button className="icon-button chat-more" aria-label="More conversation options" disabled={!activeThread.id}>•••</button>
        </header>

        {actionError && <p className="convex-demo-error" role="alert">{actionError}</p>}
        {backend.loading && <p className="empty-state">Loading your conversations…</p>}
        {chatActionsOpen && <ChatActionsMenu
          blocked={Boolean(activeThread.blocked)}
          onSearch={() => { setChatActionsOpen(false); setChatSearch(""); setChatSearchOpen(true); }}
          onClear={() => { void clearActiveChat(); }}
          onToggleBlock={() => { void toggleChatBlock(); }}
        />}

        {chatSearchOpen && <div className="conversation-search">
          <SearchIcon />
          <input autoFocus value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search this conversation" aria-label="Search this conversation" />
          <span>{normalizedChatSearch ? `${displayedMessages.length} found` : `${activeThread.messages.length} messages`}</span>
          <button type="button" onClick={() => { setChatSearchOpen(false); setChatSearch(""); }} aria-label="Close conversation search">×</button>
        </div>}

        <ChatMessages thread={activeThread} messages={displayedMessages} searching={Boolean(normalizedChatSearch)} />
        {backend.threads.length === 0 && !backend.loading && <p className="empty-state">No conversations yet. Select Compose to find a PhoneMail user.</p>}

        <ChatComposer
          blocked={Boolean(activeThread.blocked) || !activeThread.id}
          draft={draft}
          attachments={pendingAttachments}
          uploadsInProgress={uploadsInProgress}
          attachmentInputRef={attachmentInputRef}
          onDraftChange={setDraft}
          onRemoveAttachment={(id) => setPendingAttachments((current) => current.filter((item) => item.id !== id))}
          onAddAttachments={addAttachments}
          onSubmit={sendMessage}
        />
      </section>

      {composeOpen && <ComposeDialog onClose={() => setComposeOpen(false)} onCreate={createConversation} />}

      {settingsOpen && <SettingsDialog
        profileName={profileName}
        profilePicture={profilePicture}
        theme={theme}
        phoneNumber={phoneNumber}
        activeSessionPhone={activeSessionPhone}
        onNameChange={setProfileName}
        onPhotoUpload={loadProfilePicture}
        onPhotoRemove={() => setProfilePicture("")}
        onThemeChange={(nextTheme) => { setTheme(nextTheme); document.documentElement.dataset.theme = nextTheme; }}
        onSave={(event) => { void saveProfile(event); }}
        onCancel={() => setSettingsOpen(false)}
      />}

      {contactOpen && activeThread.id && <ContactProfileDialog thread={activeThread} onClose={() => setContactOpen(false)} />}
    </main>
  );
}
