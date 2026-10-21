
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
    return departments[0]?.name ?? "the responsible department";
  }

  return departments?.name ?? "the responsible department";
}

function createDraft(issue: IssueRecord, department: string) {
  const reference =
    issue.synthetic_reference ?? "Unassigned reference";

  let request = "review the issue and advise on the next administrative step";

  switch (issue.issue_type) {
    case "discharge_delay":
      request =
        "verify the outstanding discharge documentation and advise what administrative follow-up is needed";
      break;

    case "bed_status_mismatch":
      request =
        "verify the recorded bed status against authorized operational information and report any discrepancy";
      break;

    case "diagnostic_delay":
      request =
        "confirm the administrative status of the delayed diagnostic report and identify any outstanding delivery step";
      break;

    case "pending_referral":
      request =
        "confirm receipt and coordination status of the referral and identify any outstanding administrative step";
      break;
  }

  const subject = `Follow-up required: ${reference}`;

  const body = [
    `Hello ${department},`,
    "",
    `A follow-up is requested for the operational issue "${issue.title}" (${reference}).`,
    "",
    `Priority: ${issue.priority}`,
    `Current status: ${issue.status}`,
    "",
    `Please ${request}.`,
    "",
    "Please review the relevant information through your authorized hospital workflow and update the appropriate team as necessary.",
    "",
    "This message is a draft for authorized staff review. Please verify the details and approve it before sending.",
    "",
    "Regards,",
    "Hospital Operations Coordination",
  ].join("\n");

  return { subject, body };
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
      console.error("Communication Agent query failed:", error.message);

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load issues for communication drafting.",
        },
        { status: 500 }
      );
    }

    const records = (data ?? []) as unknown as IssueRecord[];

    const results = records.map((issue) => {
      const status = String(issue.status ?? "").toLowerCase();
      const department = getDepartmentName(issue.departments);
      const reference = issue.synthetic_reference ?? issue.id;

      if (["resolved", "dismissed"].includes(status)) {
        return {
          reference,
          title: issue.title,
          department,
          status: "skipped",
          reason: `The issue is ${status}; no follow-up draft is needed.`,
          draft: null,
          requiresHumanReview: false,
        };
      }

      const draft = createDraft(issue, department);

      return {
        reference,
        title: issue.title,
        department,
        status: "draft_ready",
        reason: "A follow-up draft is ready for authorized staff review.",
        draft,
        requiresHumanReview: true,
      };
    });

    const drafts = results.filter(
      (item) => item.status === "draft_ready"
    );

    return NextResponse.json({
      ok: true,
      agent: "Communication Agent",
      message: "Communication draft preparation completed.",
      summary: {
        totalRecords: records.length,
        draftsGenerated: drafts.length,
        recordsSkipped: results.length - drafts.length,
        draftsRequiringReview: drafts.length,
      },
      results,
      safety: {
        messagesSent: false,
        databaseModified: false,
        humanApprovalRequiredBeforeSending: true,
      },
    });
  } catch (error) {
    console.error("Communication Agent failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The Communication Agent could not complete drafting.",
      },
      { status: 500 }
    );
  }
}
