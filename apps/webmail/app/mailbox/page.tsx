
"use client";

import { useEffect, useState } from "react";
import "./mailbox.css";
import Sidebar from "./components/Sidebar";
import MailList from "./components/MailList";
import EmailView from "./components/EmailView";
import ComposeWindow from "./components/ComposeWindow";
import ProfileMenu from "./components/ProfileMenu";

/* =========================================================
   TYPES
========================================================= */

type Folder = {
  name: string;
  icon: string;
};

type Email = {
  id: number;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  date: string;
  unread: boolean;
  starred: boolean;
  folder: "Inbox" | "Sent" | "Drafts" | "Trash";
  deletedFrom?: "Inbox" | "Sent" | "Drafts";
  to?: string;
  cc?: string;
  bcc?: string;
  recipient?: string;
};

type ComposeEmail = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Mailbox() {


  /* =======================================================
     FOLDERS
  ======================================================= */

  const folders: Folder[] = [
    {
      name: "Inbox",
      icon: "📥",
    },
    {
      name: "Starred",
      icon: "⭐",
    },
    {
      name: "Drafts",
      icon: "📝",
    },
    {
      name: "Sent",
      icon: "📤",
    },
    {
      name: "Trash",
      icon: "🗑️",
    },
  ];


  /* =======================================================
     INITIAL EMAILS
  ======================================================= */

  const initialEmails: Email[] = [
    {
      id: 1,
      sender: "Rahul Sharma",
      email: "rahul@example.com",
      subject: "Meeting Update",
      preview:
        "Hi, I wanted to update you about tomorrow's meeting...",
      body:
        "Hi,\n\nI wanted to update you about tomorrow's meeting. The meeting will start at 10:00 AM.\n\nPlease make sure you have the required documents ready.\n\nThanks,\nRahul",
      time: "10:30 AM",
      date: "September 24, 2026",
      unread: true,
      starred: false,
      folder: "Inbox",
    },

    {
      id: 2,
      sender: "Amazon",
      email: "no-reply@amazon.com",
      subject: "Your order has been shipped",
      preview:
        "Your package is on its way and will arrive soon...",
      body:
        "Hello,\n\nYour order has been shipped and is currently on its way.\n\nYou can track your package using your Amazon account.\n\nThank you for shopping with us.",
      time: "9:42 AM",
      date: "September 24, 2026",
      unread: true,
      starred: true,
      folder: "Inbox",
    },

    {
      id: 3,
      sender: "Priya",
      email: "priya@example.com",
      subject: "Hello!",
      preview:
        "Hey! How are you doing? It's been a long time...",
      body:
        "Hey!\n\nHow are you doing? It's been a long time since we talked.\n\nLet me know when you are free. We should catch up sometime.\n\nPriya",
      time: "8:15 AM",
      date: "September 24, 2026",
      unread: false,
      starred: false,
      folder: "Inbox",
    },

    {
      id: 4,
      sender: "GitHub",
      email: "notifications@github.com",
      subject: "New repository activity",
      preview:
        "There has been new activity on one of your repositories...",
      body:
        "There has been new activity on one of your GitHub repositories.\n\nPlease visit your GitHub account to view the latest activity.",
      time: "Yesterday",
      date: "September 23, 2026",
      unread: false,
      starred: false,
      folder: "Inbox",
    },
  ];


  /* =======================================================
     STATES
  ======================================================= */

  const [activeFolder, setActiveFolder] =
    useState<string>("Inbox");

  const [searchQuery, setSearchQuery] =
    useState<string>("");

  const [emails, setEmails] =
    useState<Email[]>(initialEmails);

  const [selectedEmails, setSelectedEmails] =
    useState<number[]>([]);

  const [selectedEmail, setSelectedEmail] =
    useState<Email | null>(null);

  const folderEmails = emails.filter((email) => {
    if (activeFolder === "Starred") {
      return email.starred && email.folder !== "Trash";
    }

    return email.folder === activeFolder;
  });

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const displayedEmails = normalizedSearchQuery
    ? folderEmails.filter((email) =>
        [
          email.sender,
          email.email,
          email.subject,
          email.preview,
          email.body,
          email.date,
          email.time,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedSearchQuery),
      )
    : folderEmails;


  /* =======================================================
     COMPOSE STATE
  ======================================================= */

  const [showCompose, setShowCompose] =
    useState<boolean>(false);

  const [composeMinimized, setComposeMinimized] =
    useState<boolean>(false);

  const [showCc, setShowCc] =
    useState<boolean>(false);

  const [showBcc, setShowBcc] =
    useState<boolean>(false);


  const [compose, setCompose] =
    useState<ComposeEmail>({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
    });

  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);


  /* =======================================================
     COMPOSE ERROR
  ======================================================= */

  const [composeError, setComposeError] =
    useState<string>("");


  /* =======================================================
     ATTACHMENTS
  ======================================================= */

  const [attachments, setAttachments] =
    useState<File[]>([]);


  /* =======================================================
     REPLY / FORWARD
  ======================================================= */

  const [showReplyBox, setShowReplyBox] =
    useState<boolean>(false);

  const [showForwardBox, setShowForwardBox] =
    useState<boolean>(false);

  const [replyText, setReplyText] =
    useState<string>("");

  const [forwardText, setForwardText] =
    useState<string>("");

  const [forwardTo, setForwardTo] =
    useState<string>("");

  // Keep mailbox screens in browser history so Back restores the previous
  // folder or closes an opened message before leaving the mailbox.
  useEffect(() => {
    const currentState = window.history.state ?? {};
    window.history.replaceState(
      { ...currentState, phoneMail: { folder: "Inbox", view: "list" } },
      "",
    );
  }, []);

  useEffect(() => {
    const restoreMailboxScreen = (event: PopStateEvent) => {
      const screen = event.state?.phoneMail as
        | { folder?: string; view?: string; emailId?: number }
        | undefined;
      const folder = screen?.folder ?? "Inbox";

      setActiveFolder(folder);
      setSelectedEmails([]);
      setSelectedEmail(
        screen?.view === "email" && screen.emailId
          ? emails.find((email) => email.id === screen.emailId) ?? null
          : null,
      );
      setShowReplyBox(false);
      setShowForwardBox(false);
    };

    window.addEventListener("popstate", restoreMailboxScreen);
    return () => window.removeEventListener("popstate", restoreMailboxScreen);
  }, [emails]);

  /* =======================================================
     UNREAD COUNT
  ======================================================= */

  const unreadCount = emails.filter(
    (email) => email.folder === "Inbox" && email.unread,
  ).length;


  /* =======================================================
     OPEN EMAIL
  ======================================================= */

  const openEmail = (id: number) => {

    const email = emails.find(
      (email) => email.id === id
    );

    if (!email) return;
    setSelectedEmails([]);

    if (email.folder === "Drafts") {
      setCompose({
        to: email.to ?? "",
        cc: email.cc ?? "",
        bcc: email.bcc ?? "",
        subject: email.subject,
        body: email.body,
      });
      setEditingDraftId(id);
      setShowCompose(true);
      setComposeMinimized(false);
      setShowCc(Boolean(email.cc));
      setShowBcc(Boolean(email.bcc));
      setComposeError("");
      setShowReplyBox(false);
      setShowForwardBox(false);
      return;
    }

    window.history.pushState(
      {
        ...window.history.state,
        phoneMail: { folder: activeFolder, view: "email", emailId: id },
      },
      "",
    );

    setSelectedEmail({
      ...email,
      unread: false,
    });

    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === id
          ? {
              ...email,
              unread: false,
            }
          : email
      )
    );

    setShowReplyBox(false);
    setShowForwardBox(false);
  };


  /* =======================================================
     CLOSE EMAIL
  ======================================================= */

  const closeEmail = () => {

    if (window.history.state?.phoneMail?.view === "email") {
      window.history.back();
      return;
    }

    setSelectedEmail(null);

    setShowReplyBox(false);
    setShowForwardBox(false);

    setReplyText("");
    setForwardText("");
    setForwardTo("");
  };


  /* =======================================================
     STAR
  ======================================================= */

  const toggleStar = (
    id: number,
    event?: React.MouseEvent
  ) => {

    event?.stopPropagation();

    setSelectedEmails((current) => current.filter((emailId) => emailId !== id));

    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === id
          ? {
              ...email,
              starred: !email.starred,
            }
          : email
      )
    );

    setSelectedEmail((currentEmail) => {

      if (
        !currentEmail ||
        currentEmail.id !== id
      ) {
        return currentEmail;
      }

      return {
        ...currentEmail,
        starred: !currentEmail.starred,
      };
    });
  };


  /* =======================================================
     MARK AS UNREAD
  ======================================================= */

  const markAsUnread = () => {

    if (!selectedEmail) return;

    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === selectedEmail.id
          ? {
              ...email,
              unread: true,
            }
          : email
      )
    );

    setSelectedEmail(null);
  };


  /* =======================================================
     DELETE EMAIL
  ======================================================= */

  const deleteEmail = () => {
    if (!selectedEmail) return;
    const selectedId = selectedEmail.id;

    setEmails((currentEmails) => currentEmails.flatMap((email) => {
      if (email.id !== selectedId) return [email];
      if (email.folder === "Trash") return [];
      return [{
        ...email,
        deletedFrom: email.folder,
        folder: "Trash" as const,
        unread: false,
      }];
    }));
    setSelectedEmail(null);
  };

  /* =======================================================
     RESTORE EMAIL
  ======================================================= */

  const restoreEmail = () => {
    if (!selectedEmail || selectedEmail.folder !== "Trash") {
      return;
    }

    const selectedId = selectedEmail.id;
    setEmails((currentEmails) => currentEmails.map((email) => {
      if (email.id !== selectedId) return email;
      const { deletedFrom, ...restoredEmail } = email;
      return { ...restoredEmail, folder: deletedFrom ?? "Inbox" };
    }));

    setSelectedEmail(null);
  };

  /* =======================================================
     SELECT EMAIL
  ======================================================= */

  const toggleSelectEmail = (
    id: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    event.stopPropagation();

    if (event.target.checked) {

      setSelectedEmails((current) => [
        ...current,
        id,
      ]);

    } else {

      setSelectedEmails((current) =>
        current.filter(
          (emailId) =>
            emailId !== id
        )
      );

    }
  };


  /* =======================================================
     SELECT ALL
  ======================================================= */

  const toggleSelectAll = () => {
    const displayedIds = displayedEmails.map((email) => email.id);
    const allDisplayedSelected = displayedIds.length > 0 && displayedIds.every((id) => selectedEmails.includes(id));
    setSelectedEmails((current) => allDisplayedSelected
      ? current.filter((id) => !displayedIds.includes(id))
      : [...new Set([...current, ...displayedIds])]);
  };


  /* =======================================================
     DELETE SELECTED
  ======================================================= */

  const deleteSelectedEmails = () => {
    if (selectedEmails.length === 0) return;
    const selectedIds = new Set(selectedEmails);
    setEmails((currentEmails) => currentEmails.flatMap((email) => {
      if (!selectedIds.has(email.id)) return [email];
      if (email.folder === "Trash") return [];
      return [{
        ...email,
        deletedFrom: email.folder,
        folder: "Trash" as const,
        unread: false,
      }];
    }));
    setSelectedEmails([]);
  };

  const restoreSelectedEmails = () => {
    const selectedIds = new Set(selectedEmails);
    setEmails((currentEmails) => currentEmails.map((email) => {
      if (!selectedIds.has(email.id) || email.folder !== "Trash") return email;
      const { deletedFrom, ...restoredEmail } = email;
      return { ...restoredEmail, folder: deletedFrom ?? "Inbox" };
    }));
    setSelectedEmails([]);
  };

  const changeFolder = (folder: string) => {
    if (folder !== activeFolder) {
      window.history.pushState(
        {
          ...window.history.state,
          phoneMail: { folder, view: "list" },
        },
        "",
      );
    }
    setActiveFolder(folder);
    setSelectedEmails([]);
    setSelectedEmail(null);
    setShowReplyBox(false);
    setShowForwardBox(false);
  };


  /* =======================================================
     OPEN COMPOSE
  ======================================================= */

  const openCompose = () => {

    setShowCompose(true);

    setComposeMinimized(false);

    setComposeError("");

    setEditingDraftId(null);
  };


  /* =======================================================
     CLOSE COMPOSE
  ======================================================= */

  const closeCompose = () => {

    setShowCompose(false);

    setComposeMinimized(false);

    setShowCc(false);
    setShowBcc(false);

    setComposeError("");
    setEditingDraftId(null);

    setAttachments([]);

    setCompose({
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
    });
  };


  /* =======================================================
     UPDATE COMPOSE
  ======================================================= */

  const updateCompose = (
    field: keyof ComposeEmail,
    value: string
  ) => {

    setCompose((current) => ({
      ...current,
      [field]: value,
    }));

    setComposeError("");
  };


  /* =======================================================
     FILE ATTACHMENT
  ======================================================= */

  const handleAttachment = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    if (!event.target.files) {
      return;
    }

    const selectedFiles =
      Array.from(event.target.files);

    setAttachments((current) => [
      ...current,
      ...selectedFiles,
    ]);

    event.target.value = "";
  };


  /* =======================================================
     REMOVE ATTACHMENT
  ======================================================= */

  const removeAttachment = (
    index: number
  ) => {

    setAttachments((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  };


  /* =======================================================
     SEND EMAIL
  ======================================================= */

  const sendEmail = () => {

    if (!compose.to.trim()) {

      setComposeError(
        "Please enter a recipient email address."
      );

      return;
    }


    if (!compose.to.includes("@")) {

      setComposeError(
        "Please enter a valid recipient email address."
      );

      return;
    }


    if (
      !compose.subject.trim() &&
      !compose.body.trim()
    ) {

      setComposeError(
        "Please enter a subject or message."
      );

      return;
    }


    const sentAt = new Date();
    setEmails((currentEmails) => [{
      id: Date.now(),
      sender: "Me",
      email: "",
      recipient: compose.to.trim(),
      subject: compose.subject.trim() || "(no subject)",
      preview: compose.body.trim().replace(/\s+/g, " ").slice(0, 120),
      body: compose.body,
      time: sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      date: sentAt.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }),
      unread: false,
      starred: false,
      folder: "Sent",
      to: compose.to.trim(),
      cc: compose.cc.trim(),
      bcc: compose.bcc.trim(),
    }, ...currentEmails.filter((email) => email.id !== editingDraftId)]);

    closeCompose();
  };


  /* =======================================================
     SAVE DRAFT
  ======================================================= */

  const saveDraft = () => {
    const savedAt = new Date();
    const draftId = editingDraftId ?? Date.now();
    setEmails((currentEmails) => {
      const draft: Email = {
        id: draftId,
        sender: "Draft",
        email: "",
        subject: compose.subject.trim() || "(no subject)",
        preview: compose.body.trim().replace(/\s+/g, " ").slice(0, 120),
        body: compose.body,
        time: savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        date: savedAt.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }),
        unread: false,
        starred: false,
        folder: "Drafts",
        to: compose.to.trim(),
        cc: compose.cc.trim(),
        bcc: compose.bcc.trim(),
      };
      return [draft, ...currentEmails.filter((email) => email.id !== draftId)];
    });
    closeCompose();
  };


  /* =======================================================
     SEND REPLY
  ======================================================= */

  const sendReply = () => {

  if (!selectedEmail) {
    return;
  }

  if (!replyText.trim()) {
    alert("Please write a reply message.");
    return;
  }

  alert(
    `Reply sent to ${selectedEmail.email}`
  );

  setReplyText("");
  setShowReplyBox(false);
  };


  /* =======================================================
     SEND FORWARD
  ======================================================= */

  const sendForward = () => {

  if (!selectedEmail) return;

  if (!forwardTo.trim()) {
    alert(
      "Please enter a recipient email address."
    );
    return;
  }

  if (!forwardTo.includes("@")) {
    alert(
      "Please enter a valid recipient email address."
    );
    return;
  }

  alert(
    `Email forwarded to ${forwardTo}`
  );

  setForwardTo("");
  setForwardText("");
  setShowForwardBox(false);
  };


  /* =======================================================
     EMAIL DETAIL VIEW
  ======================================================= */

  if (selectedEmail) {

    return (
      <div className="mailbox-container">


        {/* HEADER */}

        <header className="mailbox-header">

          <div className="logo">

            <span className="logo-icon">
              ✉
            </span>

            <span>
              PhoneMail
            </span>

          </div>


          <div className="mailbox-search" role="search">
            <svg className="mailbox-search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSelectedEmails([]);
              }}
              placeholder={`Search ${activeFolder.toLowerCase()}...`}
              aria-label={`Search ${activeFolder}`}
            />
            {searchQuery && (
              <button
                className="search-clear-button"
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedEmails([]);
                }}
                aria-label="Clear search"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="header-right">
            <ProfileMenu />

          </div>

        </header>

        <div className="mailbox-body">

  <Sidebar
    folders={folders}
    activeFolder={activeFolder}
    onFolderChange={changeFolder}
    onCompose={openCompose}
    unreadCount={unreadCount}
  />

  <main className="email-content">

    <EmailView
      email={selectedEmail}
      onBack={closeEmail}
      onToggleStar={toggleStar}
      onMarkUnread={markAsUnread}
      onDelete={deleteEmail}
      onRestore={restoreEmail}

      showReplyBox={showReplyBox}
      showForwardBox={showForwardBox}

      replyText={replyText}
      forwardText={forwardText}
      forwardTo={forwardTo}

      onShowReply={() => {
        setShowReplyBox(true);
        setShowForwardBox(false);
      }}

      onShowForward={() => {
        setShowForwardBox(true);
        setShowReplyBox(false);
      }}

      onReplyTextChange={setReplyText}
      onForwardTextChange={setForwardText}
      onForwardToChange={setForwardTo}

      onSendReply={sendReply}
      onSendForward={sendForward}

      onCancelReply={() => {
        setShowReplyBox(false);
        setReplyText("");
      }}

      onCancelForward={() => {
        setShowForwardBox(false);
        setForwardTo("");
        setForwardText("");
      }}
    />

      </main>

      </div>


      </div>
    );
  }


  /* =======================================================
     MAILBOX VIEW
  ======================================================= */

  return (
    <div className="mailbox-container">


      {/* ===================================================
         HEADER
      =================================================== */}

      <header className="mailbox-header">

        <div className="logo">

          <span className="logo-icon">
            ✉
          </span>

          <span>
            PhoneMail
          </span>

        </div>


        <div className="mailbox-search" role="search">
          <svg className="mailbox-search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedEmails([]);
            }}
            placeholder={`Search ${activeFolder.toLowerCase()}...`}
            aria-label={`Search ${activeFolder}`}
          />
          {searchQuery && (
            <button
              className="search-clear-button"
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedEmails([]);
              }}
              aria-label="Clear search"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="header-right">
          <ProfileMenu />

        </div>

      </header>


      {/* ===================================================
         BODY
      =================================================== */}

      <div className="mailbox-body">


        {/* =================================================
           SIDEBAR
        ================================================= */}

        <Sidebar
            folders={folders}
            activeFolder={activeFolder}
            onFolderChange={changeFolder}
            onCompose={openCompose}
            unreadCount={unreadCount}
        />

        {/* =================================================
           MAIL AREA
        ================================================= */}

        <main className="mail-area">


          {/* TOOLBAR */}

          <div className="mail-toolbar">

            <div className="toolbar-left">

              <input
                type="checkbox"
                className="select-checkbox"
                checked={
                  displayedEmails.length > 0 &&
                  displayedEmails.every((email) => selectedEmails.includes(email.id))
                }
                onChange={toggleSelectAll}
                aria-label="Select all visible emails"
              />

              {selectedEmails.length > 0 && (
                <>
                  <button
                    className="toolbar-button"
                    type="button"
                    title={activeFolder === "Trash" ? "Delete permanently" : "Move to Trash"}
                    aria-label={activeFolder === "Trash" ? "Delete selected permanently" : "Move selected to Trash"}
                    onClick={deleteSelectedEmails}
                  >
                    🗑️
                  </button>
                  {activeFolder === "Trash" && (
                    <button
                      className="toolbar-button"
                      type="button"
                      title="Restore selected"
                      aria-label="Restore selected"
                      onClick={restoreSelectedEmails}
                    >
                      ↶
                    </button>
                  )}
                </>
              )}

            </div>


            <div className="mail-title">
              {activeFolder}
            </div>


            <div className="mail-count">
              {displayedEmails.length} {displayedEmails.length === 1 ? "email" : "emails"}
            </div>

          </div>


          {/* EMAIL LIST */}

          <MailList
            emails={displayedEmails}
            selectedEmails={selectedEmails}
            onSelectEmail={toggleSelectEmail}
            onToggleStar={toggleStar}
            onOpenEmail={openEmail}
            emptyMessage={normalizedSearchQuery
              ? `No emails match “${searchQuery.trim()}”.`
              : "Your mailbox is empty."}
           />

        </main>

      </div>


      {/* ===================================================
         COMPOSE WINDOW
      =================================================== */}

        {showCompose && (
          <ComposeWindow
              compose={compose}
              composeMinimized={composeMinimized}

              showCc={showCc}
              showBcc={showBcc}

              composeError={composeError}

              attachments={attachments}

              onClose={closeCompose}

              onMinimize={() => {
                setComposeMinimized(true);
              }}

              onRestore={() => {
                setComposeMinimized(false);
              }}

              onToggleCc={() => {
                setShowCc((current) => !current);
              }}

              onToggleBcc={() => {
                setShowBcc((current) => !current);
              }}

              onUpdateCompose={updateCompose}

              onSend={sendEmail}

              onSaveDraft={saveDraft}

              onAttachment={handleAttachment}

              onRemoveAttachment={removeAttachment}
            />
          )}

    </div>
  );
}
