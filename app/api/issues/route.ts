
import { NextResponse } from "next/server";
import { getScopedSupabase } from "../../../lib/supabaseScoped";

export const dynamic = "force-dynamic";

function formatAge(createdAt: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  );

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function mapIssueType(type: string) {
  switch (type) {
    case "discharge_delay":
      return {
        category: "Discharge",
        icon: "file" as const,
        recommendation:
          "Ask Discharge Coordination to verify the outstanding administrative documentation.",
      };
    case "bed_status_mismatch":
      return {
        category: "Bed management",
        icon: "bed" as const,
        recommendation:
          "Request authorized staff to verify the bed status before changing any record.",
      };
    case "diagnostic_delay":
      return {
        category: "Diagnostics",
        icon: "report" as const,
        recommendation:
          "Ask the responsible department to confirm report delivery and acknowledgment.",
      };
    case "pending_referral":
      return {
        category: "Referral",
        icon: "referral" as const,
        recommendation:
          "Prepare a referral follow-up request for human review.",
      };
    default:
      return {
        category: "Other",
        icon: "report" as const,
        recommendation:
          "Ask the responsible department to verify this operational issue.",
      };
  }
}

export async function GET() {
  try {
    const supabase = await getScopedSupabase();

    const { data, error } = await supabase
      .from("operational_issues")
      .select(`
        id,
        title,
        description,
        issue_type,
        priority,
        status,
        synthetic_reference,
        created_at,
        departments (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not retrieve operational issues.");
      return NextResponse.json(
        { ok: false, message: "Could not load operational issues." },
        { status: 500 }
      );
    }

    const issues = (data ?? []).map((row: any) => {
      const typeDetails = mapIssueType(row.issue_type);

      const departmentData = Array.isArray(row.departments)
        ? row.departments[0]
        : row.departments;

      const status =
        row.status === "resolved" || row.status === "dismissed"
          ? "Resolved"
          : row.status === "investigating" ||
              row.status === "awaiting_approval"
            ? "In review"
            : "Open";

      const validPriority = ["critical", "high", "medium", "low"].includes(
        row.priority
      )
        ? row.priority
        : "medium";

      return {
        id: row.synthetic_reference || row.id,
        title: row.title,
        description: row.description,
        category: typeDetails.category,
        department: departmentData?.name || "Unassigned",
        priority:
          validPriority.charAt(0).toUpperCase() + validPriority.slice(1),
        status,
        age: formatAge(row.created_at),
        ageMinutes: Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(row.created_at).getTime()) / 60000
          )
        ),
        icon: typeDetails.icon,
        recommendation: typeDetails.recommendation,
      };
    });

    return NextResponse.json({ ok: true, issues });
  } catch (error) {
    console.error(
      "Issues API failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { ok: false, message: "The issues service is unavailable." },
      { status: 500 }
    );
  }
}
