import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicTripEntryView = (pathname: string) => {
  if (pathname.startsWith("/trips/share/")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 3) {
      return true;
    }
    return segments.length === 5 && segments[3] === "entries";
  }

  if (pathname.startsWith("/trips/view/")) {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 3;
  }

  if (pathname.startsWith("/trips/")) {
    return false;
  }

  return false;
};

const isProtectedPath = (pathname: string) => {
  if (pathname.startsWith("/api/auth")) {
    return false;
  }

  if (pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname === "/sign-in") {
    return false;
  }

  if (publicTripEntryView(pathname)) {
    return false;
  }

  if (pathname === "/account/password") {
    return true;
  }

  if (pathname.startsWith("/trips")) {
    return true;
  }

  if (pathname.startsWith("/entries")) {
    return true;
  }

  return false;
};

const getCallbackUrl = (request: NextRequest) =>
  `${request.nextUrl.pathname}${request.nextUrl.search}`;

const isAllowedMustChangeApi = (pathname: string) => {
  if (pathname.startsWith("/api/auth")) {
    return true;
  }

  if (pathname.startsWith("/api/users/") && pathname.endsWith("/password")) {
    return true;
  }

  return false;
};

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request });
  if (token?.mustChangePassword) {
    if (
      pathname !== "/account/password" &&
      pathname !== "/sign-in" &&
      !isAllowedMustChangeApi(pathname)
    ) {
      const passwordUrl = new URL("/account/password", request.url);
      passwordUrl.searchParams.set("callbackUrl", getCallbackUrl(request));
      return NextResponse.redirect(passwordUrl);
    }
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (token) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", getCallbackUrl(request));
  return NextResponse.redirect(signInUrl);
};

export const config = {
  matcher: [
    "/trips/:path*",
    "/entries/:path*",
    "/account/:path*",
    "/api/:path*",
  ],
};
