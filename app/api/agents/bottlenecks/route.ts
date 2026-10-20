
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("operational_issues")
      .select(
        "id, title, description, issue_type, priority, status, synthetic_reference, department_id, created_at, departments(name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Bottleneck Detection query failed:", error.message);

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load records for bottleneck detection.",
        },
        { status: 500 }
      );
    }

    const records = data ?? [];

    const findings = records.flatMap((record) => {
      const results: {
        reference: string;
        title: string;
        severity: string;
        finding: string;
      }[] = [];

      const reference =
        record.synthetic_reference || "UNKNOWN-REFERENCE";

      const title = record.title || "Untitled record";

      const status = String(record.status ?? "").toLowerCase();
      const priority = String(record.priority ?? "").toLowerCase();

      if (!record.description?.trim()) {
        results.push({
          reference,
          title,
          severity: "Medium",
          finding: "Missing issue description.",
        });
      }

      if (!record.department_id) {
        results.push({
          reference,
          title,
          severity: "High",
          finding: "No department is assigned to this issue.",
        });
      }

      if (
        priority === "critical" &&
        !["resolved", "dismissed"].includes(status)
      ) {
        results.push({
          reference,
          title,
          severity: "High",
          finding: "Critical issue requires prompt human review.",
        });
      } else if (
        priority === "high" &&
        !["resolved", "dismissed"].includes(status)
      ) {
        results.push({
          reference,
          title,
          severity: "Medium",
          finding: "High-priority issue remains unresolved.",
        });
      }

      if (status === "awaiting_approval") {
        results.push({
          reference,
          title,
          severity: "Medium",
          finding: "Issue is awaiting an approval decision.",
        });
      }

      if (
        status &&
        ![
          "open",
          "investigating",
          "awaiting_approval",
          "resolved",
          "dismissed",
        ].includes(status)
      ) {
        results.push({
          reference,
          title,
          severity: "Medium",
          finding: "Issue has an unrecognized status.",
        });
      }

      return results;
    });

    const uniqueFindings = findings.filter(
      (finding, index, all) =>
        all.findIndex(
          (item) =>
            item.reference === finding.reference &&
            item.finding === finding.finding
        ) === index
    );

    return NextResponse.json({
      ok: true,
      agent: "Bottleneck Detection",
      message: "Bottleneck analysis completed.",
      summary: {
        totalRecords: records.length,
        bottlenecksFound: uniqueFindings.length,
        recordsFlagged: new Set(
          uniqueFindings.map((item) => item.reference)
        ).size,
      },
      findings: uniqueFindings,
    });
  } catch (error) {
    console.error("Bottleneck Detection failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Bottleneck detection encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}
