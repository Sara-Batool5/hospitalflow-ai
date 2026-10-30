import { NextResponse } from "next/server";
import { getSessionEmail } from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = await getSessionEmail();
  return NextResponse.json(
    { ok: true, email, mode: email ? "user" : "demo" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
