export const AVATAR_OPTIONS = [
  { value: "avatar-1", color: "#d9efe2", label: "Sage" },
  { value: "avatar-2", color: "#e8def5", label: "Lilac" },
  { value: "avatar-3", color: "#dcebf7", label: "Sky" },
  { value: "avatar-4", color: "#f5e8cc", label: "Honey" },
  { value: "avatar-5", color: "#f4dfe2", label: "Rose" },
  { value: "avatar-6", color: "#d9ecea", label: "Mint" },
  { value: "avatar-7", color: "#f3e2d3", label: "Peach" },
  { value: "avatar-8", color: "#e4e6f6", label: "Periwinkle" },
] as const;

export function avatarColor(value?: string) {
  return AVATAR_OPTIONS.find((avatar) => avatar.value === value)?.color ?? AVATAR_OPTIONS[0].color;
}
