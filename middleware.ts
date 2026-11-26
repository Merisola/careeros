import { NextRequest, NextResponse } from "next/server";
// /api/* uses bearer token (checked in routes). Everything else: basic auth.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const h = req.headers.get("authorization") ?? "";
  if (h.startsWith("Basic ") && atob(h.slice(6)) === `meron:${process.env.APP_PASSWORD}`) return NextResponse.next();
  return new NextResponse("Login required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="CareerOS"' } });
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
