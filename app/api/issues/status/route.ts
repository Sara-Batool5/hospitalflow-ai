
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowedStatuses = {
  Open: "open",
  "In review": "investigating",
  Resolved: "resolved",
} as const;

type DisplayStatus = keyof typeof allowedStatuses;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;
    const status = body?.status as DisplayStatus;

    if (
      typeof id !== "string" ||
      !id.startsWith("DEMO-") ||
      !(status in allowedStatuses)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "A valid demo issue ID and status are required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: updatedIssue, error: updateError } = await supabase
      .from("operational_issues")
      .update({
        status: allowedStatuses[status],
        updated_at: new Date().toISOString(),
      })
      .eq("synthetic_reference", id)
      .like("synthetic_reference", "DEMO-%")
      .select("id, synthetic_reference, status")
      .maybeSingle();

    if (updateError) {
      console.error("Demo issue status update failed.");

      return NextResponse.json(
        { ok: false, message: "Could not update the issue status." },
        { status: 500 }
      );
    }

    if (!updatedIssue) {
      return NextResponse.json(
        { ok: false, message: "Demo issue not found." },
        { status: 404 }
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        issue_id: updatedIssue.id,
        event_type: "demo_status_updated",
        actor_type: "system",
        details: {
          synthetic_reference: updatedIssue.synthetic_reference,
          new_status: updatedIssue.status,
          note: "Prototype status change; user identity is not authenticated.",
        },
      });

    if (auditError) {
      console.error("Audit log insert failed:", auditError.message);

      return NextResponse.json(
        {
          ok: true,
          warning: "Status changed, but the audit entry could not be saved.",
          issue: updatedIssue,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Demo issue status updated.",
      issue: updatedIssue,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request or status update failed." },
      { status: 400 }
    );
  }
}
