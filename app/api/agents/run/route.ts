
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const priorities = ["low", "medium", "high", "critical"];

const statuses = [
  "open",
  "investigating",
  "awaiting_approval",
  "resolved",
  "dismissed",
];

const issueTypes = [
  "discharge_delay",
  "bed_status_mismatch",
  "diagnostic_delay",
  "pending_referral",
  "other",
];

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Stage 1: Load the records once for this workflow run.
    const { data, error } = await supabase
      .from("operational_issues")
      .select(
        "id, title, description, issue_type, priority, status, synthetic_reference, department_id, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Workflow data loading failed:", error.message);

      return NextResponse.json(
        { ok: false, message: "Could not load workflow records." },
        { status: 500 }
      );
    }

    const records = data ?? [];

    // Stage 2: Intake Agent validates every record.
    const intakeResults = records.map((record) => {
      const findings: string[] = [];

      if (!record.title?.trim()) {
        findings.push("Missing issue title.");
      }

      if (!record.description?.trim()) {
        findings.push("Missing issue description.");
      }

      if (!record.synthetic_reference?.trim()) {
        findings.push("Missing synthetic reference.");
      }

      if (!record.department_id) {
        findings.push("No department assigned.");
      }

      if (!priorities.includes(
        String(record.priority ?? "").toLowerCase()
      )) {
        findings.push("Invalid priority value.");
      }

      if (!statuses.includes(
        String(record.status ?? "").toLowerCase()
      )) {
        findings.push("Invalid status value.");
      }

      if (!issueTypes.includes(
        String(record.issue_type ?? "").toLowerCase()
      )) {
        findings.push("Invalid issue type.");
      }

      return {
        reference: record.synthetic_reference || "UNKNOWN-REFERENCE",
        title: record.title || "Untitled record",
        valid: findings.length === 0,
        findings,
        record,
      };
    });

    const validRecords = intakeResults
      .filter((item) => item.valid)
      .map((item) => item.record);

    const invalidRecords = intakeResults.filter((item) => !item.valid);

    // Stage 3: Bottleneck Detection receives only valid records.
    const bottleneckFindings = validRecords.flatMap((record) => {
      const findings: {
        reference: string;
        title: string;
        severity: string;
        finding: string;
      }[] = [];

      const reference = record.synthetic_reference || "UNKNOWN-REFERENCE";
      const title = record.title || "Untitled record";
      const status = String(record.status ?? "").toLowerCase();
      const priority = String(record.priority ?? "").toLowerCase();

      if (
        priority === "critical" &&
        !["resolved", "dismissed"].includes(status)
      ) {
        findings.push({
          reference,
          title,
          severity: "High",
          finding: "Critical issue requires prompt human review.",
        });
      } else if (
        priority === "high" &&
        !["resolved", "dismissed"].includes(status)
      ) {
        findings.push({
          reference,
          title,
          severity: "Medium",
          finding: "High-priority issue remains unresolved.",
        });
      }

      if (status === "awaiting_approval") {
        findings.push({
          reference,
          title,
          severity: "Medium",
          finding: "Issue is awaiting an approval decision.",
        });
      }

      return findings;
    });

    // Stage 4: Return the shared workflow result.
    return NextResponse.json({
      ok: true,
      workflow: "HospitalFlow AI Demo Workflow",
      status: invalidRecords.length > 0
        ? "completed_with_validation_issues"
        : "completed",
      stages: [
        {
          agent: "Intake Agent",
          status: "completed",
          totalRecords: records.length,
          validRecords: validRecords.length,
          invalidRecords: invalidRecords.length,
          results: intakeResults.map(
            ({ record, ...result }) => result
          ),
        },
        {
          agent: "Bottleneck Detection",
          status: "completed",
          inputRecords: validRecords.length,
          bottlenecksFound: bottleneckFindings.length,
          recordsFlagged: new Set(
            bottleneckFindings.map((item) => item.reference)
          ).size,
          findings: bottleneckFindings,
        },
      ],
      routing: {
        validRecordsSentToDetection: validRecords.length,
        invalidRecordsHeldForCorrection: invalidRecords.length,
      },
    });
  } catch (error) {
    console.error("Agent workflow failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The agent workflow could not be completed.",
      },
      { status: 500 }
    );
  }
}
