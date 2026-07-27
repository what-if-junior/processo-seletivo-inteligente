import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_FLAG = "psi.admin.authenticated";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authed = request.cookies.get(AUTH_FLAG)?.value === "1";
  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
