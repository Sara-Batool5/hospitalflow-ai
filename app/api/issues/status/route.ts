
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowedStatuses = {
  Open: "open",
  "In review": "investigating",
  Resolved: "resolved",
} as const;

type DisplayStatus = keyof typeof allowedStatuses;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const status = body?.status as DisplayStatus;

    if (
      !id ||
      !(status in allowedStatuses) ||
      !Object.prototype.hasOwnProperty.call(allowedStatuses, status)
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "A valid issue ID and status are required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let updateQuery = supabase
      .from("operational_issues")
      .update({
        status: allowedStatuses[status],
        updated_at: new Date().toISOString(),
      });

    if (uuidPattern.test(id)) {
      updateQuery = updateQuery.eq("id", id);
    } else {
      updateQuery = updateQuery.eq("synthetic_reference", id);
    }

    const { data: updatedIssue, error: updateError } = await updateQuery
      .select("id, synthetic_reference, status")
      .maybeSingle();

    if (updateError) {
      console.error("Issue status update failed:", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          message: "Could not update the issue status.",
        },
        { status: 500 }
      );
    }

    if (!updatedIssue) {
      return NextResponse.json(
        {
          ok: false,
          message: "Issue not found. Refresh the dashboard and try again.",
        },
        { status: 404 }
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        issue_id: updatedIssue.id,
        event_type: "issue_status_updated",
        actor_type: "system",
        details: {
          synthetic_reference: updatedIssue.synthetic_reference,
          new_status: updatedIssue.status,
          note:
            "Prototype status change; user identity is not authenticated.",
        },
      });

    if (auditError) {
      console.error("Audit log insert failed:", {
        message: auditError.message,
        code: auditError.code,
        details: auditError.details,
        hint: auditError.hint,
      });

      return NextResponse.json({
        ok: true,
        warning: "Status changed, but the audit entry could not be saved.",
        issue: updatedIssue,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Issue status updated successfully.",
      issue: updatedIssue,
    });
  } catch (error) {
    console.error("Issue status request failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Invalid request or status update failed.",
      },
      { status: 400 }
    );
  }
}
