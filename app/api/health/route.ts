
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [
      { count: departmentCount, error: departmentError },
      { count: issueCount, error: issueError },
      { count: actionCount, error: actionError },
    ] = await Promise.all([
      supabase
        .from("departments")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("operational_issues")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("workflow_actions")
        .select("id", { count: "exact", head: true }),
    ]);

    if (departmentError || issueError || actionError) {
      console.error("Supabase health check failed.");

      return NextResponse.json(
        { ok: false, message: "Database query failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "HospitalFlow AI database connection successful.",
      counts: {
        departments: departmentCount,
        operationalIssues: issueCount,
        workflowActions: actionCount,
      },
    });
  } catch (error) {
    console.error(
      "HospitalFlow AI database connection failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { ok: false, message: "Database connection is not configured or failed." },
      { status: 500 }
    );
  }
}
