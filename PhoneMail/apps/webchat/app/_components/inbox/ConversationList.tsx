import type { Thread } from "../../_types/chat";

type ConversationListProps = {
  threads: Thread[];
  activeId: string;
  onOpen: (id: string) => void;
};

export function ConversationList({ threads, activeId, onOpen }: ConversationListProps) {
  return (
    <div className="conversation-list">
      <div className="list-label">MESSAGES <span>{threads.length}</span></div>
      {threads.map((thread) => {
        const latest = thread.messages[thread.messages.length - 1];
        const preview = latest ? `${latest.from === "me" ? "You: " : ""}${latest.text || (latest.attachments?.length ? "Attachment" : "")}` : "No messages yet";
        return (
          <button key={thread.id} className={`conversation ${activeId === thread.id ? "conversation-active" : ""}`} onClick={() => onOpen(thread.id)}>
            <span className={`avatar avatar-${thread.color}`}>{thread.initials}</span>
            <span className="conversation-copy">
              <span className="conversation-top">
                <span className="conversation-name"><strong>{thread.name}</strong>{thread.favorite && <span className="conversation-favorite" aria-hidden="true">★</span>}</span>
                <time>{thread.time}</time>
              </span>
              <span className="conversation-bottom"><span>{preview}</span>{thread.unread ? <span className="unread-count">{thread.unread}</span> : null}</span>
            </span>
          </button>
        );
      })}
      {threads.length === 0 && <p className="empty-state">No conversations found.</p>}
    </div>
  );
}
