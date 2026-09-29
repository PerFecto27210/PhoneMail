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

type EmailViewProps = {
  email: Email;

  onBack: () => void;

  onToggleStar: (
    id: number,
    event?: React.MouseEvent
  ) => void;

  onMarkUnread: () => void;

  onDelete: () => void;
  onRestore: () => void;

  showReplyBox: boolean;
  showForwardBox: boolean;

  replyText: string;
  forwardText: string;
  forwardTo: string;

  onShowReply: () => void;
  onShowForward: () => void;

  onReplyTextChange: (value: string) => void;
  onForwardTextChange: (value: string) => void;
  onForwardToChange: (value: string) => void;

  onSendReply: () => void;
  onSendForward: () => void;

  onCancelReply: () => void;
  onCancelForward: () => void;

  
  


};

export default function EmailView({
  email,
  onBack,
  onToggleStar,
  onMarkUnread,
  onDelete,
  onRestore,

  showReplyBox,
  showForwardBox,

  replyText,
  forwardText,
  forwardTo,

  onShowReply,
  onShowForward,

  onReplyTextChange,
  onForwardTextChange,
  onForwardToChange,

  onSendReply,
  onSendForward,

  onCancelReply,
  onCancelForward,
}: EmailViewProps) {
  return (
    <div className="email-view">

      {/* Email toolbar */}
      <div className="email-toolbar">

        <div className="email-toolbar-left">

          {/* Back */}
          <button
            className="email-action-button"
            onClick={onBack}
            title="Back"
          >
            ←
          </button>

          {/* Star */}
          <button
            className={`email-action-button ${
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

          {/* Mark unread */}
          <button
            className="email-action-button"
            onClick={onMarkUnread}
            title="Mark as unread"
          >
            ✉
          </button>

          {email.folder === "Trash" ? (
            <>
              <button
                className="email-action-button"
                onClick={onRestore}
                title="Restore to original folder"
                aria-label="Restore to original folder"
              >
                ↶
              </button>
              <button
                className="email-action-button"
                onClick={onDelete}
                title="Delete permanently"
                aria-label="Delete permanently"
              >
                🗑️
              </button>
            </>
          ) : (
            <button
              className="email-action-button"
              onClick={onDelete}
              title="Move to Trash"
              aria-label="Move to Trash"
            >
              🗑️
            </button>
          )}

        </div>

      </div>

      {/* Subject */}
      <div className="email-subject-row">
        <h1 className="email-view-subject">
          {email.subject}
        </h1>
      </div>

      {/* Sender */}
      <div className="sender-information">

        <div className="sender-avatar">
          {email.sender.charAt(0).toUpperCase()}
        </div>

        <div className="sender-details">

          <div className="sender-name">
            {email.folder === "Sent" && email.recipient
              ? `To: ${email.recipient}`
              : email.sender}
          </div>

          <div className="sender-email">
            {email.folder === "Sent" ? "Sent by you" : email.email}
          </div>

        </div>

        <div className="email-date">
          <div>{email.date}</div>
          <div>{email.time}</div>
        </div>

      </div>

      {/* Email body */}
      <div className="email-body">
        {email.body.split("\n").map((line, index) => (
          <p key={index}>
            {line || "\u00A0"}
          </p>
        ))}
      </div>

      {/* Reply / Forward buttons */}
      {!showReplyBox && !showForwardBox && (
        <div className="email-actions">

          <button
            className="reply-button"
            onClick={onShowReply}
          >
            ↩ Reply
          </button>

          <button
            className="reply-button"
            onClick={onShowForward}
          >
            ↪ Forward
          </button>

        </div>
      )}

      {/* Reply box */}
      {showReplyBox && (
        <div className="reply-box">

          <h3 className="reply-title">
            Reply to {email.sender}
          </h3>

          <div className="reply-recipient">
            {email.email}
          </div>

          <textarea
            value={replyText}
            onChange={(event) =>
              onReplyTextChange(event.target.value)
            }
            placeholder="Write your reply..."
          />

          <div className="reply-actions">

            <button
              className="cancel-button"
              onClick={onCancelReply}
            >
              Cancel
            </button>

            <button
              className="send-button"
              onClick={onSendReply}
              disabled={!replyText.trim()}
            >
              Send Reply
            </button>

          </div>

        </div>
      )}

      {/* Forward box */}
      {showForwardBox && (
        <div className="reply-box">

          <h3 className="reply-title">
            Forward Email
          </h3>

          <input
            className="forward-input"
            type="email"
            value={forwardTo}
            onChange={(event) =>
              onForwardToChange(event.target.value)
            }
            placeholder="Recipient email"
          />

          <textarea
            value={forwardText}
            onChange={(event) =>
              onForwardTextChange(event.target.value)
            }
            placeholder="Add a message..."
          />

          <div className="reply-actions">

            <button
              className="cancel-button"
              onClick={onCancelForward}
            >
              Cancel
            </button>

            <button
              className="send-button"
              onClick={onSendForward}
            >
              Forward
            </button>

          </div>

        </div>
      )}

    </div>
  );
}
