"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { initialThreads } from "./_data/initial-threads";
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
const demoAccountsKey = "phonemail.demoAccounts";
const favoriteThreadsKey = "phonemail.favoriteThreads";
const threadOrderKey = "phonemail.threadOrder";
const demoAccountsChangedEvent = "phonemail:demo-accounts-changed";
const activeSessionKey = "phonemail.activeSession";
const activeSessionChangedEvent = "phonemail:active-session-changed";

function getActiveSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const phone = window.localStorage.getItem(activeSessionKey)?.replace(/\D/g, "") ?? "";
    return phone.length >= 10 ? phone : null;
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
  try {
    window.localStorage.setItem(activeSessionKey, phone);
  } catch {
    // The demo can still continue for this visit when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(activeSessionChangedEvent));
}

function clearActiveSession() {
  try {
    window.localStorage.removeItem(activeSessionKey);
  } catch {
    // Logging out still updates the current page when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(activeSessionChangedEvent));
}

function getDemoAccounts(): string[] {
  try {
    const storedAccounts: unknown = JSON.parse(window.localStorage.getItem(demoAccountsKey) ?? "[]");
    return Array.isArray(storedAccounts) ? storedAccounts.filter((account): account is string => typeof account === "string") : [];
  } catch {
    return [];
  }
}

function getDemoAccountsSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(demoAccountsKey) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeToDemoAccounts(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(demoAccountsChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(demoAccountsChangedEvent, onChange);
  };
}

function parseDemoAccounts(snapshot: string): string[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter((account): account is string => typeof account === "string") : [];
  } catch {
    return [];
  }
}

function saveDemoAccount(phone: string) {
  try {
    window.localStorage.setItem(demoAccountsKey, JSON.stringify([...new Set([...getDemoAccounts(), phone])]));
  } catch {
    // The demo flow can still complete when browser storage is disabled.
  }
  window.dispatchEvent(new Event(demoAccountsChangedEvent));
}

export default function Home() {
  const activeSessionPhone = useSyncExternalStore(subscribeToActiveSession, getActiveSession, () => null);
  const demoAccountsSnapshot = useSyncExternalStore(subscribeToDemoAccounts, getDemoAccountsSnapshot, () => "[]");
  const savedPhoneNumbers = useMemo(() => parseDemoAccounts(demoAccountsSnapshot), [demoAccountsSnapshot]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [screen, setScreen] = useState<"login" | "otp" | "inbox">("login");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showSavedPhones, setShowSavedPhones] = useState(false);
  const [otp, setOtp] = useState("");
  const [threads, setThreads] = useState(initialThreads);
  const [activeId, setActiveId] = useState(initialThreads[0].id);
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

  useEffect(() => {
    const storedTheme = document.documentElement.dataset.theme;
    if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);
    setProfileName(window.localStorage.getItem("phonemail.profileName") || "PhoneMail user");
    setProfilePicture(window.localStorage.getItem("phonemail.profilePicture") || "");
    try {
      const storedFavorites: unknown = JSON.parse(window.localStorage.getItem(favoriteThreadsKey) ?? "null");
      if (Array.isArray(storedFavorites)) {
        setThreads((current) => current.map((thread) => ({ ...thread, favorite: storedFavorites.includes(thread.id) })));
      }
    } catch {
      // Keep the initial favorites when browser storage is unavailable or invalid.
    }
    try {
      const storedOrder: unknown = JSON.parse(window.localStorage.getItem(threadOrderKey) ?? "null");
      if (Array.isArray(storedOrder)) {
        const positions = new Map(storedOrder.filter((id): id is string => typeof id === "string").map((id, index): [string, number] => [id, index]));
        setThreads((current) => [...current].sort((first, second) => (positions.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(second.id) ?? Number.MAX_SAFE_INTEGER)));
      }
    } catch {
      // Keep the default conversation order when browser storage is unavailable or invalid.
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try { window.localStorage.setItem("phonemail.theme", nextTheme); } catch { /* Theme still changes for this session. */ }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = profileName.trim() || "PhoneMail user";
    setProfileName(cleanName);
    try {
      window.localStorage.setItem("phonemail.profileName", cleanName);
      if (profilePicture) window.localStorage.setItem("phonemail.profilePicture", profilePicture);
      else window.localStorage.removeItem("phonemail.profilePicture");
      window.localStorage.setItem("phonemail.theme", theme);
    } catch { /* Keep the changes active for this session if storage is unavailable. */ }
    setSettingsOpen(false);
  }

  function loadProfilePicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
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

  const activeThread = threads.find((thread) => thread.id === activeId) ?? threads[0];
  const normalizedChatSearch = chatSearch.trim().toLowerCase();
  const displayedMessages = normalizedChatSearch
    ? activeThread.messages.filter((message) => `${message.text} ${message.attachments?.map((attachment) => attachment.name).join(" ") ?? ""}`.toLowerCase().includes(normalizedChatSearch))
    : activeThread.messages;
  const visibleThreads = useMemo(() => threads.filter((thread) => {
    const matchesSearch = `${thread.name} ${thread.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" ||
      (filter === "Unread" && Boolean(thread.unread)) ||
      (filter === "Attachments" && Boolean(thread.attachment)) ||
      (filter === "Favorites" && Boolean(thread.favorite));
    return matchesSearch && matchesFilter;
  }).sort((first, second) => Number(Boolean(second.favorite)) - Number(Boolean(first.favorite))), [threads, search, filter]);

  function openThread(id: string) {
    setActiveId(id);
    setChatOpen(true);
    setChatActionsOpen(false);
    setChatSearchOpen(false);
    setChatSearch("");
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, unread: undefined } : thread));
  }

  function toggleFavorite(id: string) {
    const target = threads.find((thread) => thread.id === id);
    if (!target) return;
    const updated = { ...target, favorite: !target.favorite };
    const updatedThreads = threads.map((thread) => thread.id === id ? updated : thread);
    const nextThreads = target.favorite
      ? [...updatedThreads.filter((thread) => thread.id !== id), updated]
      : updatedThreads;
    setThreads(nextThreads);
    try {
      window.localStorage.setItem(favoriteThreadsKey, JSON.stringify(nextThreads.filter((thread) => thread.favorite).map((thread) => thread.id)));
      window.localStorage.setItem(threadOrderKey, JSON.stringify(nextThreads.map((thread) => thread.id)));
    } catch {
      // The favorite toggle and reordering still work for this visit if browser storage is unavailable.
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeThread.blocked) return;
    const text = draft.trim();
    if (uploadsInProgress > 0 || (!text && pendingAttachments.length === 0)) return;
    setThreads((current) => current.map((thread) => thread.id === activeId ? {
      ...thread,
      time: "Now",
      attachment: thread.attachment || pendingAttachments.length > 0,
      messages: [...thread.messages, { id: Date.now(), from: "me", text, time: "Now", attachments: pendingAttachments }],
    } : thread));
    setDraft("");
    setPendingAttachments([]);
  }

  function clearActiveChat() {
    setThreads((current) => current.map((thread) => thread.id === activeId ? { ...thread, messages: [], unread: undefined } : thread));
    setDraft("");
    setPendingAttachments([]);
    setChatSearch("");
    setChatSearchOpen(false);
    setChatActionsOpen(false);
  }

  function toggleChatBlock() {
    setThreads((current) => current.map((thread) => thread.id === activeId ? { ...thread, blocked: !thread.blocked } : thread));
    setChatActionsOpen(false);
    setChatSearchOpen(false);
    setChatSearch("");
    if (!activeThread.blocked) {
      setDraft("");
      setPendingAttachments([]);
    }
  }

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
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

  function startPhoneAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10) return;
    const accountExists = getDemoAccounts().includes(normalizedPhone);
    setPhoneNumber(normalizedPhone);
    setShowSavedPhones(false);
    setAuthMode(accountExists ? "signin" : "signup");
    setOtp("");
    setScreen("otp");
  }

  function completePhoneAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp !== "123456") return;
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (authMode === "signup") saveDemoAccount(normalizedPhone);
    saveActiveSession(normalizedPhone);
    setPhoneNumber(normalizedPhone);
    setScreen("inbox");
  }

  if (screen === "otp" || (screen === "login" && !activeSessionPhone)) {
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    const matchingSavedPhones = showSavedPhones
      ? savedPhoneNumbers.filter((phone) => phone.startsWith(phoneDigits) && phone !== phoneDigits).slice(0, 4)
      : [];

    return <PhoneAuthScreen
      screen={screen}
      authMode={authMode}
      theme={theme}
      phoneNumber={phoneNumber}
      otp={otp}
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
      onChangeNumber={() => { setShowSavedPhones(false); setScreen("login"); }}
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
        allThreads={threads}
        visibleThreads={visibleThreads}
        activeId={activeId}
        onThemeToggle={toggleTheme}
        onProfileMenuToggle={() => setProfileMenuOpen((open) => !open)}
        onSettings={() => { setProfileMenuOpen(false); setSettingsOpen(true); }}
        onLogout={() => { clearActiveSession(); setProfileMenuOpen(false); setChatOpen(false); setOtp(""); setPhoneNumber(""); setAuthMode("signin"); setScreen("login"); }}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onOpenThread={openThread}
        onCompose={() => setComposeOpen(true)}
      />

      <section className={`chat-panel ${chatOpen ? "chat-panel-open" : ""}`} aria-label="Conversation" onClick={(event) => {
        if (chatActionsOpen && !(event.target as HTMLElement).closest(".chat-actions-menu, .chat-more")) setChatActionsOpen(false);
      }}>
        <header className="chat-header" onClick={(event) => {
          if ((event.target as HTMLElement).closest(".chat-more")) setChatActionsOpen((open) => !open);
        }}>
          <button className="mobile-back" onClick={() => setChatOpen(false)} aria-label="Back to inbox">←</button>
          <button className="chat-profile-trigger" type="button" onClick={() => setContactOpen(true)} aria-label={`View ${activeThread.name}'s profile`} aria-haspopup="dialog">
            <span className={`avatar avatar-${activeThread.color}`}>{activeThread.initials}</span>
            <span className="chat-person"><strong>{activeThread.name}</strong><span>{activeThread.email}</span></span>
          </button>
          <button className={`icon-button favorite-toggle ${activeThread.favorite ? "favorite-toggle-active" : ""}`} type="button" onClick={() => toggleFavorite(activeThread.id)} aria-label={activeThread.favorite ? `Remove ${activeThread.name} from favorites` : `Add ${activeThread.name} to favorites`} aria-pressed={Boolean(activeThread.favorite)} title={activeThread.favorite ? "Remove from favorites" : "Add to favorites"}>
            <StarIcon filled={Boolean(activeThread.favorite)} />
          </button>
          <button className="icon-button chat-more" aria-label="More conversation options">•••</button>
        </header>

        {chatActionsOpen && <ChatActionsMenu
          blocked={Boolean(activeThread.blocked)}
          onSearch={() => { setChatActionsOpen(false); setChatSearch(""); setChatSearchOpen(true); }}
          onClear={clearActiveChat}
          onToggleBlock={toggleChatBlock}
        />}

        {chatSearchOpen && <div className="conversation-search">
          <SearchIcon />
          <input autoFocus value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Search this conversation" aria-label="Search this conversation" />
          <span>{normalizedChatSearch ? `${displayedMessages.length} found` : `${activeThread.messages.length} messages`}</span>
          <button type="button" onClick={() => { setChatSearchOpen(false); setChatSearch(""); }} aria-label="Close conversation search">×</button>
        </div>}

        <ChatMessages thread={activeThread} messages={displayedMessages} searching={Boolean(normalizedChatSearch)} />

        <ChatComposer
          blocked={Boolean(activeThread.blocked)}
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

      {composeOpen && <ComposeDialog onClose={() => setComposeOpen(false)} />}

      {settingsOpen && <SettingsDialog
        profileName={profileName}
        profilePicture={profilePicture}
        theme={theme}
        phoneNumber={phoneNumber}
        activeSessionPhone={activeSessionPhone}
        onNameChange={setProfileName}
        onPhotoUpload={loadProfilePicture}
        onPhotoRemove={() => setProfilePicture("")}
        onThemeChange={setTheme}
        onSave={saveProfile}
        onCancel={() => setSettingsOpen(false)}
      />}

      {contactOpen && <ContactProfileDialog thread={activeThread} onClose={() => setContactOpen(false)} />}
    </main>
  );
}
