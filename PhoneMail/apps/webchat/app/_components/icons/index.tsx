export function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v11h-17z" /><path d="m4 7 8 6 8-6" /></svg>;
}

export function PhoneMailLogo() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path className="brand-logo-shape" d="M5 5h22v17c0 10.5 7.1 18 17 19H22C12.6 41 5 33.4 5 24V5Z" /><path className="brand-logo-window" d="M16 16h19v14H16z" /><path className="brand-logo-flap" d="m17 17 8.5 6 8.5-6" /></svg>;
}

export function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

export function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.5 18-3.7-7.8L2 9.5 21 3Z" /><path d="M9.8 13.2 21 3" /></svg>;
}

export function FileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" /><path d="M13 3v7h7M8 14h8m-8 4h8" /></svg>;
}

export function StarIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.02l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86L12 3.5Z" fill={filled ? "currentColor" : "none"} /></svg>;
}

export function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return theme === "dark"
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z" /></svg>;
}
