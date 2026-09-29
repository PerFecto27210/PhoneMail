import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;
  const isConversationRoute =
    pathname === "/conversation" || pathname.startsWith("/conversation/");
  const isOnboardingRoute = pathname.startsWith("/onboarding/");
  const isProfileRoute = pathname === "/profile" || pathname.startsWith("/profile/");

  if ((isConversationRoute || isOnboardingRoute || isProfileRoute) && !sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    pathname === "/" &&
    sessionCookie &&
    request.nextUrl.searchParams.get("session") !== "expired"
  ) {
    return NextResponse.redirect(new URL("/conversation", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/conversation/:path*", "/onboarding/:path*", "/profile/:path*"],
};
