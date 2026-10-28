import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ImportRow = {
  reference: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  status: string;
  issue_type: string;
};

const allowedPriorities = new Set(["low", "medium", "high", "critical"]);
const allowedStatuses = new Set([
  "open",
  "investigating",
  "awaiting_approval",
  "resolved",
  "dismissed",
]);
const allowedIssueTypes = new Set([
  "discharge_delay",
  "bed_status_mismatch",
  "diagnostic_delay",
  "pending_referral",
  "other",
]);

export async function POST(request: Request) {
  let createdIssueIds: string[] = [];
  let batchId: string | null = null;

  try {
    const body = await request.json();
    const filename = String(body?.filename ?? "").trim();
    const rows = body?.rows as ImportRow[] | undefined;

    if (!filename || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "A filename and at least one valid CSV row are required." },
        { status: 400 }
      );
    }

    if (rows.length > 2000) {
      return NextResponse.json(
        { ok: false, message: "A maximum of 2,000 records can be imported at once." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const [departmentsResult, existingResult] = await Promise.all([
      supabase.from("departments").select("id, name"),
      supabase.from("operational_issues").select("synthetic_reference"),
    ]);

    if (departmentsResult.error || existingResult.error) {
      console.error(
        "CSV import lookup failed:",
        departmentsResult.error?.message || existingResult.error?.message
      );
      return NextResponse.json(
        { ok: false, message: "Could not verify departments or existing references." },
        { status: 500 }
      );
    }

    const departmentByName = new Map(
      (departmentsResult.data ?? []).map((department) => [
        String(department.name).trim().toLowerCase(),
        { id: department.id, name: department.name },
      ])
    );
    const existingReferences = new Set(
      (existingResult.data ?? [])
        .map((record) => String(record.synthetic_reference ?? "").trim().toLowerCase())
        .filter(Boolean)
    );
    const seenReferences = new Set<string>();
    const validationErrors: string[] = [];

    rows.forEach((row, index) => {
      const reference = String(row?.reference ?? "").trim();
      const title = String(row?.title ?? "").trim();
      const description = String(row?.description ?? "").trim();
      const department = String(row?.department ?? "").trim();
      const priority = String(row?.priority ?? "").trim().toLowerCase();
      const status = String(row?.status ?? "").trim().toLowerCase();
      const issueType = String(row?.issue_type ?? "").trim().toLowerCase();
      const rowLabel = `Row ${index + 2}`;

      if (!reference || !title || !description || !department) {
        validationErrors.push(`${rowLabel}: reference, title, description, and department are required.`);
      }
      if (!allowedPriorities.has(priority)) validationErrors.push(`${rowLabel}: invalid priority.`);
      if (!allowedStatuses.has(status)) validationErrors.push(`${rowLabel}: invalid status.`);
      if (!allowedIssueTypes.has(issueType)) validationErrors.push(`${rowLabel}: invalid issue_type.`);
      if (department && !departmentByName.has(department.toLowerCase())) {
        validationErrors.push(`${rowLabel}: unknown department "${department}".`);
      }

      const normalizedReference = reference.toLowerCase();
      if (normalizedReference && existingReferences.has(normalizedReference)) {
        validationErrors.push(`${rowLabel}: reference "${reference}" already exists.`);
      }
      if (normalizedReference && seenReferences.has(normalizedReference)) {
        validationErrors.push(`${rowLabel}: reference "${reference}" is duplicated in this import.`);
      }
      if (normalizedReference) seenReferences.add(normalizedReference);
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Some rows failed server-side validation. Nothing was imported.",
          errors: validationErrors.slice(0, 50),
          totalErrors: validationErrors.length,
        },
        { status: 400 }
      );
    }

    const batchResult = await supabase
      .from("upload_batches")
      .insert({
        original_filename: filename.slice(0, 255),
        total_records: rows.length,
        valid_records: rows.length,
        invalid_records: 0,
        imported_records: 0,
        status: "validated",
      })
      .select("id")
      .single();

    if (batchResult.error || !batchResult.data) {
      console.error("Could not create CSV upload batch:", batchResult.error?.message);
      return NextResponse.json(
        { ok: false, message: "Could not create the upload batch." },
        { status: 500 }
      );
    }
    batchId = batchResult.data.id;

    const issuePayload = rows.map((row) => {
      const department = departmentByName.get(String(row.department).trim().toLowerCase());
      return {
        title: String(row.title).trim(),
        description: String(row.description).trim(),
        issue_type: String(row.issue_type).trim().toLowerCase(),
        priority: String(row.priority).trim().toLowerCase(),
        status: String(row.status).trim().toLowerCase(),
        synthetic_reference: String(row.reference).trim(),
        department_id: department!.id,
      };
    });

    const issuesResult = await supabase
      .from("operational_issues")
      .insert(issuePayload)
      .select("id");

    if (issuesResult.error || !issuesResult.data || issuesResult.data.length !== rows.length) {
      console.error("CSV issue insertion failed:", issuesResult.error?.message);
      await supabase.from("upload_batches").delete().eq("id", batchId);
      return NextResponse.json(
        {
          ok: false,
          message: "The records could not be imported. Please check the CSV values and try again.",
        },
        { status: 500 }
      );
    }

    createdIssueIds = issuesResult.data.map((issue) => issue.id);

    const links = createdIssueIds.map((issueId) => ({
      batch_id: batchId,
      issue_id: issueId,
    }));
    const linksResult = await supabase.from("upload_batch_issues").insert(links);

    if (linksResult.error) {
      console.error("CSV batch linking failed:", linksResult.error.message);
      await supabase.from("operational_issues").delete().in("id", createdIssueIds);
      await supabase.from("upload_batches").delete().eq("id", batchId);
      return NextResponse.json(
        { ok: false, message: "Could not link imported issues to the upload batch. The import was rolled back." },
        { status: 500 }
      );
    }

    const updateBatchResult = await supabase
      .from("upload_batches")
      .update({
        imported_records: createdIssueIds.length,
        status: "imported",
      })
      .eq("id", batchId);

    if (updateBatchResult.error) {
      console.error("CSV batch status update failed:", updateBatchResult.error.message);
      return NextResponse.json(
        {
          ok: true,
          batchId,
          importedRecords: createdIssueIds.length,
          warning: "Records were imported, but the batch status could not be updated.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "CSV records imported successfully.",
      batchId,
      filename,
      importedRecords: createdIssueIds.length,
      issueIds: createdIssueIds,
    });
  } catch (error) {
    console.error("CSV import failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "The CSV import failed.",
      },
      { status: 500 }
    );
  }
}
