
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type AuditEvent = {
  id: string;
  issue_id: string | null;
  action_id: string | null;
  event_type: string;
  actor_type: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, issue_id, action_id, event_type, actor_type, details, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Could not load audit history:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load audit history from the database.",
        },
        { status: 500 }
      );
    }

    const events = (data ?? []) as AuditEvent[];

    const issueIds = [
      ...new Set(
        events
          .map((event) => event.issue_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const referenceById = new Map<string, string>();

    if (issueIds.length > 0) {
      const { data: issues, error: issuesError } = await supabase
        .from("operational_issues")
        .select("id, synthetic_reference")
        .in("id", issueIds);

      if (issuesError) {
        console.error("Could not load audit issue references:", {
          message: issuesError.message,
          code: issuesError.code,
          details: issuesError.details,
          hint: issuesError.hint,
        });

        return NextResponse.json(
          {
            ok: false,
            message: "Could not load issue references for audit history.",
          },
          { status: 500 }
        );
      }

      for (const issue of issues ?? []) {
        if (issue.synthetic_reference) {
          referenceById.set(
            issue.id,
            String(issue.synthetic_reference)
          );
        }
      }
    }

    const enrichedEvents = events.map((event) => {
      const details =
        event.details &&
        typeof event.details === "object" &&
        !Array.isArray(event.details)
          ? event.details
          : {};

      const savedReference =
        typeof details.synthetic_reference === "string"
          ? details.synthetic_reference
          : null;

      const databaseReference = event.issue_id
        ? referenceById.get(event.issue_id) ?? null
        : null;

      return {
        ...event,
        details: {
          ...details,
          synthetic_reference: savedReference ?? databaseReference,
        },
      };
    });

    return NextResponse.json(
      {
        ok: true,
        events: enrichedEvents,
        count: enrichedEvents.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Audit history service is unavailable:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Audit history service is temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
