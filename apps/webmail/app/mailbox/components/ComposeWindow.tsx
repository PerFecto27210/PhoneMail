"use client";

import { useRef, useState } from "react";

type ComposeEmail = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};

type ComposeWindowProps = {
  compose: ComposeEmail;

  composeMinimized: boolean;

  showCc: boolean;
  showBcc: boolean;

  composeError: string;

  attachments: File[];

  onClose: () => void;

  onMinimize: () => void;

  onRestore: () => void;

  onToggleCc: () => void;

  onToggleBcc: () => void;

  onUpdateCompose: (
    field: keyof ComposeEmail,
    value: string
  ) => void;

  onSend: () => void;

  onSaveDraft: () => void;

  onAttachment: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  onRemoveAttachment: (index: number) => void;
};

export default function ComposeWindow({
  compose,
  composeMinimized,

  showCc,
  showBcc,

  composeError,

  attachments,

  onClose,
  onMinimize,
  onRestore,

  onToggleCc,
  onToggleBcc,

  onUpdateCompose,

  onSend,
  onSaveDraft,

  onAttachment,
  onRemoveAttachment,
}: ComposeWindowProps) {
  const composeWindowRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const startDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;

    const bounds = composeWindowRef.current?.getBoundingClientRect();
    if (!bounds) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: bounds.left,
      startTop: bounds.top,
    };
    setPosition({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    });
  };

  const moveComposeWindow = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const composeWindow = composeWindowRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !composeWindow) return;

    const maxLeft = Math.max(0, window.innerWidth - composeWindow.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - composeWindow.offsetHeight);
    setPosition((current) => current ? {
      ...current,
      left: Math.min(maxLeft, Math.max(0, drag.startLeft + event.clientX - drag.startX)),
      top: Math.min(maxTop, Math.max(0, drag.startTop + event.clientY - drag.startY)),
    } : current);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /* =====================================================
     MINIMIZED COMPOSE WINDOW
  ===================================================== */

  if (composeMinimized) {
    return (
      <div className="compose-minimized">
        <button
          className="compose-minimized-restore"
          type="button"
          onClick={onRestore}
        >
          New Message
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close minimized compose"
          title="Close"
        >
          ×
        </button>
      </div>
    );
  }

  /* =====================================================
     FULL COMPOSE WINDOW
  ===================================================== */

  return (
    <section
      ref={composeWindowRef}
      className="compose-window"
      style={position ? {
        left: position.left,
        top: position.top,
        width: position.width,
        right: "auto",
        bottom: "auto",
      } : undefined}
      role="dialog"
      aria-labelledby="compose-title"
    >

      {/* Header */}

      <div
        className="compose-header"
        onPointerDown={startDragging}
        onPointerMove={moveComposeWindow}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >

        <div className="compose-title" id="compose-title">
          New Message
        </div>

        <div className="compose-header-actions">

          <button
            type="button"
            onClick={onMinimize}
            title="Minimize"
          >
            −
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>

        </div>

      </div>


      {/* Compose body */}

      <div className="compose-body">

        {/* To */}

        <div className="compose-field">

          <input
            type="email"
            placeholder="Recipients"
            value={compose.to}
            onChange={(event) =>
              onUpdateCompose(
                "to",
                event.target.value
              )
            }
          />

          <div className="recipient-options">

            <button
              type="button"
              onClick={onToggleCc}
            >
              Cc
            </button>

            <button
              type="button"
              onClick={onToggleBcc}
            >
              Bcc
            </button>

          </div>

        </div>


        {/* Cc */}

        {showCc && (
          <div className="compose-field">

            <input
              type="email"
              placeholder="Cc"
              value={compose.cc}
              onChange={(event) =>
                onUpdateCompose(
                  "cc",
                  event.target.value
                )
              }
            />

          </div>
        )}


        {/* Bcc */}

        {showBcc && (
          <div className="compose-field">

            <input
              type="email"
              placeholder="Bcc"
              value={compose.bcc}
              onChange={(event) =>
                onUpdateCompose(
                  "bcc",
                  event.target.value
                )
              }
            />

          </div>
        )}


        {/* Subject */}

        <div className="compose-field">

          <input
            type="text"
            placeholder="Subject"
            value={compose.subject}
            onChange={(event) =>
              onUpdateCompose(
                "subject",
                event.target.value
              )
            }
          />

        </div>


        {/* Message */}

        <textarea
          className="compose-message"
          placeholder="Write your message..."
          value={compose.body}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              onSend();
            }
          }}
          onChange={(event) =>
            onUpdateCompose(
              "body",
              event.target.value
            )
          }
        />


        {/* Attachments */}

        {attachments.length > 0 && (
          <div className="attachment-list">

            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="attachment-item"
              >

                <span>
                  📎 {file.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onRemoveAttachment(index)
                  }
                >
                  ×
                </button>

              </div>
            ))}

          </div>
        )}


        {/* Error */}

        {composeError && (
          <div className="compose-error">
            {composeError}
          </div>
        )}

      </div>


      {/* Footer */}

      <div className="compose-footer">

        <div className="compose-footer-left">

          {/* Send */}

          <button
            type="button"
            className="send-button"
            onClick={onSend}
            title="Send with Ctrl+Enter or ⌘+Enter"
          >
            Send
          </button>


          {/* Attachment */}

          <label
            className="attachment-button"
            title="Attach files"
          >

            📎

            <input
              type="file"
              multiple
              hidden
              onChange={onAttachment}
            />

          </label>

        </div>


        {/* Character count */}

        <span className="character-count">
          {compose.body.length} / 5000
        </span>


        {/* Save draft */}

        <button
          type="button"
          className="draft-button"
          onClick={onSaveDraft}
        >
          Save Draft
        </button>

      </div>

    </section>
  );
}
