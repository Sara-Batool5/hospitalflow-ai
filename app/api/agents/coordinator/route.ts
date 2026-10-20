
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type IssueRecord = {
  id: string;
  title: string;
  description: string | null;
  issue_type: string;
  priority: string;
  status: string;
  synthetic_reference: string | null;
  departments:
    | { name: string }
    | { name: string }[]
    | null;
};

function getDepartmentName(
  departments: IssueRecord["departments"]
): string {
  if (Array.isArray(departments)) {
    return departments[0]?.name ?? "Assigned department";
  }

  return departments?.name ?? "Assigned department";
}

function recommendNextStep(issue: IssueRecord) {
  const priority = String(issue.priority).toLowerCase();
  const status = String(issue.status).toLowerCase();
  const type = String(issue.issue_type).toLowerCase();
  const department = getDepartmentName(issue.departments);

  if (["resolved", "dismissed"].includes(status)) {
    return {
      action: "No further action required",
      reason: `The issue is already marked ${status}.`,
      assignedDepartment: department,
      urgency: "None",
      requiresHumanReview: false,
    };
  }

  if (status === "awaiting_approval") {
    return {
      action: "Follow up with the authorized approver",
      reason:
        "A decision is pending. Obtain approval before proceeding with the proposed action.",
      assignedDepartment: department,
      urgency: priority === "critical" ? "High" : "Medium",
      requiresHumanReview: true,
    };
  }

  if (priority === "critical") {
    return {
      action: "Escalate for immediate human review",
      reason:
        "The unresolved issue has critical priority and needs prompt assessment by authorized staff.",
      assignedDepartment: department,
      urgency: "High",
      requiresHumanReview: true,
    };
  }

  if (type === "discharge_delay") {
    return {
      action: "Verify the outstanding discharge documentation",
      reason:
        "Confirm which administrative documents remain outstanding and route the follow-up to authorized staff.",
      assignedDepartment: department,
      urgency: priority === "high" ? "High" : "Medium",
      requiresHumanReview: true,
    };
  }

  if (type === "bed_status_mismatch") {
    return {
      action: "Request bed-status verification",
      reason:
        "Ask authorized Bed Management staff to reconcile the recorded status with their verified operational information.",
      assignedDepartment: department,
      urgency: priority === "high" ? "High" : "Medium",
      requiresHumanReview: true,
    };
  }

  if (type === "diagnostic_delay") {
    return {
      action: "Check diagnostic report delivery status",
      reason:
        "Ask the responsible department to confirm report availability and acknowledge any outstanding administrative delay.",
      assignedDepartment: department,
      urgency: priority === "high" ? "High" : "Medium",
      requiresHumanReview: true,
    };
  }

  if (type === "pending_referral") {
    return {
      action: "Confirm referral coordination status",
      reason:
        "Ask the responsible administrative team to confirm referral receipt and identify any outstanding coordination step.",
      assignedDepartment: department,
      urgency: priority === "high" ? "High" : "Medium",
      requiresHumanReview: true,
    };
  }

  return {
    action: "Review the issue and determine the next administrative step",
    reason:
      "The issue requires assessment by its assigned department before further action.",
    assignedDepartment: department,
    urgency: priority === "high" ? "High" : "Medium",
    requiresHumanReview: true,
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("operational_issues")
      .select(
        "id, title, description, issue_type, priority, status, synthetic_reference, departments(name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Workflow Coordinator query failed:", error.message);

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load issues for coordination.",
        },
        { status: 500 }
      );
    }

    const records = (data ?? []) as unknown as IssueRecord[];

    const recommendations = records.map((issue) => ({
      reference: issue.synthetic_reference ?? issue.id,
      title: issue.title,
      priority: issue.priority,
      status: issue.status,
      recommendation: recommendNextStep(issue),
    }));

    const actionRequired = recommendations.filter(
      (item) => item.recommendation.requiresHumanReview
    );

    const noActionRequired = recommendations.length - actionRequired.length;

    return NextResponse.json({
      ok: true,
      agent: "Workflow Coordinator",
      message: "Operational recommendations generated successfully.",
      summary: {
        totalRecords: recommendations.length,
        recommendationsGenerated: recommendations.length,
        actionRequired: actionRequired.length,
        noActionRequired,
      },
      recommendations,
      safety: {
        databaseModified: false,
        actionsExecuted: false,
        humanReviewRequiredForProposedActions: true,
      },
    });
  } catch (error) {
    console.error("Workflow Coordinator failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The Workflow Coordinator could not complete its analysis.",
      },
      { status: 500 }
    );
  }
}
