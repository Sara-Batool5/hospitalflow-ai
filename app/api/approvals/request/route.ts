import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const PENDING_STATUSES = [
  "pending",
  "awaiting_approval",
  "requires_human_approval",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function actionTypeFor(issueType: string | null) {
  if (issueType === "bed_status_mismatch") return "status_verification";
  return "department_follow_up";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const issueKey =
      typeof body?.issueId === "string" ? body.issueId.trim() : "";

    if (!issueKey) {
      return NextResponse.json(
        { ok: false, message: "A valid issue ID is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let issueQuery = supabase
      .from("operational_issues")
      .select("id, title, issue_type, status, department_id, synthetic_reference");

    issueQuery = uuidPattern.test(issueKey)
      ? issueQuery.eq("id", issueKey)
      : issueQuery.eq("synthetic_reference", issueKey);

    const { data: issue, error: issueError } = await issueQuery.maybeSingle();

    if (issueError) throw issueError;

    if (!issue) {
      return NextResponse.json(
        { ok: false, message: "Issue not found. Refresh and try again." },
        { status: 404 }
      );
    }

    if (["resolved", "dismissed"].includes(issue.status)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Resolved issues cannot be sent for approval.",
        },
        { status: 409 }
      );
    }

    // Prevent duplicate pending requests for the same issue.
    const { data: existing, error: existingError } = await supabase
      .from("workflow_actions")
      .select("id")
      .eq("issue_id", issue.id)
      .eq("requires_human_approval", true)
      .in("status", PENDING_STATUSES)
      .limit(1);

    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "An approval request is already pending for this issue.",
        },
        { status: 409 }
      );
    }

    const basePayload = {
      issue_id: issue.id,
      action_type: actionTypeFor(issue.issue_type),
      description: `Approval requested for: ${issue.title}. Demo only; no real-world task will be executed.`,
      requires_human_approval: true,
      assigned_department_id: issue.department_id ?? null,
    };

    // Try "pending" first; fall back if the database uses a different value.
    let inserted: { id: string; status: string } | null = null;
    let lastError: { message: string; code?: string; details?: string | null; hint?: string | null } | null = null;

    for (const status of ["pending", "awaiting_approval", "requires_human_approval"]) {
      const { data, error } = await supabase
        .from("workflow_actions")
        .insert({ ...basePayload, status })
        .select("id, status")
        .maybeSingle();

      if (!error && data) {
        inserted = data;
        break;
      }
      lastError = error;
    }

    if (!inserted) {
      console.error("Approval request insert failed:", lastError);
      return NextResponse.json(
        {
          ok: false,
          message: `Could not create the approval request. Database said: ${
            lastError?.message ?? "unknown error"
          }${lastError?.hint ? " (hint: " + lastError.hint + ")" : ""}`,
        },
        { status: 500 }
      );
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      issue_id: issue.id,
      action_id: inserted.id,
      event_type: "approval_requested",
      actor_type: "system",
      details: {
        source: "HospitalFlow AI synthetic demo",
        synthetic_reference: issue.synthetic_reference ?? null,
        note: "Approval requested; no real-world task was executed.",
      },
    });

    if (auditError) {
      console.error("Approval request audit failed:", auditError.message);
    }

    return NextResponse.json({
      ok: true,
      message: "Approval request created. Check the Approvals section.",
      warning: auditError
        ? "Request created, but its audit entry could not be saved."
        : undefined,
      approval: inserted,
    });
  } catch (error) {
    console.error("Approval request failed:", error);
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : "unknown error";
    return NextResponse.json(
      {
        ok: false,
        message: `Could not create the approval request. Details: ${detail}`,
      },
      { status: 500 }
    );
  }
}
