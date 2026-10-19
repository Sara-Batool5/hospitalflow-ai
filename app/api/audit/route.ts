
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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
      console.error("Could not load audit history:", error.message);

      return NextResponse.json(
        {
          ok: false,
          message: "Could not load audit history.",
        },
        { status: 500 }
      );
    }

    const events = data ?? [];

    const issueIds = [
      ...new Set(
        events
          .map((event) => event.issue_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    let referenceById = new Map<string, string>();

    if (issueIds.length > 0) {
      const { data: issues, error: issuesError } = await supabase
        .from("operational_issues")
        .select("id, synthetic_reference")
        .in("id", issueIds);

      if (issuesError) {
        console.error(
          "Could not load audit issue references:",
          issuesError.message
        );

        return NextResponse.json(
          {
            ok: false,
            message: "Could not load audit issue references.",
          },
          { status: 500 }
        );
      }

      referenceById = new Map(
        (issues ?? [])
          .filter((issue) => Boolean(issue.synthetic_reference))
          .map((issue) => [issue.id, issue.synthetic_reference as string])
      );
    }

    const enrichedEvents = events.map((event) => {
      const details =
        event.details &&
        typeof event.details === "object" &&
        !Array.isArray(event.details)
          ? (event.details as Record<string, unknown>)
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

    return NextResponse.json({
      ok: true,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error("Audit history service is unavailable:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Audit history service is unavailable.",
      },
      { status: 500 }
    );
  }
}
