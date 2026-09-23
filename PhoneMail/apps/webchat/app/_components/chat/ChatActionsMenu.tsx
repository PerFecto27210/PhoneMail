type ChatActionsMenuProps = {
  blocked: boolean;
  onSearch: () => void;
  onClear: () => void;
  onToggleBlock: () => void;
};

export function ChatActionsMenu({ blocked, onSearch, onClear, onToggleBlock }: ChatActionsMenuProps) {
  return (
    <div className="chat-actions-menu" role="menu" aria-label="Conversation actions">
      <button type="button" role="menuitem" onClick={onSearch}>Search in chat</button>
      <button type="button" role="menuitem" onClick={onClear}>Clear chat</button>
      <button className={blocked ? "chat-action-unblock" : "chat-action-block"} type="button" role="menuitem" onClick={onToggleBlock}>
        {blocked ? "Unblock chat" : "Block chat"}
      </button>
    </div>
  );
}
