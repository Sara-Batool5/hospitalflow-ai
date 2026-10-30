import { NextResponse } from "next/server";
import { getScopedSupabase } from "../../../../lib/supabaseScoped";

export const dynamic = "force-dynamic";

type CsvRow = {
  rowNumber: number;
  reference: string;
  title: string;
  description: string;
  department: string;
  priority: string;
  status: string;
  issue_type: string;
  errors: string[];
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

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (insideQuotes) {
    throw new Error("The CSV contains an unclosed quotation mark.");
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Please select a CSV file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { ok: false, message: "Only .csv files are supported." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, message: "The CSV file must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length < 2) {
      return NextResponse.json(
        { ok: false, message: "The CSV must contain a header row and at least one data row." },
        { status: 400 }
      );
    }

    if (parsed.length - 1 > 2000) {
      return NextResponse.json(
        { ok: false, message: "A maximum of 2,000 data rows can be validated at once." },
        { status: 400 }
      );
    }

    const headers = parsed[0].map((header) => header.trim().toLowerCase());
    const requiredHeaders = [
      "reference",
      "title",
      "description",
      "department",
      "priority",
      "status",
      "issue_type",
    ];
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `Missing required column(s): ${missingHeaders.join(", ")}.`,
          requiredHeaders,
        },
        { status: 400 }
      );
    }

    const headerIndex = new Map(headers.map((header, index) => [header, index]));
    const getValue = (cells: string[], header: string) =>
      (cells[headerIndex.get(header) ?? -1] ?? "").trim();

    const supabase = await getScopedSupabase();
    const [departmentsResult, existingResult] = await Promise.all([
      supabase.from("departments").select("id, name"),
      supabase.from("operational_issues").select("synthetic_reference"),
    ]);

    if (departmentsResult.error) {
      console.error("CSV validation department lookup failed:", departmentsResult.error.message);
      return NextResponse.json(
        { ok: false, message: "Could not load departments for CSV validation." },
        { status: 500 }
      );
    }

    if (existingResult.error) {
      console.error("CSV validation duplicate lookup failed:", existingResult.error.message);
      return NextResponse.json(
        { ok: false, message: "Could not check existing issue references." },
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

    const rows: CsvRow[] = parsed.slice(1).map((cells, index) => {
      const rowNumber = index + 2;
      const reference = getValue(cells, "reference");
      const title = getValue(cells, "title");
      const description = getValue(cells, "description");
      const department = getValue(cells, "department");
      const priority = getValue(cells, "priority").toLowerCase();
      const status = getValue(cells, "status").toLowerCase();
      const issue_type = getValue(cells, "issue_type").toLowerCase();
      const errors: string[] = [];

      if (!reference) errors.push("Reference is required.");
      if (!title) errors.push("Title is required.");
      if (!description) errors.push("Description is required.");
      if (!department) errors.push("Department is required.");
      else if (!departmentByName.has(department.toLowerCase())) {
        errors.push(`Unknown department: "${department}". Use an existing department name.`);
      }

      if (!allowedPriorities.has(priority)) {
        errors.push("Priority must be low, medium, high, or critical.");
      }
      if (!allowedStatuses.has(status)) {
        errors.push("Status must be open, investigating, awaiting_approval, resolved, or dismissed.");
      }
      if (!allowedIssueTypes.has(issue_type)) {
        errors.push("Issue type is not supported.");
      }

      const normalizedReference = reference.toLowerCase();
      if (reference && existingReferences.has(normalizedReference)) {
        errors.push("This reference already exists in HospitalFlow AI.");
      }
      if (reference && seenReferences.has(normalizedReference)) {
        errors.push("This reference is duplicated within the uploaded CSV.");
      }
      if (reference) seenReferences.add(normalizedReference);

      return {
        rowNumber,
        reference,
        title,
        description,
        department,
        priority,
        status,
        issue_type,
        errors,
      };
    });

    const validCount = rows.filter((row) => row.errors.length === 0).length;

    return NextResponse.json({
      ok: true,
      filename: file.name,
      totalRecords: rows.length,
      validRecords: validCount,
      invalidRecords: rows.length - validCount,
      departments: (departmentsResult.data ?? []).map((department) => department.name),
      rows,
    });
  } catch (error) {
    console.error("CSV validation failed:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Could not validate the CSV file.",
      },
      { status: 500 }
    );
  }
}
