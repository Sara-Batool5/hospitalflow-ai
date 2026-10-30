import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/session";

export const dynamic = "force-dynamic";

// "Continue as Demo": clears any user session, then opens the shared demo data.
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
