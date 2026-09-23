import { MailIcon } from "../icons";

type ComposeDialogProps = { onClose: () => void };

export function ComposeDialog({ onClose }: ComposeDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="modal-icon"><MailIcon /></span>
        <h2 id="compose-title">New message</h2>
        <p>Start a conversation with a phone number.</p>
        <input autoFocus placeholder="Phone number or email" aria-label="Recipient phone number or email" />
        <button className="modal-primary" onClick={onClose}>Continue</button>
      </section>
    </div>
  );
}
