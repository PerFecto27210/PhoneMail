"use client";

type Folder = {
  name: string;
  icon: string;
};

type SidebarProps = {
  folders: Folder[];
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  unreadCount: number;
};

export default function Sidebar({
  folders,
  activeFolder,
  onFolderChange,
  onCompose,
  unreadCount,
}: SidebarProps) {
  return (
    <aside className="sidebar">

      {/* Compose button */}
      <button
        className="compose-button"
        onClick={onCompose}
      >
        <span>＋</span>
        Compose
      </button>

      {/* Folder navigation */}
      <nav className="folder-list">
        {folders.map((folder) => (
          <button
            key={folder.name}
            className={`folder-item ${
              activeFolder === folder.name ? "active" : ""
            }`}
            onClick={() => onFolderChange(folder.name)}
            aria-current={activeFolder === folder.name ? "page" : undefined}
            type="button"
          >
            <span className="folder-icon">
              {folder.icon}
            </span>

            <span className="folder-name">
              {folder.name}
            </span>

            {folder.name === "Inbox" && unreadCount > 0 && (
              <span className="unread-count">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

    </aside>
  );
}
