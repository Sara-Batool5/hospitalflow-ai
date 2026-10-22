
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

async function getAgentResult(
  baseUrl: string,
  endpoint: string
) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data.message || `${endpoint} failed.`
    );
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();

    // Stage 1: Load records once for Intake and Bottleneck Detection.
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

      if (
        !priorities.includes(
          String(record.priority ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid priority value.");
      }

      if (
        !statuses.includes(
          String(record.status ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid status value.");
      }

      if (
        !issueTypes.includes(
          String(record.issue_type ?? "").toLowerCase()
        )
      ) {
        findings.push("Invalid issue type.");
      }

      return {
        reference:
          record.synthetic_reference || "UNKNOWN-REFERENCE",
        title: record.title || "Untitled record",
        valid: findings.length === 0,
        findings,
        record,
      };
    });

    const validRecords = intakeResults
      .filter((item) => item.valid)
      .map((item) => item.record);

    const invalidRecords = intakeResults.filter(
      (item) => !item.valid
    );

    // Stage 3: Bottleneck Detection receives valid records only.
    const bottleneckFindings = validRecords.flatMap((record) => {
      const findings: {
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

    // Stage 4: Run the existing Coordinator, Communication,
    // and Audit endpoints and combine their results.
    const baseUrl = new URL(request.url).origin;

    const coordinatorData = await getAgentResult(
      baseUrl,
      "/api/agents/coordinator"
    );

    const communicationData = await getAgentResult(
      baseUrl,
      "/api/agents/communication"
    );

    const auditData = await getAgentResult(
      baseUrl,
      "/api/agents/audit"
    );

    if (
      !coordinatorData.summary ||
      !Array.isArray(coordinatorData.recommendations)
    ) {
      throw new Error(
        "Coordinator returned an unexpected response."
      );
    }

    if (
      !communicationData.summary ||
      !Array.isArray(communicationData.results)
    ) {
      throw new Error(
        "Communication Agent returned an unexpected response."
      );
    }

    if (
      !auditData.summary ||
      !Array.isArray(auditData.results)
    ) {
      throw new Error(
        "Audit Agent returned an unexpected response."
      );
    }

    // Stage 5: Return one combined five-agent workflow result.
    return NextResponse.json({
      ok: true,
      workflow: "HospitalFlow AI Demo Workflow",
      status:
        invalidRecords.length > 0 ||
        auditData.summary.requiringReview > 0
          ? "completed_with_review"
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
        {
          agent: "Workflow Coordinator",
          status: "completed",
          summary: coordinatorData.summary,
          recommendations: coordinatorData.recommendations,
        },
        {
          agent: "Communication Agent",
          status: "completed",
          summary: communicationData.summary,
          results: communicationData.results,
        },
        {
          agent: "Audit Agent",
          status: "completed",
          summary: auditData.summary,
          results: auditData.results,
        },
      ],

      routing: {
        validRecordsSentToDetection: validRecords.length,
        invalidRecordsHeldForCorrection: invalidRecords.length,
        coordinatorRecommendations:
          coordinatorData.summary.recommendationsGenerated,
        communicationDrafts:
          communicationData.summary.draftsGenerated,
        auditActionsReviewed:
          auditData.summary.actionsReviewed,
        auditItemsRequiringReview:
          auditData.summary.requiringReview,
      },

      safety: {
        messagesSent: false,
        operationalActionsExecuted: false,
        approvalDecisionsChanged: false,
      },
    });
  } catch (error) {
    console.error("Agent workflow failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The agent workflow could not be completed.",
      },
      { status: 500 }
    );
  }
}
