import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

function getAuthHandler() {
  const convexUrl = process.env.CONVEX_URL;
  const convexSiteUrl = process.env.CONVEX_SITE_URL;
  if (!convexUrl || !convexSiteUrl) {
    throw new Error("CONVEX_URL and CONVEX_SITE_URL must be configured for authentication.");
  }
  return convexBetterAuthNextJs({ convexUrl, convexSiteUrl }).handler;
}

export async function GET(request: Request): Promise<Response> {
  return getAuthHandler().GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return getAuthHandler().POST(request);
}
