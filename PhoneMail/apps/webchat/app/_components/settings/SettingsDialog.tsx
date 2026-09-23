import type { ChangeEvent, FormEvent } from "react";

type SettingsDialogProps = {
  profileName: string;
  profilePicture: string;
  theme: "light" | "dark";
  phoneNumber: string;
  activeSessionPhone: string | null;
  onNameChange: (name: string) => void;
  onPhotoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onPhotoRemove: () => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function SettingsDialog({
  profileName, profilePicture, theme, phoneNumber, activeSessionPhone,
  onNameChange, onPhotoUpload, onPhotoRemove, onThemeChange, onSave, onCancel,
}: SettingsDialogProps) {
  return (
    <div className="modal-backdrop settings-backdrop" role="presentation" onClick={onCancel}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onCancel} aria-label="Close settings">×</button>
        <p className="eyebrow">ACCOUNT PREFERENCES</p>
        <h2 id="settings-title">Settings</h2>
        <form onSubmit={onSave}>
          <div className="settings-avatar-row">
            <span className={`settings-avatar ${profilePicture ? "settings-avatar-image" : ""}`} style={profilePicture ? { backgroundImage: `url(${profilePicture})` } : undefined}>
              {profilePicture ? "" : profileName.slice(0, 1).toUpperCase()}
            </span>
            <div className="settings-avatar-actions">
              <strong>Profile picture</strong>
              <label className="upload-picture">{profilePicture ? "Change photo" : "Upload photo"}<input type="file" accept="image/*" onChange={onPhotoUpload} /></label>
              {profilePicture && <button className="remove-picture" type="button" onClick={onPhotoRemove}>Remove</button>}
            </div>
          </div>
          <label className="settings-field">Display name<input value={profileName} maxLength={60} onChange={(event) => onNameChange(event.target.value)} placeholder="Your name" /></label>
          <div className="settings-account"><span>Phone number</span><strong>+91 {phoneNumber || activeSessionPhone || "Not set"}</strong></div>
          <label className="settings-field">Appearance<select value={theme} onChange={(event) => onThemeChange(event.target.value as "light" | "dark")}><option value="light">Light</option><option value="dark">Dark</option></select></label>
          <div className="settings-actions"><button className="settings-cancel" type="button" onClick={onCancel}>Cancel</button><button className="modal-primary" type="submit">Save changes</button></div>
        </form>
      </section>
    </div>
  );
}
