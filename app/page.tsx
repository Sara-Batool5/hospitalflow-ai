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
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
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
      { label: "Overview", icon: LayoutDashboard },
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
      { label: "Reports & audit", icon: FileCheck2 }
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
  const [activeNav, setActiveNav] = useState("Overview");
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


  const isOverview = activeNav === "Overview";
  const isApprovals = activeNav === "Approvals";

  return (
    <main className="app-shell">
      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <HeartPulse size={25} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-name">HospitalFlow<span> AI</span></div>
            <div className="brand-caption">OPERATIONS INTELLIGENCE</div>
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

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
            <div className="breadcrumb">
              <span>HospitalFlow</span>
              <ChevronRight size={14} />
              <strong>{activeNav}</strong>
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
                    <div className="metric-card">
                      <div className="metric-label">Records checked</div>
                      <div className="metric-value">
                        {intakeResults.summary.totalRecords}
                      </div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Valid records</div>
                      <div className="metric-value">
                        {intakeResults.summary.validRecords}
                      </div>
                    </div>
              
                    <div className="metric-card">
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
                    <div className="metric-card">
                      <div className="metric-label">Records checked</div>
                      <div className="metric-value">
                        {bottleneckResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records analyzed</div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Findings detected</div>
                      <div className="metric-value">
                        {bottleneckResults.summary.bottlenecksFound}
                      </div>
                      <div className="metric-foot">Potential bottlenecks</div>
                    </div>
              
                    <div className="metric-card">
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
                    <div className="metric-card">
                      <div className="metric-label">Records reviewed</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records assessed</div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Recommendations</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.recommendationsGenerated}
                      </div>
                      <div className="metric-foot">Suggested next steps</div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Require action</div>
                      <div className="metric-value">
                        {coordinatorResults.summary.actionRequired}
                      </div>
                      <div className="metric-foot">Need follow-up</div>
                    </div>
              
                    <div className="metric-card">
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
                    <div className="metric-card">
                      <div className="metric-label">Records reviewed</div>
                      <div className="metric-value">
                        {communicationResults.summary.totalRecords}
                      </div>
                      <div className="metric-foot">Records assessed</div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Drafts generated</div>
                      <div className="metric-value">
                        {communicationResults.summary.draftsGenerated}
                      </div>
                      <div className="metric-foot">Prepared for review</div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Records skipped</div>
                      <div className="metric-value">
                        {communicationResults.summary.recordsSkipped}
                      </div>
                      <div className="metric-foot">No draft prepared</div>
                    </div>
              
                    <div className="metric-card">
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
                <div className="panel" style={{ marginBottom: 20, padding: 20 }}>
                  <h2 style={{ marginTop: 0 }}>Audit Agent Results</h2>
              
                  <p>
                    Verification of workflow actions and associated approval
                    records. Findings indicate whether additional review is needed.
                  </p>
              
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-label">Actions reviewed</div>
                      <div className="metric-value">
                        {auditResults.summary.actionsReviewed}
                      </div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Audit events</div>
                      <div className="metric-value">
                        {auditResults.summary.auditEventsReviewed}
                      </div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Passed</div>
                      <div className="metric-value">
                        {auditResults.summary.passed}
                      </div>
                    </div>
              
                    <div className="metric-card">
                      <div className="metric-label">Require review</div>
                      <div className="metric-value">
                        {auditResults.summary.requiringReview}
                      </div>
                    </div>
                  </div>
              
                  {auditResults.results.length === 0 ? (
                    <p style={{ marginTop: 16 }}>
                      No workflow actions were available for audit.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto", marginTop: 16 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: 10 }}>Action</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Status</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Audit events</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Decision</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Findings</th>
                          </tr>
                        </thead>
              
                        <tbody>
                          {auditResults.results.map((item) => (
                            <tr key={item.actionId}>
                              <td style={{ padding: 10 }}>
                                <strong>{item.actionType}</strong>
                                <div style={{ marginTop: 4 }}>{item.description}</div>
                              </td>
                              <td style={{ padding: 10 }}>{item.status}</td>
                              <td style={{ padding: 10 }}>{item.auditEventsFound}</td>
                              <td style={{ padding: 10 }}>{item.decision}</td>
                              <td style={{ padding: 10 }}>
                                {item.findings.length > 0
                                  ? item.findings.join(" ")
                                  : "No findings"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              
                  <p style={{ marginBottom: 0, marginTop: 16, opacity: 0.8 }}>
                    This prototype performs limited audit checks. It does not
                    independently establish compliance or guarantee action safety.
                  </p>
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
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {isApprovals ? "HUMAN OVERSIGHT" : "MONDAY, OCTOBER 19 · DEMO DATA"}
                  </div>
                  <h1>{isApprovals ? "Pending approvals" : activeNav === "All issues" ? "All operational issues" : "Good morning, Admin"}<span className="heading-period">{isOverview ? "." : ""}</span></h1>
                  <p>
                    {isApprovals
                      ? "Review recommendations before any consequential action is taken."
                      : activeNav === "All issues"
                        ? "Search, filter, and inspect unresolved operational bottlenecks."
                        : "Here’s your hospital operations overview for today."}
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

              {scanMessage && (
                <div className="inline-feedback">
                  <CheckCircle2 size={17} />
                  {scanMessage}
                  <button aria-label="Dismiss message" onClick={() => setScanMessage("")}><X size={15} /></button>
                </div>
              )}

              {isOverview && (
                <>
                  <div className="overview-banner">
                    <div className="banner-icon"><Sparkles size={21} /></div>
                    <div className="banner-copy">
                      <strong>Your operations command center is ready</strong>
                      <span>Review simulated bottlenecks and coordinate the next administrative steps.</span>
                    </div>
                    <button onClick={() => setActiveNav("Agent workflow")}>
                      Explore agent workflow <ArrowRight size={15} />
                    </button>
                    <div className="banner-decoration"><Activity size={90} /></div>
                  </div>

                  <div className="section-heading">
                    <div>
                      <h2>Operations at a glance</h2>
                      <p>A live view of the current demo dataset.</p>
                    </div>
                    <span className="updated-label"><span className="system-status-dot" /> Sample data</span>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-top">
                        <span className="metric-label">Open issues</span>
                        <div className="metric-icon metric-blue"><ListTodo size={19} /></div>
                      </div>
                      <div className="metric-value">{openCount.toString().padStart(2, "0")}</div>
                      <div className="metric-foot"><span className="metric-neutral">{issues.length} total records</span><span>Across departments</span></div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top">
                        <span className="metric-label">Critical attention</span>
                        <div className="metric-icon metric-red"><AlertTriangle size={19} /></div>
                      </div>
                      <div className="metric-value">{criticalCount.toString().padStart(2, "0")}</div>
                      <div className="metric-foot"><span className="metric-alert"><ArrowUpRight size={14} /> Priority</span><span>Needs prompt review</span></div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top">
                        <span className="metric-label">Awaiting review</span>
                        <div className="metric-icon metric-amber"><Clock3 size={19} /></div>
                      </div>
                      <div className="metric-value">{reviewCount.toString().padStart(2, "0")}</div>
                      <div className="metric-foot"><span className="metric-warning">Human oversight</span><span>Not yet resolved</span></div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top">
                        <span className="metric-label">Resolved</span>
                        <div className="metric-icon metric-green"><CheckCircle2 size={19} /></div>
                      </div>
                      <div className="metric-value">{resolvedCount.toString().padStart(2, "0")}</div>
                      <div className="metric-foot"><span className="metric-success"><ArrowUpRight size={14} /> Completed</span><span>In this session</span></div>
                    </div>
                  </div>

                  <div className="content-grid">
                    <section className="panel issues-panel">
                      <div className="panel-header">
                        <div>
                          <div className="panel-title-row"><h2>Priority queue</h2><span className="count-pill">{issues.filter((issue) => issue.status !== "Resolved").length}</span></div>
                          <p>Operational issues that need attention</p>
                        </div>
                        <button className="text-button" onClick={() => setActiveNav("All issues")}>View all <ArrowRight size={15} /></button>
                      </div>

                      <div className="issue-list">
                        {issues.filter((issue) => issue.status !== "Resolved").slice(0, 4).map((issue) => (
                          <button className="issue-row" key={issue.id} onClick={() => setSelectedIssue(issue)}>
                            <div className={`issue-type-icon issue-type-${issue.icon}`}><IssueIcon type={issue.icon} /></div>
                            <div className="issue-main">
                              <strong>{issue.title}</strong>
                              <span>{issue.id} <span className="metadata-divider">·</span> {issue.department}</span>
                            </div>
                            <div className="issue-trailing">
                              <PriorityBadge priority={issue.priority} />
                              <span className="issue-age"><Clock3 size={12} />{issue.age}</span>
                            </div>
                            <ChevronRight size={16} className="issue-chevron" />
                          </button>
                        ))}
                      </div>
                      <button className="panel-footer-button" onClick={() => setActiveNav("All issues")}>See all operational issues <ArrowRight size={15} /></button>
                    </section>

                    <section className="panel departments-panel">
                      <div className="panel-header">
                        <div>
                          <h2>Department workload</h2>
                          <p>Unresolved issues by department</p>
                        </div>
                        <button className="icon-button small-icon" aria-label="View departments" onClick={() => setActiveNav("Departments")}><MoreHorizontal size={19} /></button>
                      </div>
                      <div className="department-list">
                        {[
                          { name: "Discharge Desk", color: "blue" },
                          { name: "Bed Management", color: "purple" },
                          { name: "Diagnostics", color: "teal" },
                          { name: "Referral Desk", color: "amber" },
                          { name: "Ward Administration", color: "slate" }
                        ].map((department) => {
                          const count = issues.filter((issue) => issue.department === department.name && issue.status !== "Resolved").length;
                          const total = Math.max(1, issues.filter((issue) => issue.status !== "Resolved").length);
                          return (
                            <button className="department-row" key={department.name} onClick={() => {
                              setSearchQuery(department.name);
                              setActiveNav("All issues");
                            }}>
                              <span className={`department-dot dot-${department.color}`} />
                              <span className="department-name">{department.name}</span>
                              <div className="workload-track"><div className={`workload-fill fill-${department.color}`} style={{ width: `${(count / total) * 100}%` }} /></div>
                              <strong>{count}</strong>
                            </button>
                          );
                        })}
                      </div>
                      <button className="panel-footer-button" onClick={() => setActiveNav("Departments")}>Manage departments <ArrowRight size={15} /></button>
                    </section>
                  </div>

                  <div className="lower-grid">
                    <section className="panel agents-panel">
                      <div className="panel-header">
                        <div>
                          <h2>Agent activity</h2>
                          <p>Coordination pipeline preview</p>
                        </div>
                        <span className="demo-tag"><span className="system-status-dot" /> DEMO</span>
                      </div>
                      <div className="agent-activity-list">
                        <div className="agent-activity-row">
                          <div className="activity-icon activity-intake"><FileText size={17} /></div>
                          <div className="activity-description"><strong>Intake Agent</strong><span>Sample records loaded</span></div>
                          <span className="activity-time">Ready</span>
                        </div>
                        <div className="agent-activity-row">
                          <div className="activity-icon activity-detection"><AlertTriangle size={17} /></div>
                          <div className="activity-description"><strong>Bottleneck Detection</strong><span>Example issues available</span></div>
                          <span className="activity-time">Demo</span>
                        </div>
                        <div className="agent-activity-row">
                          <div className="activity-icon activity-coordinator"><Workflow size={17} /></div>
                          <div className="activity-description"><strong>Workflow Coordinator</strong><span>Rules engine planned</span></div>
                          <span className="activity-time">Planned</span>
                        </div>
                      </div>
                      <button className="panel-footer-button" onClick={() => setActiveNav("Agent workflow")}>Explore all five agents <ArrowRight size={15} /></button>
                    </section>

                    <section className="panel audit-preview">
                      <div className="panel-header">
                        <div>
                          <h2>Audit & oversight</h2>
                          <p>Human-in-the-loop workflow</p>
                        </div>
                        <div className="audit-shield"><ShieldCheck size={20} /></div>
                      </div>
                      <div className="audit-highlight">
                        <div className="audit-highlight-icon"><ShieldCheck size={22} /></div>
                        <div><strong>Human approval comes first</strong><p>AI recommendations will be reviewed before consequential actions.</p></div>
                      </div>
                      <div className="audit-stat-row">
                        <div><span>Pending review</span><strong>{reviewCount.toString().padStart(2, "0")}</strong></div>
                        <div><span>Resolved in session</span><strong>{resolvedCount.toString().padStart(2, "0")}</strong></div>
                      </div>
                      <button className="panel-footer-button" onClick={() => setActiveNav("Reports & audit")}>Explore audit trail <ArrowRight size={15} /></button>
                    </section>
                  </div>
                </>
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
