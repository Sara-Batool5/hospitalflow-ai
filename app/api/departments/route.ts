
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [departmentsResult, issuesResult] = await Promise.all([
      supabase
        .from("departments")
        .select("id, name, description")
        .order("name", { ascending: true }),

      supabase
        .from("operational_issues")
        .select("department_id, status"),
    ]);

    if (departmentsResult.error || issuesResult.error) {
      console.error(
        "Department data error:",
        departmentsResult.error?.message ||
          issuesResult.error?.message
      );

      return NextResponse.json(
        { ok: false, message: "Could not load department data." },
        { status: 500 }
      );
    }

    const issues = issuesResult.data ?? [];

    const departments = (departmentsResult.data ?? []).map(
      (department) => {
        const relatedIssues = issues.filter(
          (issue) => issue.department_id === department.id
        );

        const openIssues = relatedIssues.filter((issue) =>
          ["open", "investigating", "awaiting_approval"].includes(
            issue.status
          )
        ).length;

        return {
          ...department,
          totalIssues: relatedIssues.length,
          openIssues,
        };
      }
    );

    return NextResponse.json({ ok: true, departments });
  } catch (error) {
    console.error("Department API failed:", error);

    return NextResponse.json(
      { ok: false, message: "Department service is unavailable." },
      { status: 500 }
    );
  }
}
