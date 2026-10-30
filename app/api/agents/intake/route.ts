
import { NextResponse } from "next/server";
import { getScopedSupabase } from "../../../../lib/supabaseScoped";

export const dynamic = "force-dynamic";

const allowedPriorities = [
  "low",
  "medium",
  "high",
  "critical",
];

const allowedStatuses = [
  "open",
  "investigating",
  "awaiting_approval",
  "resolved",
  "dismissed",
];

const allowedIssueTypes = [
  "discharge_delay",
  "bed_status_mismatch",
  "diagnostic_delay",
  "pending_referral",
  "other",
];

export async function GET() {
  try {
    const supabase = await getScopedSupabase();

    const { data, error } = await supabase
      .from("operational_issues")
      .select(
        "id, title, description, issue_type, priority, status, synthetic_reference, department_id, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Intake Agent query failed:", error.message);

      return NextResponse.json(
        {
          ok: false,
          message: "The Intake Agent could not load records.",
        },
        { status: 500 }
      );
    }

    const records = data ?? [];

    const results = records.map((record) => {
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

      if (
        !allowedPriorities.includes(
          String(record.priority ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid priority value.");
      }

      if (
        !allowedStatuses.includes(
          String(record.status ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid status value.");
      }

      if (
        !allowedIssueTypes.includes(
          String(record.issue_type ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid issue type.");
      }

      return {
        reference: record.synthetic_reference,
        title: record.title,
        valid: findings.length === 0,
        findings,
      };
    });

    const validCount = results.filter(
      (record) => record.valid
    ).length;

    const invalidCount = results.length - validCount;

    return NextResponse.json({
      ok: true,
      agent: "Intake Agent",
      message: "Record validation completed.",
      summary: {
        totalRecords: results.length,
        validRecords: validCount,
        invalidRecords: invalidCount,
      },
      results,
    });
  } catch (error) {
    console.error("Intake Agent failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "The Intake Agent encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}
