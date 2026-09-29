import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for authentication.`);
  return value;
}

export function getConvexAuth() {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL must be configured for authentication.");
  }

  return convexBetterAuthNextJs({
    convexUrl,
    convexSiteUrl: requiredEnv("CONVEX_SITE_URL"),
  });
}
