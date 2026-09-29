import type { Filter, Thread } from "../../_types/chat";
import { PhoneMailLogo, SearchIcon, ThemeIcon } from "../icons";
import { ConversationList } from "./ConversationList";

type InboxSidebarProps = {
  chatOpen: boolean;
  theme: "light" | "dark";
  profileName: string;
  profilePicture: string;
  phoneNumber: string;
  activeSessionPhone: string | null;
  profileMenuOpen: boolean;
  search: string;
  filter: Filter;
  filters: readonly Filter[];
  allThreads: Thread[];
  visibleThreads: Thread[];
  activeId: string;
  onThemeToggle: () => void;
  onProfileMenuToggle: () => void;
  onSettings: () => void;
  onLogout: () => void;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: Filter) => void;
  onOpenThread: (id: string) => void;
  onCompose: () => void;
};

export function InboxSidebar({
  chatOpen, theme, profileName, profilePicture, phoneNumber, activeSessionPhone,
  profileMenuOpen, search, filter, filters, allThreads, visibleThreads, activeId, onThemeToggle,
  onProfileMenuToggle, onSettings, onLogout, onSearchChange, onFilterChange,
  onOpenThread, onCompose,
}: InboxSidebarProps) {
  return (
    <aside className={`inbox-panel ${chatOpen ? "inbox-panel-hidden" : ""}`}>
      <header className="inbox-header">
        <a className="brand" href="#" aria-label="PhoneMail home">
          <span className="brand-mark brand-logo-mark"><PhoneMailLogo /></span>
          <span className="brand-wordmark"><span className="brand-phone">Phone</span><span className="brand-mail">Mail</span></span>
        </a>
        <div className="profile-menu-wrap">
          <button className="theme-toggle" onClick={onThemeToggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><ThemeIcon theme={theme} /></button>
          <button className={`profile-button ${profilePicture ? "profile-button-image" : ""}`} style={profilePicture ? { backgroundImage: `url(${profilePicture})` } : undefined} aria-label="Account menu" title="Account menu" aria-expanded={profileMenuOpen} onClick={onProfileMenuToggle}>{profilePicture ? "" : profileName.slice(0, 1).toUpperCase()}</button>
          {profileMenuOpen && <div className="profile-menu">
            <div className="profile-menu-card">
              <span className={`profile-menu-avatar ${profilePicture ? "profile-menu-avatar-image" : ""}`} style={profilePicture ? { backgroundImage: `url(${profilePicture})` } : undefined}>
                {profilePicture ? "" : profileName.slice(0, 1).toUpperCase()}
              </span>
              <span className="profile-menu-copy">
                <span className="profile-menu-label">MY ACCOUNT</span>
                <strong>{profileName}</strong>
                <small>+91 {phoneNumber || activeSessionPhone || "Your number"}</small>
              </span>
            </div>
            <button className="profile-menu-settings" onClick={onSettings}>My profile <span aria-hidden="true">›</span></button>
            <button className="profile-menu-logout" onClick={onLogout}>Log out</button>
          </div>}
        </div>
      </header>

      <div className="inbox-title-row">
        <div><p className="eyebrow">YOUR MAIL</p><h1>Inbox <span className="total-count">{allThreads.length}</span></h1></div>
        <button className="compose-button" onClick={onCompose}><span>+</span> Compose</button>
      </div>

      <label className="search-box">
        <SearchIcon />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search messages" aria-label="Search messages" />
        {search && <button onClick={() => onSearchChange("")} aria-label="Clear search">×</button>}
      </label>

      <nav className="filter-row" aria-label="Filter conversations">
        {filters.map((item) => <button key={item} onClick={() => onFilterChange(item)} className={`filter-chip ${filter === item ? "filter-chip-active" : ""}`}>{item}</button>)}
      </nav>

      <ConversationList threads={visibleThreads} activeId={activeId} onOpen={onOpenThread} />
      <footer className="inbox-footer"><span className="online-dot" /> All caught up <span className="footer-divider">·</span> {allThreads.length} conversations</footer>
    </aside>
  );
}
