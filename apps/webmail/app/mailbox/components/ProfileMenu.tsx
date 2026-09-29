"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PROFILE,
  PROFILE_STORAGE_KEY,
  readProfile,
  saveProfile,
  type PhoneMailProfile,
} from "../../profile";

const THEME_STORAGE_KEY = "phonemail-theme";
type Theme = "light" | "dark";

function getProfileEmail(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? `${digits.slice(-10)}@phonemail.com` : "";
}

export default function ProfileMenu() {
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<PhoneMailProfile>(DEFAULT_PROFILE);
  const [draft, setDraft] = useState<PhoneMailProfile>(DEFAULT_PROFILE);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedProfile = readProfile();
    setProfile(storedProfile);
    setDraft(storedProfile);

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const openProfile = () => {
    setDraft(profile);
    setPhotoError("");
    setIsEditing(false);
    setIsOpen(true);
  };

  const closeProfile = () => setIsOpen(false);

  const saveChanges = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updatedProfile = {
      ...draft,
      name: draft.name.trim() || DEFAULT_PROFILE.name,
      email: getProfileEmail(draft.phone) || draft.email.trim(),
      phone: draft.phone.trim(),
    };
    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setDraft(updatedProfile);
    setIsEditing(false);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file to use as your profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError("Choose an image smaller than 3 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, photo: reader.result as string }));
        setPhotoError("");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const signOut = () => {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    setIsOpen(false);
    router.replace("/login");
  };

  const displayName = profile.name.trim() || DEFAULT_PROFILE.name;
  const profileEmail = getProfileEmail(profile.phone) || profile.email;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

  return (
    <>
      <button
        className="profile-button"
        type="button"
        onClick={openProfile}
        aria-label="Open profile"
        title="Profile and account"
      >
        <span className="profile-avatar" aria-hidden="true">
          {profile.photo ? <img src={profile.photo} alt="" /> : initials || "P"}
        </span>
      </button>

      {isOpen && (
        <div
          className="profile-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProfile();
          }}
        >
          <section
            className="profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <div className="profile-dialog-header">
              <div>
                <p className="profile-eyebrow">YOUR ACCOUNT</p>
                <h2 id="profile-title">Profile</h2>
              </div>
              <button
                className="profile-close"
                type="button"
                onClick={closeProfile}
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            <div className="profile-identity">
              <div className="profile-photo-wrap">
                <div className="profile-photo">
                  {draft.photo ? (
                    <img src={draft.photo} alt={`${displayName}'s profile`} />
                  ) : (
                    initials || "P"
                  )}
                </div>
                {isEditing && (
                  <>
                    <button
                      className="photo-edit-button"
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      aria-label="Change profile photo"
                    >
                      ✎
                    </button>
                    <input
                      ref={photoInput}
                      className="visually-hidden"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </>
                )}
              </div>
              <div className="profile-identity-copy">
                <strong>{displayName}</strong>
                <span>{profileEmail || "Add a phone number to create your address"}</span>
                <span className="profile-status">
                  <i aria-hidden="true" /> Account active
                </span>
              </div>
            </div>
            {photoError && <p className="profile-error" role="alert">{photoError}</p>}

            <div className="profile-theme-row">
              <div>
                <strong>Appearance</strong>
                <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
              </div>
              <button
                className="profile-theme-button"
                type="button"
                onClick={toggleTheme}
                aria-pressed={theme === "dark"}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>

            {isEditing ? (
              <form className="profile-form" onSubmit={saveChanges}>
                <label>
                  Full name
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    autoComplete="name"
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    value={draft.email}
                    readOnly
                    autoComplete="off"
                    placeholder="Enter a valid phone number"
                  />
                  <span>Your PhoneMail address is generated from your phone number.</span>
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => {
                      const phone = event.target.value;
                      setDraft({
                        ...draft,
                        phone,
                        email: getProfileEmail(phone),
                      });
                    }}
                    autoComplete="tel"
                    placeholder="Add a phone number"
                  />
                </label>
                <div className="profile-form-actions">
                  <button className="profile-secondary-button" type="button" onClick={() => {
                    setDraft(profile);
                    setIsEditing(false);
                  }}>
                    Cancel
                  </button>
                  <button className="profile-primary-button" type="submit">Save changes</button>
                </div>
              </form>
            ) : (
              <>
                <div className="profile-details">
                  <div className="profile-detail-row">
                    <span className="profile-detail-icon" aria-hidden="true">✉</span>
                    <div><span>Email address</span><strong>{profileEmail || "Add a phone number"}</strong></div>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-detail-icon" aria-hidden="true">☎</span>
                    <div><span>Phone number</span><strong>{profile.phone || "Not added"}</strong></div>
                  </div>
                </div>

                <button className="profile-edit-button" type="button" onClick={() => setIsEditing(true)}>
                  Edit profile
                </button>
                <div className="profile-security-note">
                  <span aria-hidden="true">🔒</span>
                  <p>Your profile details are saved on this device.</p>
                </div>
              </>
            )}

            <div className="profile-dialog-footer">
              <button className="profile-signout-button" type="button" onClick={signOut}>
                <span aria-hidden="true">↪</span> Sign out
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
