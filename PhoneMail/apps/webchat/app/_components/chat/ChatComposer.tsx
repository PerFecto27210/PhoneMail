import type { ChangeEventHandler, FormEventHandler, RefObject } from "react";
import type { MessageAttachment } from "../../_types/chat";
import { FileIcon, SendIcon } from "../icons";
import { formatFileSize } from "../../_lib/format-file-size";

type ChatComposerProps = {
  blocked: boolean;
  draft: string;
  attachments: MessageAttachment[];
  uploadsInProgress: number;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  onDraftChange: (draft: string) => void;
  onRemoveAttachment: (id: string) => void;
  onAddAttachments: ChangeEventHandler<HTMLInputElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function ChatComposer({
  blocked, draft, attachments, uploadsInProgress, attachmentInputRef,
  onDraftChange, onRemoveAttachment, onAddAttachments, onSubmit,
}: ChatComposerProps) {
  return (
    <>
      {blocked && <div className="blocked-chat-notice" role="status">This chat is blocked. Unblock it from conversation actions to send messages.</div>}
      <form className={`composer ${blocked ? "composer-blocked" : ""}`} onSubmit={onSubmit}>
        {attachments.length > 0 && <div className="attachment-preview-list" aria-label="Selected attachments">
          {attachments.map((attachment) => (
            <span className="attachment-preview" key={attachment.id}>
              <span className="attachment-file-icon"><FileIcon /></span>
              <span className="attachment-preview-copy"><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)}</small></span>
              <button type="button" onClick={() => onRemoveAttachment(attachment.id)} aria-label={`Remove ${attachment.name}`}>×</button>
            </span>
          ))}
        </div>}
        <button type="button" className="icon-button attach-button" aria-label="Add attachment" onClick={() => attachmentInputRef.current?.click()} disabled={blocked}>＋</button>
        <input value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={blocked ? "Chat is blocked" : "Write a message..."} aria-label="Write a message" disabled={blocked} />
        <button type="submit" className="send-button" aria-label="Send message" disabled={blocked || uploadsInProgress > 0 || (!draft.trim() && attachments.length === 0)}><SendIcon /></button>
        <input ref={attachmentInputRef} className="attachment-file-input" type="file" multiple onChange={onAddAttachments} aria-label="Choose attachments" disabled={blocked} />
      </form>
      <p className="composer-hint">Emails to this conversation stay together</p>
    </>
  );
}
