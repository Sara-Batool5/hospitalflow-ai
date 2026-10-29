
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("workflow_actions")
      .select(`
        id,
        issue_id,
        action_type,
        description,
        status,
        requires_human_approval,
        assigned_department_id,
        created_at,
        completed_at,
        operational_issues (
          synthetic_reference,
          title,
          priority,
          status
        ),
        departments:assigned_department_id (
          name
        )
      `)
      .eq("requires_human_approval", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load approval actions:", error.message);

      return NextResponse.json(
        { ok: false, message: "Could not load approval actions." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      approvals: data ?? [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Approval service is unavailable." },
      { status: 500 }
    );
  }
}
