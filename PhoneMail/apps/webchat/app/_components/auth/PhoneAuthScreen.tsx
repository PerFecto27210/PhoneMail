import type { ChangeEventHandler, FocusEventHandler, FormEventHandler } from "react";
import { PhoneMailLogo, ThemeIcon } from "../icons";
import { SavedPhoneSuggestions } from "./SavedPhoneSuggestions";

type PhoneAuthScreenProps = {
  screen: "login" | "otp";
  authMode: "signin" | "signup";
  theme: "light" | "dark";
  phoneNumber: string;
  otp: string;
  demoPin: string;
  busy: boolean;
  error: string;
  savedPhoneSuggestions: string[];
  onThemeToggle: () => void;
  onPhoneChange: ChangeEventHandler<HTMLInputElement>;
  onPhoneFocus: () => void;
  onPhoneEntryBlur: FocusEventHandler<HTMLDivElement>;
  onSelectSavedPhone: (phone: string) => void;
  onPhoneFormSubmit: FormEventHandler<HTMLFormElement>;
  onOtpChange: ChangeEventHandler<HTMLInputElement>;
  onOtpFormSubmit: FormEventHandler<HTMLFormElement>;
  onChangeNumber: () => void;
};

export function PhoneAuthScreen({
  screen, authMode, theme, phoneNumber, otp, savedPhoneSuggestions,
  demoPin, busy, error,
  onThemeToggle, onPhoneChange, onPhoneFocus, onPhoneEntryBlur, onSelectSavedPhone,
  onPhoneFormSubmit, onOtpChange, onOtpFormSubmit, onChangeNumber,
}: PhoneAuthScreenProps) {
  const validPhone = phoneNumber.replace(/\D/g, "").length >= 10;
  const validOtp = otp.length === 6;

  return (
    <main className="auth-shell">
      <button className="theme-toggle auth-theme-toggle" onClick={onThemeToggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}><ThemeIcon theme={theme} /></button>
      <section className="auth-card">
        <div className="auth-branding">
          <a className="brand auth-brand" href="#" aria-label="PhoneMail home">
            <span className="brand-mark brand-logo-mark"><PhoneMailLogo /></span>
            <span className="brand-wordmark"><span className="brand-phone">Phone</span><span className="brand-mail">Mail</span></span>
          </a>
        </div>
        {screen === "login" ? (
          <>
            <p className="eyebrow auth-eyebrow">PHONE MAIL</p>
            <h1>Continue with your number</h1>
            <p className="auth-description">We’ll check whether you already have a PhoneMail account.</p>
            <form className="auth-form" autoComplete="off" onSubmit={onPhoneFormSubmit}>
              <label htmlFor="phone-number">Phone number</label>
              <div className="phone-entry" onBlur={onPhoneEntryBlur}>
                <div className="phone-input-wrap">
                  <span className="country-code">+91</span>
                  <input id="phone-number" name="phone" type="tel" inputMode="numeric" autoComplete="off" placeholder="98765 43210" value={phoneNumber} onFocus={onPhoneFocus} onChange={onPhoneChange} />
                </div>
                <SavedPhoneSuggestions phones={savedPhoneSuggestions} onSelect={onSelectSavedPhone} />
              </div>
              <button className="auth-primary" type="submit" disabled={!validPhone || busy}>{busy ? "Sending code…" : "Continue"}</button>
            </form>
            <p className="auth-footnote">By continuing, you agree to the Terms of Service.</p>
          </>
        ) : (
          <>
            <button className="auth-back" onClick={onChangeNumber}>← <span>Change number</span></button>
            <p className="eyebrow auth-eyebrow">{authMode === "signup" ? "NEW ACCOUNT" : "WELCOME BACK"}</p>
            <h1>{authMode === "signup" ? "Create your account" : "Sign in to PhoneMail"}</h1>
            <p className="auth-description">{authMode === "signup" ? "Verify your number to finish setting up PhoneMail." : "Verify your number to continue to your inbox."} Code sent to <strong>+91 {phoneNumber}</strong>.</p>
            <form className="auth-form" onSubmit={onOtpFormSubmit}>
              <label htmlFor="otp-code">Verification code</label>
              <input className="otp-input" id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={onOtpChange} />
              <button className="auth-primary" type="submit" disabled={!validOtp || busy}>{busy ? "Verifying…" : authMode === "signup" ? "Verify and create account" : "Verify and sign in"}</button>
            </form>
            {demoPin && <p className="auth-footnote">Demo code: <strong>{demoPin}</strong></p>}
          </>
        )}
        {error && <p className="convex-demo-error" role="alert">{error}</p>}
      </section>
      <p className="auth-caption">A calmer inbox, connected to your number.</p>
    </main>
  );
}
