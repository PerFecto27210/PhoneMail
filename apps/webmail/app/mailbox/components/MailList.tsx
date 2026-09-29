"use client";

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
  recipient?: string;
};

type MailListProps = {
  emails: Email[];
  selectedEmails: number[];

  onSelectEmail: (
    id: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onToggleStar: (
    id: number,
    event?: React.MouseEvent
  ) => void;

  onOpenEmail: (id: number) => void;
  emptyMessage: string;
};

export default function MailList({
  emails,
  selectedEmails,
  onSelectEmail,
  onToggleStar,
  onOpenEmail,
  emptyMessage,
}: MailListProps) {
  return (
    <div className="mail-list-container">
      {/* Email list */}
      <div className="email-list">

        {emails.length === 0 ? (
          <div className="empty-mailbox">
            <div className="empty-icon">📭</div>
            <h3>No emails</h3>
            <p>{emptyMessage}</p>
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className={`email-row ${
                email.unread ? "unread" : ""
              }`}
              onClick={() => onOpenEmail(email.id)}
            >

              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedEmails.includes(email.id)}
                onChange={(event) =>
                  onSelectEmail(email.id, event)
                }
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="mail-checkbox"
              />

              {/* Star */}
              <button
                className={`star-button ${
                  email.starred ? "starred" : ""
                }`}
                onClick={(event) =>
                  onToggleStar(email.id, event)
                }
                title={
                  email.starred
                    ? "Remove star"
                    : "Add star"
                }
              >
                {email.starred ? "★" : "☆"}
              </button>

              {/* Sender */}
              <div className="email-sender">
                {email.folder === "Sent" && email.recipient
                  ? `To: ${email.recipient}`
                  : email.sender}
              </div>

              {/* Subject + Preview */}
              <div className="email-content">

                <span className="email-subject">
                  {email.subject}
                </span>

                <span className="email-preview">
                  {" — "}
                  {email.preview}
                </span>

              </div>

              {/* Date / Time */}
              <div className="email-time">
                {email.time}
              </div>

            </div>
          ))
        )}

      </div>
    </div>
  );
}
