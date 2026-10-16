
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, issue_id, action_id, event_type, actor_type, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Could not load audit history.");

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load audit history.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      events: data ?? [],
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Audit history service is unavailable.",
      },
      { status: 500 }
    );
  }
}
