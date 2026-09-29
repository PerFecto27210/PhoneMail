export type PhoneMailProfile = {
  name: string;
  email: string;
  phone: string;
  photo: string;
};

export const PROFILE_STORAGE_KEY = "phonemail-profile";

export const DEFAULT_PROFILE: PhoneMailProfile = {
  name: "PhoneMail User",
  email: "",
  phone: "",
  photo: "",
};

export function getPhoneMailAddress(phone: unknown): string {
  const digits = String(phone ?? "").replace(/\D/g, "");

  // The mailbox address uses the 10-digit phone number, even when the
  // stored phone also includes a country code or formatting characters.
  return digits.length >= 10 ? `${digits.slice(-10)}@phonemail.com` : "";
}

export function readProfile(): PhoneMailProfile {
  try {
    const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!storedProfile) return DEFAULT_PROFILE;

    const parsedProfile = JSON.parse(storedProfile) as Partial<PhoneMailProfile>;
    const profile = {
      ...DEFAULT_PROFILE,
      ...parsedProfile,
      phone: String(parsedProfile.phone ?? ""),
    };
    return {
      ...profile,
      email: getPhoneMailAddress(profile.phone) || profile.email,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PhoneMailProfile) {
  const updatedProfile = {
    ...profile,
    email: getPhoneMailAddress(profile.phone) || profile.email,
  };
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
}
