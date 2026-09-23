import type { Message, Thread } from "../../_types/chat";
import { FileIcon } from "../icons";
import { formatFileSize } from "../../_lib/format-file-size";

type ChatMessagesProps = {
  thread: Thread;
  messages: Message[];
  searching: boolean;
};

export function ChatMessages({ thread, messages, searching }: ChatMessagesProps) {
  return (
    <div className="message-area">
      <div className="thread-intro">
        <span className={`avatar avatar-large avatar-${thread.color}`}>{thread.initials}</span>
        <h2>{thread.name}</h2>
        <p>{thread.email}</p>
        <span className="conversation-start">This is the beginning of your conversation</span>
      </div>
      {thread.messages.length > 0 && <div className="message-date">TODAY</div>}
      <div className="messages">
        {messages.map((message) => (
          <article key={message.id} className={`message-row ${message.from === "me" ? "message-row-mine" : ""}`}>
            <div className={`message-bubble ${message.from === "me" ? "message-mine" : ""}`}>
              {message.text && <p>{message.text}</p>}
              {message.attachments && message.attachments.length > 0 && <div className="message-attachments">
                {message.attachments.map((attachment) => (
                  <a className="message-attachment" key={attachment.id} href={attachment.dataUrl} download={attachment.name}>
                    {attachment.type.startsWith("image/") ? <img src={attachment.dataUrl} alt={attachment.name} /> : <span className="attachment-file-icon"><FileIcon /></span>}
                    <span><strong>{attachment.name}</strong><small>{formatFileSize(attachment.size)}</small></span>
                  </a>
                ))}
              </div>}
              <time>{message.time}</time>
            </div>
          </article>
        ))}
        {searching && messages.length === 0 && <p className="empty-state chat-search-empty">No matching messages.</p>}
      </div>
    </div>
  );
}
