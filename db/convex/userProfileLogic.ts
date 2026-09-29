export function normalizeProfileName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 40 ? name : null;
}

export function isProfileAvatar(value: string): boolean {
  return /^avatar-[1-8]$/.test(value);
}

export type SearchableUser = {
  _id: string;
  name?: string;
  profileImage?: string;
  phoneNumber: string;
};

export function toPublicSearchUsers(users: SearchableUser[], currentUserId: string) {
  const seen = new Set<string>();
  const results: Array<{ _id: string; name: string | null; avatarUrl: string | null; phoneNumber: string }> = [];
  for (const user of users) {
    if (user._id === currentUserId || seen.has(user._id)) continue;
    seen.add(user._id);
    results.push({
      _id: user._id,
      name: user.name ?? null,
      avatarUrl: user.profileImage ?? null,
      phoneNumber: user.phoneNumber,
    });
  }
  return results.slice(0, 20);
}
