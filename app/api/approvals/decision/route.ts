
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { approvalId, decision } = body;

    if (
      typeof approvalId !== "string" ||
      !["approve", "reject"].includes(decision)
    ) {
      return NextResponse.json(
        { ok: false, message: "Invalid approval decision." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Only allow decisions on the two seeded synthetic demo actions.
    const allowedDemoIds = [
      "30000000-0000-4000-8000-000000000001",
      "30000000-0000-4000-8000-000000000002",
    ];

    if (!allowedDemoIds.includes(approvalId)) {
      return NextResponse.json(
        { ok: false, message: "This is not an approved demo record." },
        { status: 403 }
      );
    }

    const { data: existing, error: lookupError } = await supabase
      .from("workflow_actions")
      .select("id, status, requires_human_approval")
      .eq("id", approvalId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (
      !existing ||
      existing.requires_human_approval !== true ||
      !["pending", "awaiting_approval", "requires_human_approval"].includes(
        existing.status
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "This approval has already been decided or is unavailable.",
        },
        { status: 409 }
      );
    }

    const newStatus = decision === "approve" ? "approved" : "cancelled";

    const { data: updated, error: updateError } = await supabase
      .from("workflow_actions")
      .update({
        status: newStatus,
        completed_at: new Date().toISOString(),
      })
      .eq("id", approvalId)
      .eq("status", existing.status)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          message: "The record changed. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        action_id: approvalId,
        event_type:
          decision === "approve"
            ? "demo_approval_approved"
            : "demo_approval_rejected",
        actor_type: "system",
        details: {
          decision,
          source: "HospitalFlow AI synthetic demo",
          note:
            decision === "approve"
              ? "Demo approval recorded; no real-world task was executed."
              : "Demo rejection recorded; no real-world task was executed.",
        },
      });

    if (auditError) {
      console.error("Approval audit insert failed:", auditError.message);

      return NextResponse.json(
        {
          ok: false,
          message:
            "The decision was saved, but its audit entry failed. Check Reports & Audit before retrying.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        decision === "approve"
          ? "Demo approval recorded."
          : "Demo rejection recorded.",
      approval: updated,
    });
  } catch (error) {
    console.error("Approval decision failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Could not save the approval decision.",
      },
      { status: 500 }
    );
  }
}
