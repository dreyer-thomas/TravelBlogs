import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicTripEntryView = (pathname: string) => {
  if (pathname.startsWith("/entries/")) {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 2;
  }

  if (pathname.startsWith("/trips/share/")) {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length === 3;
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

  if (pathname === "/sign-in") {
    return false;
  }

  if (publicTripEntryView(pathname)) {
    return false;
  }

  if (pathname.startsWith("/trips")) {
    return true;
  }

  if (pathname.startsWith("/entries")) {
    return true;
  }

  if (pathname.startsWith("/api/trips")) {
    return true;
  }

  if (pathname.startsWith("/api/entries")) {
    return true;
  }

  if (pathname.startsWith("/api/media/upload")) {
    return true;
  }

  return false;
};

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  if (token) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
};

export const config = {
  matcher: [
    "/trips/:path*",
    "/entries/:path*",
    "/api/trips/:path*",
    "/api/entries/:path*",
    "/api/media/upload",
  ],
};
