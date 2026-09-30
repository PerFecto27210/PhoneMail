import { NextResponse, type NextRequest } from "next/server";

const mobilePhoneUserAgent = /Android.*Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i;

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (!mobilePhoneUserAgent.test(userAgent)) {
    return NextResponse.next();
  }

  const configuredWebchatUrl = process.env.WEBCHAT_URL?.trim();
  let destination: URL;

  if (configuredWebchatUrl) {
    destination = new URL(configuredWebchatUrl);
  } else if (process.env.NODE_ENV === "development") {
    const host = request.headers.get("host");
    if (!host) return NextResponse.next();
    destination = new URL(`http://${host}`);
    destination.port = "3000";
  } else {
    return NextResponse.next();
  }

  destination.pathname = "/";
  destination.search = "";
  destination.hash = "";

  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
