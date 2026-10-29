"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BedDouble,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  HeartPulse,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  Users,
  Workflow,
  X,
  Zap
} from "lucide-react";

type Priority = "Critical" | "High" | "Medium" | "Low";
type IssueStatus = "Open" | "In review" | "Resolved";

type Issue = {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  priority: Priority;
  status: IssueStatus;
  age: string;
  ageMinutes: number;
  icon: "file" | "bed" | "report" | "referral";
  recommendation: string;
};

type AuditEvent = {
  id: string;
  issue_id: string | null;
  action_id: string | null;
  event_type: string;
  actor_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Approval = {
  id: string;
  issue_id: string;
  action_type: string;
  description: string;
  status: string;
  requires_human_approval: boolean;
  assigned_department_id: string | null;
  created_at: string;
  completed_at: string | null;
  operational_issues: {
    synthetic_reference: string;
    title: string;
    priority: string;
    status: string;
  } | null;
  departments: {
    name: string;
  } | null;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
  totalIssues: number;
  openIssues: number;
};

const navGroups = [
  {
    label: "WORKSPACE",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "All issues", icon: ListTodo, count: "05" },
      { label: "Agent workflow", icon: Workflow },
      { label: "Approvals", icon: ShieldCheck, count: "03" }
    ]
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Departments", icon: Users },
      { label: "Operations timeline", icon: Activity },
      { label: "Reports & audit", icon: FileCheck2 },
      { label: "Upload CSV", icon: Upload }
    ]
  }
];

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-badge priority-${priority.toLowerCase()}`}>
      <span className="status-dot" />
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}>
      {status === "Resolved" ? <CheckCircle2 size={13} /> : null}
      {status}
    </span>
  );
}

function IssueIcon({ type }: { type: Issue["icon"] }) {
  if (type === "bed") return <BedDouble size={19} />;
  if (type === "report") return <FileText size={19} />;
  if (type === "referral") return <MessageSquareText size={19} />;
  return <FileCheck2 size={19} />;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [intakeResults, setIntakeResults] = useState<{
    summary: {
      totalRecords: number;
      validRecords: number;
      invalidRecords: number;
    };
    results: {
      reference: string | null;
      title: string | null;
      valid: boolean;
      findings: string[];
    }[];
  } | null>(null);
  const [bottleneckResults, setBottleneckResults] = useState<{
    summary: {
      totalRecords: number;
      bottlenecksFound: number;
      recordsFlagged: number;
    };
    findings: {
      reference: string;
      title: string;
      severity: string;
      finding: string;
    }[];
  } | null>(null);
  const [coordinatorResults, setCoordinatorResults] = useState<{
    summary: {
      totalRecords: number;
      recommendationsGenerated: number;
      actionRequired: number;
      noActionRequired: number;
    };
    recommendations: {
      reference: string;
      title: string;
      priority: string;
      status: string;
      recommendation: {
        action: string;
        reason: string;
        assignedDepartment: string;
        urgency: string;
        requiresHumanReview: boolean;
      };
    }[];
  } | null>(null);
  const [communicationResults, setCommunicationResults] = useState<{
    summary: {
      totalRecords: number;
      draftsGenerated: number;
      recordsSkipped: number;
      draftsRequiringReview: number;
    };
    results: {
      reference: string;
      title: string;
      department: string;
      status: string;
      reason: string;
      draft: {
        subject: string;
        body: string;
      } | null;
      requiresHumanReview: boolean;
    }[];
  } | null>(null);
  const [auditResults, setAuditResults] = useState<{
    summary: {
      actionsReviewed: number;
      auditEventsReviewed: number;
      passed: number;
      requiringReview: number;
    };
    results: {
      actionId: string;
      issueId: string;
      actionType: string;
      description: string;
      status: string;
      requiresHumanApproval: boolean;
      auditEventsFound: number;
      decision: string;
      findings: string[];
    }[];
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState("");
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvValidRows, setCsvValidRows] = useState<Record<string, unknown>[]>([]);
  const [csvInvalidRows, setCsvInvalidRows] = useState<Record<string, unknown>[]>([]);
  const [csvSummary, setCsvSummary] = useState<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvBatchId, setCsvBatchId] = useState("");


  async function validateCsvUpload() {
    if (!csvFile) {
      setCsvMessage("Please select a CSV file first.");
      return;
    }

    setCsvLoading(true);
    setCsvMessage("");
    setCsvSummary(null);
    setCsvValidRows([]);
    setCsvInvalidRows([]);
    setCsvBatchId("");

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await fetch("/api/uploads/validate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "CSV validation failed.");
      }

      const validRows = Array.isArray(result.validRows)
        ? result.validRows
        : Array.isArray(result.rows)
          ? result.rows.filter((row: Record<string, unknown>) => row.valid !== false)
          : [];

      const invalidRows = Array.isArray(result.invalidRows)
        ? result.invalidRows
        : Array.isArray(result.rows)
          ? result.rows.filter((row: Record<string, unknown>) => row.valid === false)
          : [];

      setCsvValidRows(validRows);
      setCsvInvalidRows(invalidRows);
      setCsvSummary({
        totalRecords: result.summary?.totalRecords ?? validRows.length + invalidRows.length,
        validRecords: result.summary?.validRecords ?? validRows.length,
        invalidRecords: result.summary?.invalidRecords ?? invalidRows.length,
      });
      setCsvMessage("Validation finished. Review the results before importing.");
    } catch (error) {
      setCsvMessage(
        error instanceof Error ? error.message : "Could not validate the CSV."
      );
    } finally {
      setCsvLoading(false);
    }
  }

  async function importCsvRows() {
    if (!csvFile || !csvValidRows.length) {
      setCsvMessage("There are no valid rows to import.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${csvValidRows.length} valid record(s) into HospitalFlow AI? Invalid rows will not be imported.`
    );

    if (!confirmed) return;

    setCsvImporting(true);
    setCsvMessage("");

    try {
      const response = await fetch("/api/uploads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: csvFile.name,
          rows: csvValidRows,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "CSV import failed.");
      }

      const batchId = result.batchId ?? result.batch?.id ?? "";
      setCsvBatchId(batchId);
      setCsvMessage(
        `Import successful. ${result.importedRecords ?? csvValidRows.length} record(s) imported.`
      );

      await loadIssues();
      await loadAuditEvents();
    } catch (error) {
      setCsvMessage(
        error instanceof Error ? error.message : "Could not import the CSV."
      );
    } finally {
      setCsvImporting(false);
    }
  }

  async function loadIssues() {
    setDataError("");

    try {
      const response = await fetch("/api/issues", {
        method: "GET",
        cache: "no-store",
      });
  
      const result = await response.json();
  
      if (!response.ok || !result.ok || !Array.isArray(result.issues)) {
        throw new Error(
          result.message || "Could not load operational issues."
        );
      }
  
      setIssues(result.issues as Issue[]);
    } catch (error) {
      console.error("Failed to load issues:", error);
  
      setDataError(
        error instanceof Error
          ? error.message
          : "Could not connect to the issues service."
      );
    } finally {
      setDataLoading(false);
    }
  }

  async function loadAuditEvents() {
    setAuditLoading(true);
    setAuditError("");
  
    try {
      const response = await fetch("/api/audit", {
        method: "GET",
        cache: "no-store",
      });
  
      const result = await response.json();
  
      if (
        !response.ok ||
        !result.ok ||
        !Array.isArray(result.events)
      ) {
        throw new Error(
          result.message || "Could not load audit history."
        );
      }
  
      setAuditEvents(result.events as AuditEvent[]);
    } catch (error) {
      console.error("Failed to load audit history:", error);
  
      setAuditError(
        error instanceof Error
          ? error.message
          : "Could not connect to the audit service."
      );
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadApprovals() {
    setApprovalsLoading(true);
    setApprovalsError("");
  
    try {
      const response = await fetch("/api/approvals", {
        method: "GET",
        cache: "no-store",
      });
  
      const result = await response.json();
  
      if (
        !response.ok ||
        !result.ok ||
        !Array.isArray(result.approvals)
      ) {
        throw new Error(
          result.message || "Could not load approval records."
        );
      }
  
      setApprovals(result.approvals as Approval[]);
    } catch (error) {
      console.error("Failed to load approvals:", error);
  
      setApprovalsError(
        error instanceof Error
          ? error.message
          : "Could not connect to the approval service."
      );
    } finally {
      setApprovalsLoading(false);
    }
  }

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setDepartmentsError("");
  
    try {
      const response = await fetch("/api/departments", {
        cache: "no-store",
      });
  
      const result = await response.json();
  
      if (!response.ok || !result.ok || !Array.isArray(result.departments)) {
        throw new Error(result.message || "Could not load departments.");
      }
  
      setDepartments(result.departments as Department[]);
    } catch (error) {
      setDepartmentsError(
        error instanceof Error
          ? error.message
          : "Could not load departments."
      );
    } finally {
      setDepartmentsLoading(false);
    }
  }
 
  async function handleApprovalDecision(
    approvalId: string,
    decision: "approve" | "reject"
  ) {
    const confirmed = window.confirm(
      decision === "approve"
        ? "Record approval for this demo workflow action?"
        : "Reject this demo workflow action?"
    );
  
    if (!confirmed) return;
  
    setApprovalsError("");
  
    try {
      const response = await fetch("/api/approvals/decision", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvalId, decision }),
      });
  
      const result = await response.json();
  
      if (!response.ok || !result.ok) {
        throw new Error(
          result.message || "Could not save the decision."
        );
      }
  
      await Promise.all([
        loadApprovals(),
        loadAuditEvents(),
      ]);
  
      window.alert(result.message);
    } catch (error) {
      console.error("Approval decision failed:", error);
  
      setApprovalsError(
        error instanceof Error
          ? error.message
          : "Could not save the approval decision."
      );
    }
  }

  useEffect(() => {
    void loadIssues();
    void loadAuditEvents();
    void loadApprovals();
    void loadDepartments();
  }, []);
  
  const openCount = issues.filter((issue) => issue.status === "Open").length;
  const criticalCount = issues.filter(
    (issue) => issue.priority === "Critical" && issue.status !== "Resolved"
  ).length;
  const reviewCount = issues.filter(
    (issue) => issue.status === "In review"
  ).length;
  const resolvedCount = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        issue.title.toLowerCase().includes(query) ||
        issue.id.toLowerCase().includes(query) ||
        issue.department.toLowerCase().includes(query) ||
        issue.category.toLowerCase().includes(query);

      const matchesPriority =
        priorityFilter === "All priorities" ||
        issue.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "All statuses" ||
        issue.status === statusFilter;

      const matchesNav =
        activeNav !== "Approvals" ||
        issue.status === "In review";

      return matchesQuery && matchesPriority && matchesStatus && matchesNav;
    });
  }, [issues, searchQuery, priorityFilter, statusFilter, activeNav]);
  
  async function runScan() {
    if (scanRunning) return;
  
    setScanRunning(true);
    setScanMessage("Running the combined five-agent workflow...");
    setDataError("");
    setIntakeResults(null);
    setBottleneckResults(null);
    setCoordinatorResults(null);
    setCommunicationResults(null);
    setAuditResults(null);
  
    try {
      // Call the orchestrator once for all five agent stages.
      const response = await fetch("/api/agents/run", {
        method: "POST",
        cache: "no-store",
      });
  
      const data = await response.json();
  
      if (
        !response.ok ||
        !data.ok ||
        !Array.isArray(data.stages) ||
        data.stages.length !== 5
      ) {
        throw new Error(
          data.message ||
            "The combined five-agent workflow could not complete."
        );
      }
  
      // Extract each stage from the combined response.
      const intakeStage = data.stages.find(
        (stage: { agent: string }) =>
          stage.agent === "Intake Agent"
      );
  
      const bottleneckStage = data.stages.find(
        (stage: { agent: string }) =>
          stage.agent === "Bottleneck Detection"
      );
  
      const coordinatorStage = data.stages.find(
        (stage: { agent: string }) =>
          stage.agent === "Workflow Coordinator"
      );
  
      const communicationStage = data.stages.find(
        (stage: { agent: string }) =>
          stage.agent === "Communication Agent"
      );
  
      const auditStage = data.stages.find(
        (stage: { agent: string }) =>
          stage.agent === "Audit Agent"
      );
  
      // Validate the results before updating the dashboard.
      if (
        !intakeStage ||
        !Array.isArray(intakeStage.results) ||
        !bottleneckStage ||
        !Array.isArray(bottleneckStage.findings) ||
        !coordinatorStage ||
        !coordinatorStage.summary ||
        !Array.isArray(coordinatorStage.recommendations) ||
        !communicationStage ||
        !communicationStage.summary ||
        !Array.isArray(communicationStage.results) ||
        !auditStage ||
        !auditStage.summary ||
        !Array.isArray(auditStage.results)
      ) {
        throw new Error(
          "The orchestrator response is missing one or more agent results."
        );
      }
  
      // Refresh operational issues after the workflow completes.
      const issuesResponse = await fetch("/api/issues", {
        method: "GET",
        cache: "no-store",
      });
  
      const issuesData = await issuesResponse.json();
  
      if (
        !issuesResponse.ok ||
        !issuesData.ok ||
        !Array.isArray(issuesData.issues)
      ) {
        throw new Error(
          issuesData.message ||
            "Could not refresh operational issues."
        );
      }
  
      setIssues(issuesData.issues as Issue[]);
  
      // Populate the five dashboard result panels.
      setIntakeResults({
        summary: {
          totalRecords: intakeStage.totalRecords,
          validRecords: intakeStage.validRecords,
          invalidRecords: intakeStage.invalidRecords,
        },
        results: intakeStage.results,
      });
  
      setBottleneckResults({
        summary: {
          totalRecords: bottleneckStage.inputRecords,
          bottlenecksFound: bottleneckStage.bottlenecksFound,
          recordsFlagged: bottleneckStage.recordsFlagged,
        },
        findings: bottleneckStage.findings,
      });
  
      setCoordinatorResults({
        summary: coordinatorStage.summary,
        recommendations: coordinatorStage.recommendations,
      });
  
      setCommunicationResults({
        summary: communicationStage.summary,
        results: communicationStage.results,
      });
  
      setAuditResults({
        summary: auditStage.summary,
        results: auditStage.results,
      });
  
      const workflowMessage =
        data.status === "completed"
          ? "completed successfully"
          : "completed with issues requiring attention";
  
      setScanMessage(
        `Workflow ${workflowMessage}. ` +
          `Intake: ${intakeStage.validRecords}/${intakeStage.totalRecords} valid records. ` +
          `Bottleneck Detection: ${bottleneckStage.bottlenecksFound} findings across ${bottleneckStage.recordsFlagged} records. ` +
          `Coordinator: ${coordinatorStage.summary.recommendationsGenerated} recommendations. ` +
          `Communication: ${communicationStage.summary.draftsGenerated} drafts. ` +
          `Audit: ${auditStage.summary.actionsReviewed} actions reviewed, ` +
          `${auditStage.summary.requiringReview} requiring review.`
      );
    } catch (error) {
      console.error("Agent workflow failed:", error);
  
      setDataError(
        error instanceof Error
          ? error.message
          : "The agent workflow could not be completed."
      );
  
      setScanMessage("Workflow failed. Please try again.");
    } finally {
      setScanRunning(false);
    }
  }

  async function updateIssueStatus(
    id: string,
    status: IssueStatus
  ): Promise<boolean> {
    try {
      setScanMessage(`Saving ${id} status…`);
      setDataError("");
  
      const response = await fetch("/api/issues/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
  
      const result = await response.json();
  
      if (!response.ok || !result.ok) {
        throw new Error(
          result.message || "Could not save the issue status."
        );
      }
  
      await loadIssues();
      await loadAuditEvents();
  
      setSelectedIssue((current) => {
        if (current?.id !== id) return current;
  
        return {
          ...current,
          status,
        };
      });
  
      setScanMessage(
        result.warning
          ? `${id} status saved, but the audit log could not be saved.`
          : `${id} status saved to Supabase.`
      );
  
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save the issue status.";
  
      setDataError(message);
      setScanMessage("");
      return false;
    }
  }


  const isOverview = activeNav === "Dashboard";
  const isApprovals = activeNav === "Approvals";

  const dashboardOpenOnly = issues.filter(
    (issue) => issue.status === "Open"
  ).length;
  
  const dashboardInReview = issues.filter(
    (issue) => issue.status === "In review"
  ).length;
  
  const dashboardResolved = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;
  
  const dashboardTotal =
    dashboardOpenOnly + dashboardInReview + dashboardResolved;
  
  const openPercent = dashboardTotal
    ? (dashboardOpenOnly / dashboardTotal) * 100
    : 0;
  
  const reviewPercent = dashboardTotal
    ? (dashboardInReview / dashboardTotal) * 100
    : 0;
  
  const resolvedPercent = dashboardTotal
    ? (dashboardResolved / dashboardTotal) * 100
    : 0;

  
  return (
    <main
      className={`app-shell ${
        sidebarCollapsed ? "sidebar-is-collapsed" : ""
      }`}
    >
      <style jsx global>{`
        :root { --hf-ink:#082c3d; --hf-muted:#55718a; --hf-teal:#009f91; --hf-border:#dce7ed; }
        body { background:#f7fafc !important; color:var(--hf-ink); }
        .app-shell { background:#f7fafc !important; color:var(--hf-ink) !important; }
        .sidebar { background:linear-gradient(180deg,#005b58 0%,#004542 100%) !important; color:#f3fffe !important; border-right:0 !important; box-shadow:none !important; }
        .workspace-switcher { background:rgba(255,255,255,.08) !important; border:1px solid rgba(255,255,255,.1) !important; }
        .workspace-copy strong,.workspace-copy .muted-label,.nav-label,.nav-item,.agent-status-card,.sidebar-user,.sidebar-user strong,.sidebar-user span { color:#edfffd !important; }
        .nav-label { color:#9ed3d0 !important; }
        .nav-item { border-radius:9px !important; }
        .nav-item:hover,.nav-item.nav-active { background:rgba(53,205,184,.23) !important; color:#fff !important; }
        .nav-count { background:#078c82 !important; color:white !important; }
        .agent-status-card { background:rgba(0,37,38,.24) !important; border:1px solid rgba(67,207,190,.35) !important; }
        .sidebar-user { border-top:1px solid rgba(255,255,255,.15) !important; }
        .main-area { background:#f8fafc !important; }
        .topbar { background:rgba(255,255,255,.96) !important; border-bottom:1px solid #e3ebef !important; box-shadow:none !important; min-height:86px; }
        .topbar-left { min-width:0; }
        .app-brand-fixed { display:flex; align-items:center; gap:11px; min-width:0; position:relative; z-index:2; }
        .app-brand-fixed .brand-mark { width:52px; height:58px; border-radius:50%; display:grid; place-items:center; background:#005b58; color:#fff; flex:none; box-shadow:inset 0 0 0 3px rgba(255,255,255,.12); }
        .app-brand-fixed .brand-copy { min-width:0; }
        .app-brand-fixed .brand-name { color:#0a2e40 !important; font-size:23px; line-height:1.1; letter-spacing:-.55px; font-weight:780; white-space:nowrap; }
        .app-brand-fixed .brand-name span { color:#079f91; }
        .app-brand-fixed .brand-caption { color:#4b6c80 !important; margin-top:4px; font-size:10px; font-weight:750; letter-spacing:1.45px; white-space:nowrap; }
        .page-breadcrumb { display:flex; align-items:center; gap:10px; min-height:38px; margin:0 0 20px; font-size:14px; }
        .breadcrumb span { color:#7894ac !important; }
        .breadcrumb strong { color:#082c3d !important; }
        .system-status { color:#173a4c !important; }
        .topbar-avatar { background:#005b58 !important; color:white !important; }
        .page-content { max-width:none !important; padding-top:24px !important; }
        .hf-hide-dashboard-heading { display:none !important; }
        .hf-dashboard { display:flex; flex-direction:column; gap:24px; width:100%; color:#082c3d; }
        .hf-welcome { min-height:122px; border-radius:12px; padding:25px 28px 24px 22px; display:flex; align-items:center; gap:20px; position:relative; overflow:hidden; background:linear-gradient(105deg,#eaf7f5 0%,#edf9f7 70%,#e3f5f2 100%); }
        .hf-welcome:after { content:""; position:absolute; width:300px; height:120px; right:-12px; bottom:-58px; border-radius:50%; background:rgba(157,223,217,.15); box-shadow:-65px -3px 0 rgba(157,223,217,.12),-125px 15px 0 rgba(157,223,217,.10); }
        .hf-welcome-icon { width:60px; height:64px; display:grid; place-items:center; border-radius:13px; background:rgba(255,255,255,.78); border:1px solid #dcefeb; color:#007d72; flex:none; z-index:1; }
        .hf-welcome-copy { z-index:1; }
        .hf-welcome-copy h1 { margin:0 0 8px; font-size:25px; line-height:1.2; letter-spacing:-.45px; font-weight:750; color:#092d3d; }
        .hf-welcome-copy p { margin:0; color:#41657c; font-size:15px; }
        .hf-welcome-art { margin-left:auto; color:#bce6e1; opacity:.75; z-index:1; padding-right:4px; }
        .hf-stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:20px; }
        .hf-stat-card { appearance:none; text-align:left; min-width:0; position:relative; border:1px solid #dce6ed; border-radius:9px; background:#fff; padding:20px 20px 16px; min-height:152px; color:#082c3d; cursor:pointer; transition:box-shadow .15s,transform .15s; }
        .hf-stat-card:hover { box-shadow:0 7px 20px rgba(14,62,81,.08); transform:translateY(-1px); }
        .hf-stat-top { display:flex; align-items:center; gap:12px; font-size:13px; font-weight:600; color:#526f87; }
        .hf-stat-icon { width:31px; height:31px; border-radius:50%; display:grid; place-items:center; color:white; }
        .hf-stat-icon.red { background:#ff6470; }.hf-stat-icon.amber { background:#ffb53e; }.hf-stat-icon.blue { background:#3298f5; }.hf-stat-icon.green { background:#09ad98; }
        .hf-stat-number { margin-top:13px; font-size:29px; line-height:1; font-weight:750; letter-spacing:-.7px; color:#082c3d; }
        .hf-stat-bottom { display:flex; align-items:center; gap:5px; margin-top:10px; font-size:11px; color:#607b91; position:relative; padding-right:76px; }
        .hf-stat-bottom svg { position:absolute; width:80px; height:36px; right:0; bottom:-3px; overflow:visible; }
        .hf-stat-bottom svg path { fill:none; stroke:#ff8b97; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }.hf-stat-card:nth-child(2) .hf-stat-bottom svg path {stroke:#ffb73f}.hf-stat-card:nth-child(3) .hf-stat-bottom svg path {stroke:#339cff}.hf-stat-card:nth-child(4) .hf-stat-bottom svg path {stroke:#0db69f}
        .hf-trend { font-weight:700; }.red-text {color:#ed4b55}.amber-text {color:#e99b1c}.blue-text {color:#2385e9}.green-text {color:#009e8b}
        .hf-main-grid { display:grid; grid-template-columns:minmax(0,1.62fr) minmax(330px,1fr); gap:20px; align-items:stretch; }
        .hf-card { background:#fff; border:1px solid #dce6ed; border-radius:9px; min-width:0; overflow:hidden; }
        .hf-card-heading { min-height:63px; padding:0 20px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #e5edf1; }
        .hf-heading-icon { color:#42647a; display:flex; align-items:center; }
        .hf-card-heading h2 { font-size:16px; line-height:1.3; margin:0; font-weight:720; color:#0a2e40; }
        .hf-link { display:inline-flex; align-items:center; gap:7px; border:0; background:transparent; color:#00a38f; font-size:12px; font-weight:650; cursor:pointer; white-space:nowrap; }
        .hf-card-heading .hf-link { margin-left:auto; }
        .hf-table-wrap { overflow-x:auto; padding:0 20px; }
        .hf-table { width:100%; border-collapse:collapse; font-size:11.5px; white-space:nowrap; }
        .hf-table th { color:#526f87; font-size:11.5px; font-weight:650; text-align:left; height:44px; border-bottom:1px solid #e7eef2; }
        .hf-table td { height:55px; border-bottom:1px solid #e7eef2; color:#17394c; }
        .hf-table tbody tr { cursor:pointer; }.hf-table tbody tr:hover {background:#f7fbfb;}
        .hf-table td:first-child { display:table-cell; min-width:220px; }
        .hf-row-icon { display:inline-grid; vertical-align:middle; place-items:center; width:20px; height:20px; border-radius:50%; margin-right:12px; }.hf-row-icon.critical {color:#f05260;background:#fff0f1}.hf-row-icon.high {color:#eea01c;background:#fff7e8}.hf-row-icon.medium {color:#238ff2;background:#edf7ff}.hf-row-icon.low {color:#0aab94;background:#e8faf6}
        .hf-issue-title { vertical-align:middle; color:#123448; }
        .hf-pill,.hf-status-pill { display:inline-flex; align-items:center; justify-content:center; border-radius:7px; padding:5px 10px; font-size:11px; font-weight:650; }
        .hf-pill.critical {color:#e44c55;background:#fff0f1}.hf-pill.high {color:#bd7907;background:#fff5df}.hf-pill.medium {color:#147ee0;background:#eaf5ff}.hf-pill.low {color:#008d7e;background:#e7f9f5}
        .hf-status-pill.open {color:#df5057;background:#fff0f1}.hf-status-pill.in-review {color:#0878d1;background:#eaf5ff}.hf-status-pill.resolved {color:#008d7e;background:#e6f8f4}
        .hf-card-bottom { min-height:51px; padding:0 20px; display:flex; align-items:center; justify-content:space-between; gap:10px; color:#7690a2; font-size:11px; }
        .hf-right-stack { display:flex; flex-direction:column; gap:10px; min-width:0; }
        .hf-health-card { min-height:225px; }
        .hf-health-label { margin-left:auto; display:flex; align-items:center; gap:6px; color:#009e8b; font-size:10px; font-weight:650; }.hf-health-label span { width:8px;height:8px;border-radius:50%;background:#0bb39c; }
        .hf-health-content { display:flex; align-items:center; justify-content:space-around; gap:16px; padding:17px 22px 22px; }
        .hf-health-ring { width:142px; height:142px; border-radius:50%; flex:none; display:grid; place-items:center; background:conic-gradient(#12ad99 0 94%,#d6f1ec 94% 100%); position:relative; }
        .hf-health-ring:before { content:""; position:absolute; inset:10px; border-radius:50%; background:#fff; }
        .hf-health-ring>div { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:5px; }.hf-health-ring strong { font-size:24px; color:#0a3042; }.hf-health-ring span { font-size:11px; color:#274b60; }
        .hf-health-list { display:flex; flex-direction:column; gap:18px; min-width:0; flex:1; }.hf-health-list div { display:grid; grid-template-columns:9px minmax(88px,1fr) auto; gap:8px; align-items:center; font-size:11px; color:#5c778c; }.hf-health-list i { width:9px;height:9px;border-radius:50%;background:#11b49e; }.hf-health-list strong { color:#00a28f; font-size:10px; font-weight:650; }
        .hf-activity-card { flex:1; min-height:250px; }.hf-icon-link { margin-left:auto; background:transparent; border:0; color:#57768a; cursor:pointer; display:flex; }
        .hf-activity-list { padding:6px 20px 0; }.hf-activity-row { min-height:39px; display:flex; align-items:center; gap:10px; min-width:0; }.hf-activity-icon { width:18px;height:18px; border-radius:50%; display:grid;place-items:center; flex:none;color:white;background:#ff626d; }.hf-activity-icon.positive {background:#08ad98}.hf-activity-icon.blue {background:#3298f5}
        .hf-activity-text { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#17394c; font-size:11px; }.hf-activity-row time { flex:none; font-size:10px; color:#6f8ba0; }.hf-activity-empty { padding:18px 0; color:#6f8799; font-size:12px; }
        .app-brand-fixed { z-index:30 !important; }.app-brand-fixed .brand-name { color:#0a2e40 !important; }.app-brand-fixed .brand-caption { color:#4b6c80 !important; }.app-brand-fixed .brand-mark { background:#005b58 !important; color:white !important; }
        @media(max-width:1150px) { .hf-stat-grid {gap:12px}.hf-stat-card {padding:17px 14px}.hf-main-grid {grid-template-columns:minmax(0,1.3fr) minmax(300px,1fr)}.hf-health-content {padding-left:14px;padding-right:14px}.hf-health-ring {width:118px;height:118px} }
        @media(max-width:900px) { .hf-stat-grid {grid-template-columns:repeat(2,minmax(0,1fr))}.hf-main-grid {grid-template-columns:1fr}.hf-right-stack {display:grid;grid-template-columns:1fr 1fr}.hf-health-content {flex-wrap:wrap}.hf-health-list {min-width:150px} }
        @media(max-width:620px) { .page-content {padding:16px !important}.hf-dashboard {gap:16px}.hf-welcome {padding:18px;min-height:112px;gap:12px}.hf-welcome-icon {width:46px;height:48px}.hf-welcome-copy h1 {font-size:19px}.hf-welcome-copy p {font-size:12px;line-height:1.5}.hf-welcome-art {display:none}.hf-stat-grid {gap:10px}.hf-stat-card {padding:14px 12px;min-height:140px}.hf-stat-top {font-size:11px;gap:8px}.hf-stat-icon {width:27px;height:27px}.hf-stat-number {font-size:25px}.hf-stat-bottom {font-size:10px;padding-right:0}.hf-stat-bottom svg {display:none}.hf-right-stack {display:flex}.hf-health-content {justify-content:center}.hf-health-list {min-width:150px}.hf-card-heading {padding:0 14px}.hf-table-wrap {padding:0 14px}.hf-card-bottom {padding:10px 14px;flex-wrap:wrap}.hf-health-label {display:none} }
        @media(max-width:620px) {
          .topbar { min-height:72px; }
          .app-brand-fixed { gap:8px; }
          .app-brand-fixed .brand-mark { width:40px; height:44px; }
          .app-brand-fixed .brand-name { font-size:17px; letter-spacing:-.3px; }
          .app-brand-fixed .brand-caption { font-size:8px; letter-spacing:1px; }
          .topbar-actions .system-status { display:none; }
          .page-breadcrumb { margin-bottom:16px; }
        }
      `}</style>
      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""} ${
          sidebarCollapsed ? "sidebar-collapsed" : ""
        }`}
      >
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={() => setSidebarCollapsed((current) => !current)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>

        <div className="workspace-switcher">
          <div className="workspace-avatar"><Stethoscope size={18} /></div>
          <div className="workspace-copy">
            <span className="muted-label">WORKSPACE</span>
            <strong>General Hospital</strong>
          </div>
          <ChevronDown size={16} className="muted-icon" />
        </div>

        <div className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    title={item.label}
                    aria-label={item.label}
                    className={`nav-item ${activeNav === item.label ? "nav-active" : ""}`}
                    onClick={() => {
                      setActiveNav(item.label);
                      setMobileMenuOpen(false);
                      setScanMessage("");
                    }}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {"count" in item && item.count && (
                      <span className="nav-count">
                        {item.label === "All issues"
                          ? String(issues.length).padStart(2, "0")
                          : item.count}
                      </span>
                    )}
                    {activeNav === item.label && (
                      <span className="nav-indicator" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-spacer" />

        <div className="agent-status-card">
          <div className="agent-status-top">
            <span className="agent-pulse" />
            <span>OPERATIONS ENGINE</span>
            <span className="online-label">DEMO</span>
          </div>
          <strong>Ready for review</strong>
          <p>Using synthetic records. No hospital systems connected.</p>
          <div className="agent-progress-track">
            <div className="agent-progress-fill" />
          </div>
          <div className="agent-progress-caption">
            <span>Demo environment</span>
            <span>Ready</span>
          </div>
        </div>

        <button
          title="Settings"
          aria-label="Settings"
          className={`nav-item sidebar-settings ${activeNav === "Settings" ? "nav-active" : ""}`}
          onClick={() => {
            setActiveNav("Settings");
            setMobileMenuOpen(false);
          }}
        >
          <Settings2 size={18} />
          <span>Settings</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">HA</div>
          <div className="user-info">
            <strong>Hospital Admin</strong>
            <span>Demo administrator</span>
          </div>
          <MoreHorizontal size={19} className="muted-icon" />
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="app-brand-fixed" aria-label="HospitalFlow AI Operations Intelligence">
              <div className="brand-mark"><HeartPulse size={27} strokeWidth={2.1} /></div>
              <div className="brand-copy">
                <div className="brand-name">HospitalFlow<span> AI</span></div>
                <div className="brand-caption">OPERATIONS INTELLIGENCE</div>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="system-status">
              <span className="system-status-dot" />
              Demo environment
            </div>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => setShowNotifications((value) => !value)}
              >
                <Bell size={19} />
                <span className="notification-dot" />
              </button>
              {showNotifications && (
                <div className="notification-popover">
                  <strong>Notifications</strong>
                  <p>You have {criticalCount} critical open issue(s) in the demo workspace.</p>
                  <button onClick={() => {
                    setShowNotifications(false);
                    setActiveNav("All issues");
                  }}>
                    View issues <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-avatar">HA</div>
          </div>
        </header>

        <div className="page-content">
          
          
          <div className="breadcrumb page-breadcrumb">
            <span>HospitalFlow</span>
            <ChevronRight size={14} />
            <strong>{activeNav}</strong>
          </div>
          {dataLoading && (
            <div className="inline-feedback">
              <RefreshCw size={17} className="spin" />
              Loading operational issues from the database…
            </div>
          )}
          
          {dataError && (
            <div className="inline-feedback" role="alert">
              <AlertTriangle size={17} />
              {dataError}
              <button
                className="secondary-button compact-button"
                onClick={runScan}
                disabled={scanRunning}
              >
                Try again
              </button>
            </div>
          )}
          
          {activeNav === "Settings" ? (
            <section className="secondary-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PREFERENCES</div>
                  <h1>Settings</h1>
                  <p>Manage your HospitalFlow demo workspace.</p>
                </div>
              </div>
              <div className="panel settings-panel">
                <div className="settings-icon"><Settings2 size={21} /></div>
                <div>
                  <h3>Demo workspace settings</h3>
                  <p>Authentication, configurable rules, integrations, and persistent preferences will be added in later development steps.</p>
                  <span className="coming-soon">FOUNDATION PHASE</span>
                </div>
              </div>
            </section>
          ) : activeNav === "Agent workflow" ? (
            <section className="secondary-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">AUTOMATION</div>
                  <h1>Agent workflow</h1>
                  <p>Explore the planned coordination pipeline.</p>
                </div>
                <button className="primary-button" onClick={runScan} disabled={scanRunning}>
                  <RefreshCw size={16} className={scanRunning ? "spin" : ""} />
                  {scanRunning ? "Scanning…" : "Run demo scan"}
                </button>
              </div>
              {intakeResults && (
                <div className="panel" style={{ marginBottom: 20, padding: 20 }}>
                  <h2 style={{ marginTop: 0 }}>Intake Agent Results</h2>
                  <p>
                    Validation has finished on the current demo records.
                  </p>
              
                  <div className="metrics-grid">
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records checked</div>
                      <div className="metric-value">
                        {intakeResults.summary.totalRecords}
                      </div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Valid records</div>
                      <div className="metric-value">
                        {intakeResults.summary.validRecords}
                      </div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Invalid records</div>
                      <div className="metric-value">
                        {intakeResults.summary.invalidRecords}
                      </div>
                    </div>
                  </div>
              
                  <div style={{ overflowX: "auto", marginTop: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: 10 }}>Reference</th>
                          <th style={{ textAlign: "left", padding: 10 }}>Record</th>
                          <th style={{ textAlign: "left", padding: 10 }}>Result</th>
                          <th style={{ textAlign: "left", padding: 10 }}>Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intakeResults.results.map((record, index) => (
                          <tr key={`${record.reference ?? "record"}-${index}`}>
                            <td style={{ padding: 10 }}>
                              {record.reference ?? "No reference"}
                            </td>
                            <td style={{ padding: 10 }}>
                              {record.title ?? "Untitled record"}
                            </td>
                            <td style={{ padding: 10 }}>
                              {record.valid ? "Valid" : "Needs attention"}
                            </td>
                            <td style={{ padding: 10 }}>
                              {record.findings.length > 0
                                ? record.findings.join(" ")
                                : "No findings"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
       
              {bottleneckResults && (
                <div className="panel" style={{ marginBottom: 20, padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div className="eyebrow">AGENT ANALYSIS · STAGE 02</div>
                      <h2 style={{ marginTop: 6, marginBottom: 8 }}>
                        Bottleneck Detection Results
                      </h2>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Rule-based detection of unresolved issues that may need attention.
                      </p>
                    </div>
              
                    <span className="coming-soon">
                      {bottleneckResults.summary.bottlenecksFound > 0
                        ? "ATTENTION REQUIRED"
                        : "NO FINDINGS"}
                    </span>
                  </div>
              
                  <div className="metrics-grid">
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records checked</div>
                      <div className="metric-value">
                        {bottleneckResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records analyzed</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Findings detected</div>
                      <div className="metric-value">
                        {bottleneckResults.summary.bottlenecksFound}
                      </div>
                      <div className="metric-foot">Potential bottlenecks</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records flagged</div>
                      <div className="metric-value">
                        {bottleneckResults.summary.recordsFlagged}
                      </div>
                      <div className="metric-foot">Require closer review</div>
                    </div>
                  </div>
              
                  {bottleneckResults.findings.length === 0 ? (
                    <div
                      className="empty-state"
                      style={{ marginTop: 20, padding: 24 }}
                    >
                      <div className="empty-state-icon">
                        <CheckCircle2 size={25} />
                      </div>
                      <h3>No bottlenecks detected</h3>
                      <p>
                        The current rules did not flag any records. This does not
                        guarantee that no operational delays exist.
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div className="section-heading" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Findings requiring attention</h3>
                          <p style={{ marginTop: 5 }}>
                            Review each finding before taking operational action.
                          </p>
                        </div>
                        <span className="count-pill">
                          {bottleneckResults.findings.length} findings
                        </span>
                      </div>
              
                      <div style={{ display: "grid", gap: 12 }}>
                        {bottleneckResults.findings.map((item, index) => {
                          const severity = item.severity.toLowerCase();
                          const severityColor =
                            severity === "critical"
                              ? "#b42318"
                              : severity === "high"
                                ? "#c2410c"
                                : severity === "medium"
                                  ? "#a16207"
                                  : "#475569";
              
                          const severityBackground =
                            severity === "critical"
                              ? "#fef3f2"
                              : severity === "high"
                                ? "#fff7ed"
                                : severity === "medium"
                                  ? "#fefce8"
                                  : "#f1f5f9";
              
                          return (
                            <article
                              key={`${item.reference}-${index}`}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: 18,
                                display: "grid",
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "var(--muted)",
                                      marginBottom: 5,
                                    }}
                                  >
                                    ISSUE REFERENCE
                                  </div>
                                  <strong>{item.reference}</strong>
                                </div>
              
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: severityColor,
                                    background: severityBackground,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {item.severity || "Unspecified"} severity
                                </span>
                              </div>
              
                              <div>
                                <h4 style={{ margin: "0 0 6px", fontSize: 16 }}>
                                  {item.title || "Untitled operational record"}
                                </h4>
                                <p style={{ margin: 0, lineHeight: 1.6 }}>
                                  {item.finding}
                                </p>
                              </div>
              
                              <div
                                style={{
                                  borderTop: "1px solid var(--border)",
                                  paddingTop: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  color: "var(--muted)",
                                  fontSize: 13,
                                }}
                              >
                                <AlertTriangle size={16} />
                                Suggested next step: review this finding with the
                                responsible department.
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
              
                  <p
                    style={{
                      marginBottom: 0,
                      marginTop: 20,
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    These are rule-based findings, not clinical judgments. Human
                    review is required before consequential operational decisions.
                  </p>
                </div>
              )}
 
              {coordinatorResults && (
                <div className="panel" style={{ marginBottom: 20, padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div className="eyebrow">AGENT ANALYSIS · STAGE 03</div>
                      <h2 style={{ marginTop: 6, marginBottom: 8 }}>
                        Workflow Coordinator Results
                      </h2>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Recommended next steps based on operational records and predefined rules.
                      </p>
                    </div>
                    <span className="coming-soon">
                      ADVISORY ONLY
                    </span>
                  </div>
              
                  <div className="metrics-grid">
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records reviewed</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records assessed</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Recommendations</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.recommendationsGenerated}
                      </div>
                      <div className="metric-foot">Suggested next steps</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Require action</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.actionRequired}
                      </div>
                      <div className="metric-foot">Need follow-up</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">No action required</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.noActionRequired}
                      </div>
                      <div className="metric-foot">No next step suggested</div>
                    </div>
                  </div>
              
                  {coordinatorResults.recommendations.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 20, padding: 24 }}>
                      <div className="empty-state-icon">
                        <CheckCircle2 size={25} />
                      </div>
                      <h3>No recommendations available</h3>
                      <p>
                        The Coordinator did not return any recommendations for the
                        current records.
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div className="section-heading" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Recommended next steps</h3>
                          <p style={{ marginTop: 5 }}>
                            Review each recommendation before taking action.
                          </p>
                        </div>
                        <span className="count-pill">
                          {coordinatorResults.recommendations.length} recommendations
                        </span>
                      </div>
              
                      <div style={{ display: "grid", gap: 14 }}>
                        {coordinatorResults.recommendations.map((item) => {
                          const urgency = String(
                            item.recommendation.urgency || "normal"
                          ).toLowerCase();
              
                          const urgencyStyle =
                            urgency === "critical" || urgency === "urgent"
                              ? { color: "#b42318", background: "#fef3f2" }
                              : urgency === "high"
                                ? { color: "#c2410c", background: "#fff7ed" }
                                : urgency === "medium"
                                  ? { color: "#a16207", background: "#fefce8" }
                                  : { color: "#475569", background: "#f1f5f9" };
              
                          return (
                            <article
                              key={item.reference}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: 18,
                                display: "grid",
                                gap: 14,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  flexWrap: "wrap",
                                  gap: 12,
                                }}
                              >
                                <div style={{ flex: "1 1 240px" }}>
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    {item.reference}
                                  </div>
                                  <h4 style={{ margin: 0, fontSize: 17 }}>
                                    {item.title || "Untitled operational issue"}
                                  </h4>
                                </div>
              
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 999,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      background: "var(--surface-secondary)",
                                      color: "var(--text)",
                                    }}
                                  >
                                    Priority: {item.priority}
                                  </span>
                                  <span
                                    style={{
                                      padding: "5px 10px",
                                      borderRadius: 999,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      ...urgencyStyle,
                                    }}
                                  >
                                    Urgency: {item.recommendation.urgency}
                                  </span>
                                </div>
                              </div>
              
                              <div
                                style={{
                                  padding: 16,
                                  borderRadius: 10,
                                  background: "var(--surface-secondary)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--muted)",
                                    fontWeight: 700,
                                    marginBottom: 6,
                                  }}
                                >
                                  RECOMMENDED ACTION
                                </div>
                                <div style={{ fontWeight: 700, lineHeight: 1.5 }}>
                                  {item.recommendation.action}
                                </div>
                                <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
                                  {item.recommendation.reason}
                                </p>
                              </div>
              
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "var(--muted)",
                                      marginBottom: 5,
                                    }}
                                  >
                                    RESPONSIBLE DEPARTMENT
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.recommendation.assignedDepartment || "Unassigned"}
                                  </div>
                                </div>
              
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "var(--muted)",
                                      marginBottom: 5,
                                    }}
                                  >
                                    HUMAN REVIEW
                                  </div>
                                  <div style={{ fontWeight: 700 }}>
                                    {item.recommendation.requiresHumanReview
                                      ? "Required before action"
                                      : "Not flagged by this rule"}
                                  </div>
                                </div>
                              </div>
              
                              {item.recommendation.requiresHumanReview && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 10,
                                    padding: 12,
                                    borderRadius: 10,
                                    background: "var(--surface-secondary)",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  <ShieldCheck size={19} style={{ flexShrink: 0 }} />
                                  <div>
                                    <strong>Human approval required</strong>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>
                                      This recommendation is advisory. An authorized
                                      person must review it before any consequential
                                      operational action.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
              
                  <p
                    style={{
                      marginBottom: 0,
                      marginTop: 20,
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Recommendations are generated by predefined rules. They do not
                    execute actions or modify operational records by themselves.
                  </p>
                </div>
              )}

              {communicationResults && (
                <div className="panel" style={{ marginBottom: 20, padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div className="eyebrow">AGENT ANALYSIS · STAGE 04</div>
                      <h2 style={{ marginTop: 6, marginBottom: 8 }}>
                        Communication Agent Results
                      </h2>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Departmental follow-up drafts prepared for human review.
                      </p>
                    </div>
              
                    <span className="coming-soon">DRAFTS ONLY · NO AUTO-SENDING</span>
                  </div>
              
                  <div className="metrics-grid">
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records reviewed</div>
                      <div className="metric-value">
                        {communicationResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records assessed</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Drafts generated</div>
                      <div className="metric-value">
                        {communicationResults.summary.draftsGenerated}
                      </div>
                      <div className="metric-foot">Prepared for review</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Records skipped</div>
                      <div className="metric-value">
                        {communicationResults.summary.recordsSkipped}
                      </div>
                      <div className="metric-foot">No draft prepared</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Require review</div>
                      <div className="metric-value">
                        {communicationResults.summary.draftsRequiringReview}
                      </div>
                      <div className="metric-foot">Human review required</div>
                    </div>
                  </div>
              
                  {communicationResults.results.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 20, padding: 24 }}>
                      <div className="empty-state-icon">
                        <CheckCircle2 size={25} />
                      </div>
                      <h3>No communication records returned</h3>
                      <p>
                        The Communication Agent did not return any records for
                        review during this scan.
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div className="section-heading" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Departmental follow-ups</h3>
                          <p style={{ marginTop: 5 }}>
                            Review each draft before using it.
                          </p>
                        </div>
                        <span className="count-pill">
                          {communicationResults.summary.draftsGenerated} drafts
                        </span>
                      </div>
              
                      <div style={{ display: "grid", gap: 14 }}>
                        {communicationResults.results.map((item) => {
                          const draftReady = item.status === "draft_ready";
              
                          return (
                            <article
                              key={item.reference}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: 18,
                                display: "grid",
                                gap: 14,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  flexWrap: "wrap",
                                  gap: 12,
                                }}
                              >
                                <div style={{ flex: "1 1 240px" }}>
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    ISSUE REFERENCE · {item.reference}
                                  </div>
                                  <h4 style={{ margin: 0, fontSize: 17 }}>
                                    {item.title || "Untitled operational issue"}
                                  </h4>
                                </div>
              
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: draftReady ? "#166534" : "#92400e",
                                    background: draftReady ? "#dcfce7" : "#fef3c7",
                                  }}
                                >
                                  {draftReady ? "DRAFT READY FOR REVIEW" : "SKIPPED"}
                                </span>
                              </div>
              
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    RESPONSIBLE DEPARTMENT
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.department || "Unassigned"}
                                  </div>
                                </div>
              
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    RECORD STATUS
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.status === "draft_ready"
                                      ? "Draft prepared"
                                      : item.status || "Not specified"}
                                  </div>
                                </div>
                              </div>
              
                              <div
                                style={{
                                  padding: 14,
                                  borderRadius: 10,
                                  background: "var(--surface-secondary)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--muted)",
                                    fontWeight: 700,
                                    marginBottom: 6,
                                  }}
                                >
                                  REASON FOR FOLLOW-UP
                                </div>
                                <p style={{ margin: 0, lineHeight: 1.6 }}>
                                  {item.reason || "No reason was provided."}
                                </p>
                              </div>
              
                              {item.draft ? (
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 12,
                                    padding: 16,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                      gap: 10,
                                      marginBottom: 14,
                                    }}
                                  >
                                    <h4 style={{ margin: 0, fontSize: 16 }}>
                                      Proposed message
                                    </h4>
              
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#92400e",
                                        background: "#fef3c7",
                                        padding: "5px 9px",
                                        borderRadius: 999,
                                      }}
                                    >
                                      {item.requiresHumanReview
                                        ? "HUMAN REVIEW REQUIRED"
                                        : "REVIEW BEFORE USE"}
                                    </span>
                                  </div>
              
                                  <div style={{ marginBottom: 14 }}>
                                    <div
                                      style={{
                                        color: "var(--muted)",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        marginBottom: 6,
                                      }}
                                    >
                                      SUBJECT
                                    </div>
                                    <div style={{ fontWeight: 600, lineHeight: 1.5 }}>
                                      {item.draft.subject}
                                    </div>
                                  </div>
              
                                  <div>
                                    <div
                                      style={{
                                        color: "var(--muted)",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        marginBottom: 6,
                                      }}
                                    >
                                      MESSAGE BODY
                                    </div>
              
                                    <pre
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                        fontFamily: "inherit",
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        margin: 0,
                                        padding: 16,
                                        borderRadius: 10,
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                      }}
                                    >
                                      {item.draft.body}
                                    </pre>
                                  </div>
              
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 9,
                                      marginTop: 14,
                                      fontSize: 13,
                                      color: "var(--muted)",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                                    <span>
                                      This is an unsent draft. Verify its content and
                                      intended recipient before using it. No message
                                      is sent by this agent.
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    padding: 14,
                                    borderRadius: 10,
                                    background: "var(--surface-secondary)",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  <strong>No draft prepared for this record.</strong>
                                  <p style={{ margin: "5px 0 0" }}>
                                    {item.reason ||
                                      "This record was skipped by the current communication rules."}
                                  </p>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
              
                  <p
                    style={{
                      marginBottom: 0,
                      marginTop: 20,
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Communication drafts are advisory. This prototype does not
                    send messages automatically or connect to hospital messaging systems.
                  </p>
                </div>
              )}

              {auditResults && (
                <div className="panel" style={{ marginBottom: 20, padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div className="eyebrow">AGENT ANALYSIS · STAGE 05</div>
                      <h2 style={{ marginTop: 6, marginBottom: 8 }}>
                        Audit Agent Results
                      </h2>
                      <p style={{ margin: 0, color: "var(--muted)" }}>
                        Review of workflow actions, approval decisions, and associated audit events.
                      </p>
                    </div>
              
                    <span className="coming-soon">LIMITED AUDIT CHECKS</span>
                  </div>
              
                  <div className="metrics-grid">
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Actions reviewed</div>
                      <div className="metric-value">
                        {auditResults.summary.actionsReviewed}
                      </div>
                      <div className="metric-foot">Workflow actions assessed</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Audit events</div>
                      <div className="metric-value">
                        {auditResults.summary.auditEventsReviewed}
                      </div>
                      <div className="metric-foot">Associated events examined</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Passed checks</div>
                      <div className="metric-value">
                        {auditResults.summary.passed}
                      </div>
                      <div className="metric-foot">Passed the current rules</div>
                    </div>
              
                    <div className="metric-card dashboard-green-card">
                      <div className="metric-label">Require review</div>
                      <div className="metric-value">
                        {auditResults.summary.requiringReview}
                      </div>
                      <div className="metric-foot">Need further examination</div>
                    </div>
                  </div>
              
                  {auditResults.results.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 20, padding: 24 }}>
                      <div className="empty-state-icon">
                        <ClipboardCheck size={25} />
                      </div>
                      <h3>No workflow actions available</h3>
                      <p>
                        The Audit Agent did not return any workflow actions to review
                        during this scan.
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginTop: 24 }}>
                      <div className="section-heading" style={{ marginBottom: 14 }}>
                        <div>
                          <h3 style={{ margin: 0 }}>Action review details</h3>
                          <p style={{ marginTop: 5 }}>
                            Inspect recorded decisions and findings for each action.
                          </p>
                        </div>
              
                        <span className="count-pill">
                          {auditResults.results.length} actions
                        </span>
                      </div>
              
                      <div style={{ display: "grid", gap: 14 }}>
                        {auditResults.results.map((item) => {
                          const requiresReview =
                            item.findings.length > 0 ||
                            item.decision.toLowerCase().includes("review");
              
                          return (
                            <article
                              key={item.actionId}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: 12,
                                padding: 18,
                                display: "grid",
                                gap: 14,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  flexWrap: "wrap",
                                  gap: 12,
                                }}
                              >
                                <div style={{ flex: "1 1 240px" }}>
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    WORKFLOW ACTION
                                  </div>
              
                                  <h4 style={{ margin: "0 0 6px", fontSize: 17 }}>
                                    {item.actionType}
                                  </h4>
              
                                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                                    {item.description || "No description provided."}
                                  </p>
              
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginTop: 8,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    Action ID: {item.actionId}
                                  </div>
                                </div>
              
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: requiresReview ? "#92400e" : "#166534",
                                    background: requiresReview ? "#fef3c7" : "#dcfce7",
                                  }}
                                >
                                  {requiresReview ? "REVIEW NEEDED" : "NO FINDINGS REPORTED"}
                                </span>
                              </div>
              
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    ACTION STATUS
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.status || "Not specified"}
                                  </div>
                                </div>
              
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    RECORDED DECISION
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.decision || "No decision recorded"}
                                  </div>
                                </div>
              
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    AUDIT EVENTS FOUND
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.auditEventsFound}
                                  </div>
                                </div>
              
                                <div
                                  style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      color: "var(--muted)",
                                      fontSize: 12,
                                      marginBottom: 5,
                                    }}
                                  >
                                    APPROVAL REQUIREMENT
                                  </div>
                                  <div style={{ fontWeight: 600 }}>
                                    {item.requiresHumanApproval
                                      ? "Human approval required"
                                      : "Not flagged as required"}
                                  </div>
                                </div>
                              </div>
              
                              <div
                                style={{
                                  borderRadius: 10,
                                  padding: 14,
                                  background: "var(--surface-secondary)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    marginBottom: 8,
                                  }}
                                >
                                  AUDIT FINDINGS
                                </div>
              
                                {item.findings.length > 0 ? (
                                  <ul
                                    style={{
                                      margin: 0,
                                      paddingLeft: 20,
                                      lineHeight: 1.8,
                                    }}
                                  >
                                    {item.findings.map((finding, index) => (
                                      <li key={`${item.actionId}-finding-${index}`}>
                                        {finding}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p style={{ margin: 0, lineHeight: 1.6 }}>
                                    No findings were reported by the current audit rules.
                                    This is not a guarantee that the action is safe or
                                    compliant.
                                  </p>
                                )}
                              </div>
              
                              {item.requiresHumanApproval && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 10,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  <ShieldCheck size={19} style={{ flexShrink: 0 }} />
                                  <div>
                                    <strong>Human approval is part of this workflow</strong>
                                    <div
                                      style={{
                                        color: "var(--muted)",
                                        fontSize: 13,
                                        marginTop: 4,
                                      }}
                                    >
                                      Verify the recorded decision and supporting audit
                                      events before relying on this action's status.
                                    </div>
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
              
                  <div
                    style={{
                      marginTop: 20,
                      padding: 14,
                      borderRadius: 10,
                      background: "var(--surface-secondary)",
                      fontSize: 13,
                      lineHeight: 1.7,
                      color: "var(--muted)",
                    }}
                  >
                    <strong>Audit limitation:</strong> This prototype performs limited,
                    rule-based checks of workflow actions and associated audit events.
                    It does not constitute a comprehensive compliance, security, or
                    clinical safety audit, and a recorded decision alone does not
                    establish that an action was appropriate.
                  </div>
                </div>
              )}
              
              <div className="workflow-list">
                {[
                  ["01", "Intake Agent", "Validate incoming records and required fields.", FileText],
                  ["02", "Bottleneck Detection", "Flag delays, missing information, and conflicting statuses.", AlertTriangle],
                  ["03", "Workflow Coordinator", "Apply operational rules and suggest next steps.", Workflow],
                  ["04", "Communication Agent", "Prepare departmental follow-up drafts for review.", MessageSquareText],
                  ["05", "Audit Agent", "Check proposed actions and record the decision trail.", ShieldCheck]
                ].map(([number, name, description, Icon]) => {
                  const WorkflowIcon = Icon as typeof Activity;
                  return (
                    <div className="workflow-row" key={number as string}>
                      <div className="workflow-number">{number as string}</div>
                      <div className="workflow-icon"><WorkflowIcon size={20} /></div>
                      <div className="workflow-copy">
                        <strong>{name as string}</strong>
                        <p>{description as string}</p>
                      </div>
                      <span className="coming-soon">
                        {number === "01"
                          ? intakeResults
                            ? "COMPLETED"
                            : "READY"
                          : number === "02"
                            ? bottleneckResults
                              ? "COMPLETED"
                              : "READY"
                            : number === "03"
                              ? coordinatorResults
                                ? "COMPLETED"
                                : "READY"
                              : number === "04"
                                ? communicationResults
                                  ? "COMPLETED"
                                  : "READY"
                                : number === "05"
                                  ? auditResults
                                    ? "COMPLETED"
                                    : "READY"
                                  : "PLANNED"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {scanMessage && <div className="inline-feedback"><CheckCircle2 size={17} />{scanMessage}</div>}
            </section>
          ) : activeNav === "Departments" ? (
            <section className="secondary-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">HOSPITAL OPERATIONS</div>
                  <h1>Departments</h1>
                  <p>
                    Department information and issue counts loaded from Supabase.
                  </p>
                </div>

                <button
                  className="secondary-button"
                  onClick={() => void loadDepartments()}
                  disabled={departmentsLoading}
                >
                  <RefreshCw
                    size={16}
                    className={departmentsLoading ? "spin" : ""}
                  />
                  {departmentsLoading ? "Refreshing…" : "Refresh departments"}
                </button>
              </div>

              {departmentsError && (
                <div className="inline-feedback" role="alert">
                  <AlertTriangle size={17} />
                  {departmentsError}
                  <button
                    className="secondary-button compact-button"
                    onClick={() => void loadDepartments()}
                    disabled={departmentsLoading}
                  >
                    Try again
                  </button>
                </div>
              )}

              {departmentsLoading && departments.length === 0 && (
                <div className="inline-feedback">
                  <RefreshCw size={17} className="spin" />
                  Loading departments from Supabase…
                </div>
              )}

              {!departmentsLoading &&
                !departmentsError &&
                departments.length === 0 && (
                  <div className="empty-state">
                    <Users size={25} />
                    <h3>No departments found</h3>
                    <p>
                      No department records were returned by the database.
                    </p>
                  </div>
                )}

              <div className="department-grid">
                {departments.map((department) => (
                  <article className="panel" key={department.id}>
                    <div className="department-card-icon">
                      <Users size={20} />
                    </div>

                    <h3>{department.name}</h3>

                    <p>
                      {department.description ||
                        "No description available."}
                    </p>

                    <div className="metric-foot">
                      <span>Open issues</span>
                      <strong>{department.openIssues}</strong>
                    </div>

                    <div className="metric-foot">
                      <span>Total issues</span>
                      <strong>{department.totalIssues}</strong>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => {
                        setSearchQuery(department.name);
                        setActiveNav("All issues");
                      }}
                    >
                      View issues <ArrowRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : activeNav === "Operations timeline" || activeNav === "Reports & audit" ? (
            <section className="secondary-page">
              <div className="page-heading">
                <div>
                  <div className="eyebrow">TRANSPARENCY & OVERSIGHT</div>
                  <h1>{activeNav}</h1>
                  <p>{activeNav === "Operations timeline" ? "A chronological view of findings, recommendations, and human decisions." : "Review operational activity and audit evidence."}</p>
                </div>
              </div> 
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    {activeNav === "Reports & audit"
                      ? "Audit event history"
                      : "Operations event timeline"}
                  </h2>
                  <p>
                    Recorded events retrieved from the Supabase audit log.
                  </p>
                </div>
            
                <button
                  className="secondary-button compact-button"
                  onClick={loadAuditEvents}
                  disabled={auditLoading}
                >
                  <RefreshCw
                    size={14}
                    className={auditLoading ? "spin" : ""}
                  />
                  {auditLoading ? "Refreshing…" : "Refresh history"}
                </button>
              </div>
            
              {auditError && (
                <div className="inline-feedback" role="alert">
                  <AlertTriangle size={17} />
                  {auditError}
                  <button
                    className="secondary-button compact-button"
                    onClick={loadAuditEvents}
                    disabled={auditLoading}
                  >
                    Try again
                  </button>
                </div>
              )}
            
              {auditLoading && auditEvents.length === 0 && (
                <div className="inline-feedback">
                  <RefreshCw size={17} className="spin" />
                  Loading audit history…
                </div>
              )}
            
              {!auditLoading && !auditError && auditEvents.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <ShieldCheck size={25} />
                  </div>
                  <h3>No audit events yet</h3>
                  <p>
                    Recorded workflow events will appear here when available.
                  </p>
                </div>
              )}
            
              {auditEvents.length > 0 && (
                <div className="workflow-list">
                  {auditEvents.map((event, index) => {
                    const issueForAuditEvent = issues.find(
                      (issue) =>
                        issue.id === event.issue_id ||
                        issue.id === event.details?.synthetic_reference
                    );
                    
                    const reference =
                      typeof event.details?.synthetic_reference === "string"
                        ? event.details.synthetic_reference
                        : issueForAuditEvent?.id ?? null;

                    const note =
                      typeof event.details?.note === "string"
                        ? event.details.note
                        : null;
            
                    return (
                      <div className="workflow-row" key={event.id}>
                        <div className="workflow-number">
                          {String(index + 1).padStart(2, "0")}
                        </div>
            
                        <div className="workflow-icon">
                          <ShieldCheck size={20} />
                        </div>
            
                        <div className="workflow-copy">
                          <strong>
                            {event.event_type.replaceAll("_", " ")}
                          </strong>
                          
                          <p>
                            {reference
                              ? `Issue: ${reference}`
                              : event.issue_id
                                ? `Issue record: ${event.issue_id}`
                                : "System workflow event"}
                          </p>
            
                          {note && <p>{note}</p>}
            
                          <p>
                            {new Date(event.created_at).toLocaleString()} ·
                            {" "}{event.actor_type}
                          </p>
                        </div>
            
                        <span className="coming-soon">RECORDED</span>
                      </div>
                    );
                  })}
                </div>
              )}
            
              <div className="panel-footer-button">
                Showing up to 100 most recent events.
              </div>
            </div>
            </section>
            ) : (
              <>
              <div className={`page-heading ${isOverview ? "hf-hide-dashboard-heading" : ""}`}>
                <div>
                  <div className="eyebrow">
                    {isApprovals ? "HUMAN OVERSIGHT" : "MONDAY, OCTOBER 19 · DEMO DATA"}
                  </div>
                  <h1>
                    {isApprovals
                      ? "Pending approvals"
                      : isOverview
                        ? "Operations dashboard"
                        : activeNav === "All issues"
                          ? "All operational issues"
                          : activeNav}
                  </h1>
                  <p>
                    {isApprovals
                      ? "Review recommendations before any consequential action is taken."
                      : activeNav === "All issues"
                        ? "Search, filter, and inspect unresolved operational bottlenecks."
                        : isOverview
                          ? "Your hospital operations at a glance."
                          : "Monitor and coordinate hospital operational workflows."}
                  </p>
                </div>
                <div className="heading-actions">
                  <button className="secondary-button" onClick={runScan} disabled={scanRunning}>
                    <RefreshCw size={16} className={scanRunning ? "spin" : ""} />
                    {scanRunning ? "Scanning…" : "Refresh data"}
                  </button>
                  <button className="primary-button" onClick={() => {
                    setActiveNav("All issues");
                    setSearchQuery("");
                    setPriorityFilter("All priorities");
                    setStatusFilter("All statuses");
                  }}>
                    <Zap size={16} />
                    View operations
                  </button>
                </div>
              </div>

              {activeNav === "Upload CSV" && (
                <section
                  className="panel"
                  style={{ padding: 24, marginBottom: 24 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div className="eyebrow">DATA INTAKE</div>
                      <h2 style={{ margin: "8px 0" }}>Upload your CSV</h2>
                      <p style={{ marginTop: 0 }}>
                        Validate operational records before importing them into the database.
                      </p>
                    </div>
                    <span className="coming-soon">CSV IMPORT</span>
                  </div>
            
                  <div style={{ padding: 16, border: "1px dashed var(--border-color, #64748b)", borderRadius: 12 }}>
                    <label htmlFor="hospitalflow-csv" style={{ display: "block", fontWeight: 600, marginBottom: 10 }}>
                      Select a CSV file
                    </label>
                    <input
                      id="hospitalflow-csv"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => {
                        setCsvFile(event.target.files?.[0] ?? null);
                        setCsvSummary(null);
                        setCsvValidRows([]);
                        setCsvInvalidRows([]);
                        setCsvBatchId("");
                        setCsvMessage("");
                      }}
                    />
                    <p style={{ fontSize: 13, marginBottom: 0 }}>
                      Use the CSV template and required columns supported by the validation API.
                      Upload synthetic or non-identifiable operational data only.
                    </p>
                  </div>
            
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={validateCsvUpload}
                      disabled={!csvFile || csvLoading || csvImporting}
                    >
                      {csvLoading ? "Validating…" : "Validate CSV"}
                    </button>
            
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={importCsvRows}
                      disabled={!csvSummary || csvValidRows.length === 0 || csvLoading || csvImporting}
                    >
                      {csvImporting ? "Importing…" : `Import ${csvValidRows.length} valid record(s)`}
                    </button>
                  </div>
            
                  {csvMessage && (
                    <div className="inline-feedback" role="status" style={{ marginTop: 16 }}>
                      {csvMessage}
                    </div>
                  )}
            
                  {csvSummary && (
                    <div style={{ marginTop: 20 }}>
                      <h3>Validation summary</h3>
                      <div className="metrics-grid">
                        <div className="metric-card">
                          <div className="metric-label">Total records</div>
                          <div className="metric-value">{csvSummary.totalRecords}</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">Valid records</div>
                          <div className="metric-value">{csvSummary.validRecords}</div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-label">Invalid records</div>
                          <div className="metric-value">{csvSummary.invalidRecords}</div>
                        </div>
                      </div>
            
                      {csvValidRows.length > 0 && (
                        <>
                          <h3 style={{ marginTop: 24 }}>Valid records preview</h3>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  {["reference", "title", "department", "priority", "status"].map((column) => (
                                    <th key={column} style={{ textAlign: "left", padding: 10 }}>
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {csvValidRows.slice(0, 10).map((row, index) => (
                                  <tr key={`${String(row.reference ?? "row")}-${index}`}>
                                    {["reference", "title", "department", "priority", "status"].map((column) => (
                                      <td key={column} style={{ padding: 10, borderTop: "1px solid var(--border-color, #e5e7eb)" }}>
                                        {String(row[column] ?? "—")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {csvValidRows.length > 10 && (
                            <p>Showing the first 10 of {csvValidRows.length} valid records.</p>
                          )}
                        </>
                      )}
            
                      {csvInvalidRows.length > 0 && (
                        <>
                          <h3 style={{ marginTop: 24 }}>Invalid records</h3>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left", padding: 10 }}>Row</th>
                                  <th style={{ textAlign: "left", padding: 10 }}>Reference</th>
                                  <th style={{ textAlign: "left", padding: 10 }}>Title</th>
                                  <th style={{ textAlign: "left", padding: 10 }}>Validation findings</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvInvalidRows.slice(0, 20).map((row, index) => (
                                  <tr key={`invalid-${index}`}>
                                    <td style={{ padding: 10 }}>{String(row.rowNumber ?? row.row ?? index + 1)}</td>
                                    <td style={{ padding: 10 }}>{String(row.reference ?? "—")}</td>
                                    <td style={{ padding: 10 }}>{String(row.title ?? "—")}</td>
                                    <td style={{ padding: 10 }}>
                                      {Array.isArray(row.findings)
                                        ? row.findings.join(", ")
                                        : Array.isArray(row.errors)
                                          ? row.errors.join(", ")
                                          : String(row.error ?? row.message ?? "Check this row")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
            
                      {csvBatchId && (
                        <p style={{ marginTop: 16 }}>
                          <strong>Imported batch ID:</strong> {csvBatchId}
                        </p>
                      )}
            
                      {csvBatchId && (
                        <div className="inline-feedback" style={{ marginTop: 12 }}>
                          The records have been imported. Batch-specific agent execution is not enabled by this interface yet; the existing Demo Run remains a separate workflow.
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
                
              {scanMessage && (
                <div className="inline-feedback">
                  <CheckCircle2 size={17} />
                  {scanMessage}
                  <button aria-label="Dismiss message" onClick={() => setScanMessage("")}><X size={15} /></button>
                </div>
              )}

              
              {activeNav !== "Upload CSV" && isOverview && (
                <div className="hf-dashboard">
                  <section className="hf-welcome">
                    <div className="hf-welcome-icon"><Activity size={28} /></div>
                    <div className="hf-welcome-copy">
                      <h1>Welcome to HospitalFlow AI</h1>
                      <p>Operational insights for better hospital performance.</p>
                    </div>
                    <div className="hf-welcome-art"><HeartPulse size={94} strokeWidth={1.1} /></div>
                  </section>

                  <section className="hf-stat-grid" aria-label="Operational summary">
                    <button className="hf-stat-card" onClick={() => { setActiveNav("All issues"); setPriorityFilter("Critical"); setStatusFilter("All statuses"); }}>
                      <div className="hf-stat-top"><span className="hf-stat-icon red"><AlertTriangle size={19} /></span><span>Critical issues</span></div>
                      <div className="hf-stat-number">{criticalCount}</div>
                      <div className="hf-stat-bottom"><span className="hf-trend red-text">↑ {criticalCount}</span><span>need attention</span><svg viewBox="0 0 90 38" aria-hidden="true"><path d="M2 32 L14 24 L24 27 L36 15 L47 19 L58 9 L67 14 L78 5 L88 2" /></svg></div>
                    </button>
                    <button className="hf-stat-card" onClick={() => { setActiveNav("All issues"); setPriorityFilter("High"); setStatusFilter("All statuses"); }}>
                      <div className="hf-stat-top"><span className="hf-stat-icon amber"><AlertTriangle size={19} /></span><span>High priority</span></div>
                      <div className="hf-stat-number">{issues.filter(i => i.priority === "High" && i.status !== "Resolved").length}</div>
                      <div className="hf-stat-bottom"><span className="hf-trend amber-text">↑ {issues.filter(i => i.priority === "High" && i.status !== "Resolved").length}</span><span>open records</span><svg viewBox="0 0 90 38" aria-hidden="true"><path d="M2 32 L14 23 L24 27 L36 15 L47 20 L58 9 L67 15 L78 5 L88 2" /></svg></div>
                    </button>
                    <button className="hf-stat-card" onClick={() => { setActiveNav("All issues"); setPriorityFilter("Medium"); setStatusFilter("All statuses"); }}>
                      <div className="hf-stat-top"><span className="hf-stat-icon blue"><Activity size={19} /></span><span>Medium priority</span></div>
                      <div className="hf-stat-number">{issues.filter(i => i.priority === "Medium" && i.status !== "Resolved").length}</div>
                      <div className="hf-stat-bottom"><span className="hf-trend blue-text">↑ {issues.filter(i => i.priority === "Medium" && i.status !== "Resolved").length}</span><span>open records</span><svg viewBox="0 0 90 38" aria-hidden="true"><path d="M2 32 L14 24 L24 27 L36 15 L47 19 L58 9 L67 14 L78 5 L88 2" /></svg></div>
                    </button>
                    <button className="hf-stat-card" onClick={() => { setActiveNav("All issues"); setStatusFilter("Resolved"); setPriorityFilter("All priorities"); }}>
                      <div className="hf-stat-top"><span className="hf-stat-icon green"><Check size={19} /></span><span>Resolved issues</span></div>
                      <div className="hf-stat-number">{resolvedCount}</div>
                      <div className="hf-stat-bottom"><span className="hf-trend green-text">✓ {resolvedCount}</span><span>marked resolved</span><svg viewBox="0 0 90 38" aria-hidden="true"><path d="M2 32 L14 24 L24 27 L36 15 L47 19 L58 9 L67 14 L78 5 L88 2" /></svg></div>
                    </button>
                  </section>

                  <section className="hf-main-grid">
                    <div className="hf-card hf-issues-card">
                      <div className="hf-card-heading"><div className="hf-heading-icon"><ListTodo size={20} /></div><h2>Operational issues</h2><button className="hf-link" onClick={() => setActiveNav("All issues")}>View all <ArrowRight size={15} /></button></div>
                      <div className="hf-table-wrap"><table className="hf-table"><thead><tr><th>Issue</th><th>Priority</th><th>Department</th><th>Detected</th><th>Status</th></tr></thead><tbody>
                        {issues.filter(i => i.status !== "Resolved").slice(0, 5).map(issue => <tr key={issue.id} onClick={() => setSelectedIssue(issue)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter") setSelectedIssue(issue); }}>
                          <td><span className={`hf-row-icon ${issue.priority.toLowerCase()}`}>{issue.priority === "Critical" ? <AlertTriangle size={16}/> : issue.priority === "High" ? <AlertTriangle size={16}/> : <Activity size={16}/>}</span><span className="hf-issue-title">{issue.title}</span></td>
                          <td><span className={`hf-pill ${issue.priority.toLowerCase()}`}>{issue.priority}</span></td><td>{issue.department}</td><td>{issue.age}</td><td><span className={`hf-status-pill ${issue.status.toLowerCase().replace(" ", "-")}`}>{issue.status}</span></td>
                        </tr>)}
                        {issues.filter(i => i.status !== "Resolved").length === 0 && <tr><td colSpan={5} className="hf-empty">No unresolved operational issues.</td></tr>}
                      </tbody></table></div>
                      <div className="hf-card-bottom"><span>{dataLoading ? "Refreshing records…" : `${issues.length} records loaded from Supabase`}</span><button className="hf-link" onClick={() => setActiveNav("All issues")}>View all issues <ArrowRight size={15}/></button></div>
                    </div>

                    <div className="hf-right-stack">
                      <section className="hf-card hf-health-card">
                        <div className="hf-card-heading"><div className="hf-heading-icon"><Activity size={19}/></div><h2>System health</h2><span className="hf-health-label"><span/> Operational</span></div>
                        <div className="hf-health-content"><div className="hf-health-ring"><div><strong>94%</strong><span>Operational</span></div></div><div className="hf-health-list"><div><i/> <span>Infrastructure</span><strong>Healthy</strong></div><div><i/> <span>Applications</span><strong>Healthy</strong></div><div><i/> <span>Data pipeline</span><strong>{dataError ? "Attention" : "Healthy"}</strong></div><div><i/> <span>Security</span><strong>Healthy</strong></div></div></div>
                      </section>
                      
                      <section className="hf-card hf-activity-card">
                        <div className="hf-card-heading">
                          <div className="hf-heading-icon">
                            <Clock3 size={19} />
                          </div>
                          <h2>Recent activity</h2>
                          <button
                            className="hf-icon-link"
                            title="Refresh activity"
                            onClick={() => void loadAuditEvents()}
                          >
                            <RefreshCw size={15} />
                          </button>
                        </div>
                      
                        <div className="hf-activity-list">
                          {auditEvents.slice(0, 4).map((event, index) => {
                            const issue = issues.find((i) => i.id === event.issue_id);
                            const details = event.details ?? {};
                            const reference =
                              typeof details.synthetic_reference === "string"
                                ? details.synthetic_reference
                                : null;
                      
                            const rawStatus =
                              typeof details.new_status === "string"
                                ? details.new_status
                                : typeof details.status === "string"
                                  ? details.status
                                  : null;
                      
                            const statusLabel = rawStatus
                              ? rawStatus.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                              : null;
                      
                            const eventLabel = event.event_type
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase());
                      
                            const label = issue?.title || reference || eventLabel;
                            const isResolved = /resolved|approved|completed/i.test(
                              `${event.event_type} ${rawStatus ?? ""}`
                            );
                            const isRejected = /reject/i.test(
                              `${event.event_type} ${rawStatus ?? ""}`
                            );
                      
                            return (
                              <div className="hf-activity-row" key={event.id}>
                                <span
                                  className={`hf-activity-icon ${
                                    isResolved
                                      ? "positive"
                                      : isRejected
                                        ? "alert"
                                        : index % 2
                                          ? "blue"
                                          : "alert"
                                  }`}
                                >
                                  {isResolved ? (
                                    <Check size={14} />
                                  ) : /report|audit/i.test(event.event_type) ? (
                                    <FileText size={14} />
                                  ) : (
                                    <AlertTriangle size={14} />
                                  )}
                                </span>
                      
                                <span className="hf-activity-text">
                                  <span>{label}</span>
                                  <span>
                                    {eventLabel}
                                    {statusLabel ? ` · ${statusLabel}` : ""}
                                  </span>
                                </span>
                      
                                <time>
                                  {new Date(event.created_at).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </time>
                              </div>
                            );
                          })}
                      
                          {auditEvents.length === 0 && (
                            <div className="hf-activity-empty">
                              {auditLoading
                                ? "Loading recent activity…"
                                : "No activity has been recorded yet."}
                            </div>
                          )}
                        </div>
                      
                        <div className="hf-card-bottom">
                          <button
                            className="hf-link"
                            onClick={() => setActiveNav("Operations timeline")}
                          >
                            View all activity <ArrowRight size={15} />
                          </button>
                        </div>
                      </section>

                    </div>
                  </section>
                </div>
              )}


              {activeNav === "All issues" && (
                <section className="panel all-issues-panel">
                  <div className="panel-header issues-table-header">
                    <div>
                      <h2>{isApprovals ? "Items awaiting human review" : "Operational issue register"}</h2>
                      <p>{filteredIssues.length} matching record{filteredIssues.length === 1 ? "" : "s"} · Synthetic demonstration data</p>
                    </div>
                    <button className="secondary-button compact-button" onClick={() => {
                      setSearchQuery("");
                      setPriorityFilter("All priorities");
                      setStatusFilter("All statuses");
                    }}><RefreshCw size={14} /> Reset filters</button>
                  </div>

                  <div className="table-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search issue, ID, or department…" aria-label="Search issues" />
                      {searchQuery && <button aria-label="Clear search" onClick={() => setSearchQuery("")}><X size={14} /></button>}
                    </div>
                    <button className={`secondary-button compact-button ${showFilters ? "filter-active" : ""}`} onClick={() => setShowFilters((value) => !value)}><Filter size={15} /> Filters <ChevronDown size={14} /></button>
                  </div>

                  {showFilters && (
                    <div className="filter-row">
                      <label>Priority
                        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                          <option>All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </label>
                      <label>Status
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                          <option>All statuses</option><option>Open</option><option>In review</option><option>Resolved</option>
                        </select>
                      </label>
                    </div>
                  )}

                  <div className="table-scroll">
                    <table className="issues-table">
                      <thead><tr><th>ISSUE</th><th>DEPARTMENT</th><th>PRIORITY</th><th>STATUS</th><th>AGE</th><th /></tr></thead>
                      <tbody>
                        {filteredIssues.map((issue) => (
                          <tr key={issue.id} onClick={() => setSelectedIssue(issue)}>
                            <td><div className="table-issue"><div className={`issue-type-icon issue-type-${issue.icon}`}><IssueIcon type={issue.icon} /></div><div><strong>{issue.title}</strong><span>{issue.id} · {issue.category}</span></div></div></td>
                            <td>{issue.department}</td>
                            <td><PriorityBadge priority={issue.priority} /></td>
                            <td><StatusBadge status={issue.status} /></td>
                            <td><span className="issue-age"><Clock3 size={12} />{issue.age}</span></td>
                            <td><button className="icon-button small-icon" aria-label={`Open ${issue.id}`} onClick={(event) => { event.stopPropagation(); setSelectedIssue(issue); }}><ChevronRight size={16} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredIssues.length === 0 && (
                      <div className="no-results"><Search size={23} /><strong>No matching issues</strong><span>Try a different search term or reset the filters.</span></div>
                    )}
                  </div>
                </section>
              )}
              
              {isApprovals && (
                <section className="panel all-issues-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Items awaiting human approval</h2>
                      <p>
                        Approval actions retrieved from Supabase.
                        {" "}{approvals.length} record{approvals.length === 1 ? "" : "s"} found.
                      </p>
                    </div>
                    <button
                      className="secondary-button compact-button"
                      onClick={loadApprovals}
                      disabled={approvalsLoading}
                    >
                      <RefreshCw
                        size={14}
                        className={approvalsLoading ? "spin" : ""}
                      />
                      {approvalsLoading ? "Refreshing…" : "Refresh approvals"}
                    </button>
                  </div>
              
                  {approvalsError && (
                    <div className="inline-feedback" role="alert">
                      <AlertTriangle size={17} />
                      {approvalsError}
                    </div>
                  )}
              
                  {approvalsLoading && approvals.length === 0 && (
                    <div className="inline-feedback">
                      <RefreshCw size={17} className="spin" />
                      Loading approval records…
                    </div>
                  )}
              
                  {!approvalsLoading && !approvalsError && approvals.length === 0 && (
                    <div className="empty-state">
                      <ShieldCheck size={25} />
                      <h3>No approval records found</h3>
                      <p>Refresh to check for pending workflow actions.</p>
                    </div>
                  )}
              
                  <div className="workflow-list">
                    {approvals.map((approval) => (
                      <div className="workflow-row" key={approval.id}>
                        <div className="workflow-icon">
                          <ShieldCheck size={20} />
                        </div>
              
                        <div className="workflow-copy">
                          <strong>
                            {approval.operational_issues?.title || approval.action_type}
                          </strong>
                          <p>{approval.description}</p>
                          <p>
                            Department: {approval.departments?.name || "Unassigned"}
                          </p>
                          <p>
                            Issue: {approval.operational_issues?.synthetic_reference || "Demo record"}
                            {" · "}
                            Priority: {approval.operational_issues?.priority || "Unknown"}
                          </p>
                          <p>
                            Workflow status: {approval.status.replaceAll("_", " ")}
                          </p>
                        </div>
              
                        <div className="approval-actions">
                          <span className="coming-soon">
                            {approval.status.replaceAll("_", " ").toUpperCase()}
                          </span>
                        
                          {["pending", "awaiting_approval", "requires_human_approval"].includes(
                            approval.status
                          ) && (
                            <div className="approval-buttons">
                              <button
                                className="primary-button"
                                onClick={() =>
                                  void handleApprovalDecision(approval.id, "approve")
                                }
                              >
                                Approve
                              </button>
                        
                              <button
                                className="secondary-button"
                                onClick={() =>
                                  void handleApprovalDecision(approval.id, "reject")
                                }
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </>
          )}

          <footer className="page-footer">
            <span><ShieldCheck size={14} /> HospitalFlow AI <span className="footer-divider">·</span> Prototype</span>
            <span>Synthetic data only <span className="footer-divider">·</span> No EHR connection</span>
          </footer>
        </div>
      </section>

      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <section className="issue-modal" role="dialog" aria-modal="true" aria-labelledby="issue-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className={`issue-type-icon issue-type-${selectedIssue.icon}`}><IssueIcon type={selectedIssue.icon} /></div>
              <button className="icon-button" aria-label="Close issue details" onClick={() => setSelectedIssue(null)}><X size={19} /></button>
            </div>
            <div className="modal-eyebrow">{selectedIssue.id} <span className="metadata-divider">·</span> {selectedIssue.category}</div>
            <h2 id="issue-modal-title">{selectedIssue.title}</h2>
            <p className="modal-description">{selectedIssue.description}</p>
            <div className="modal-badges"><PriorityBadge priority={selectedIssue.priority} /><StatusBadge status={selectedIssue.status} /></div>
            <div className="modal-details">
              <div><span>Responsible department</span><strong>{selectedIssue.department}</strong></div>
              <div><span>Time in queue</span><strong>{selectedIssue.age}</strong></div>
            </div>
            <div className="recommendation-card">
              <div className="recommendation-title"><Sparkles size={16} /> Suggested next step <span>RULE PREVIEW</span></div>
              <p>{selectedIssue.recommendation}</p>
              <small>This is a demonstration recommendation, not a live AI decision.</small>
            </div>
            <div className="modal-safety-note"><ShieldCheck size={17} /><span>Verify the underlying record before taking action. No hospital system will be changed by this prototype.</span></div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setSelectedIssue(null)}>Close</button>
              {selectedIssue.status !== "Resolved" && (
                <button className="primary-button" onClick={async () => {
                  const success = await updateIssueStatus(
                    selectedIssue.id,
                    "Resolved"
                  );
                
                  if (success) {
                    setSelectedIssue(null);
                  }
                }}><Check size={16} /> Mark resolved</button>
              )}
              {selectedIssue.status === "Open" && (
                <button className="secondary-button" onClick={async () => {await updateIssueStatus(selectedIssue.id, "In review");}}><ShieldCheck size={16} /> Review</button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
