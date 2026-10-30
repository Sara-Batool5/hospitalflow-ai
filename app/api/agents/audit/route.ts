
import { NextResponse } from "next/server";
import { getScopedSupabase } from "../../../../lib/supabaseScoped";

export const dynamic = "force-dynamic";

type WorkflowAction = {
  id: string;
  issue_id: string;
  action_type: string;
  description: string;
  status: string;
  requires_human_approval: boolean;
  created_at: string;
  completed_at: string | null;
};

type AuditLog = {
  id: string;
  issue_id: string | null;
  action_id: string | null;
  event_type: string;
  actor_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await getScopedSupabase();

    const [actionsResponse, logsResponse] = await Promise.all([
      supabase
        .from("workflow_actions")
        .select(
          "id, issue_id, action_type, description, status, requires_human_approval, created_at, completed_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("audit_logs")
        .select(
          "id, issue_id, action_id, event_type, actor_type, details, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (actionsResponse.error || logsResponse.error) {
      console.error(
        "Audit Agent query failed:",
        actionsResponse.error?.message ??
          logsResponse.error?.message
      );

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load workflow actions and audit records.",
        },
        { status: 500 }
      );
    }

    const actions = (actionsResponse.data ?? []) as WorkflowAction[];
    const logs = (logsResponse.data ?? []) as AuditLog[];

    const results = actions.map((action) => {
      const findings: string[] = [];
      const status = String(action.status ?? "").toLowerCase();

      const relatedLogs = logs.filter(
        (log) => log.action_id === action.id
      );

      const hasApprovalRecord = relatedLogs.some(
        (log) =>
          log.event_type === "demo_approval_approved" &&
          log.details?.decision === "approve"
      );

      const hasRejectionRecord = relatedLogs.some(
        (log) =>
          log.event_type === "demo_approval_rejected" &&
          log.details?.decision === "reject"
      );

      if (
        action.requires_human_approval &&
        ["pending", "awaiting_approval", "requires_human_approval"].includes(
          status
        )
      ) {
        findings.push(
          "Human approval is still required. Do not execute this action."
        );
      }

      if (
        action.requires_human_approval &&
        status === "approved" &&
        !hasApprovalRecord
      ) {
        findings.push(
          "Approval record was not found in the audit trail."
        );
      }

      if (
        action.requires_human_approval &&
        status === "cancelled" &&
        !hasRejectionRecord
      ) {
        findings.push(
          "Rejection record was not found in the audit trail."
        );
      }

      if (
        action.requires_human_approval &&
        status === "completed" &&
        !hasApprovalRecord
      ) {
        findings.push(
          "Completed action has no recorded approval evidence."
        );
      }

      let decision = "PASS";

      if (findings.length > 0) {
        decision = "REVIEW_REQUIRED";
      }

      return {
        actionId: action.id,
        issueId: action.issue_id,
        actionType: action.action_type,
        description: action.description,
        status: action.status,
        requiresHumanApproval: action.requires_human_approval,
        auditEventsFound: relatedLogs.length,
        decision,
        findings,
      };
    });

    const flaggedResults = results.filter(
      (item) => item.decision === "REVIEW_REQUIRED"
    );

    return NextResponse.json({
      ok: true,
      agent: "Audit Agent",
      message: "Workflow audit checks completed.",
      summary: {
        actionsReviewed: actions.length,
        auditEventsReviewed: logs.length,
        passed: results.length - flaggedResults.length,
        requiringReview: flaggedResults.length,
      },
      results,
      safety: {
        databaseModified: false,
        actionsExecuted: false,
        approvalDecisionsChanged: false,
      },
    });
  } catch (error) {
    console.error("Audit Agent failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The Audit Agent could not complete its checks.",
      },
      { status: 500 }
    );
  }
}
