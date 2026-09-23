import type { Thread } from "../../_types/chat";

type ContactProfileDialogProps = { thread: Thread; onClose: () => void };

export function ContactProfileDialog({ thread, onClose }: ContactProfileDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="compose-modal contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-name" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close profile">×</button>
        <span className={`avatar avatar-large avatar-${thread.color}`}>{thread.initials}</span>
        <h2 id="contact-name">{thread.name}</h2>
        <p className="contact-address">{thread.email}</p>
        <dl className="contact-details">
          <div><dt>Phone number</dt><dd>+91 {thread.email.split("@")[0]}</dd></div>
          <div><dt>PhoneMail address</dt><dd>{thread.email}</dd></div>
        </dl>
      </section>
    </div>
  );
}
