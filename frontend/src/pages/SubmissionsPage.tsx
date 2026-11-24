import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  PENDING,
  errMsg,
  toAssignment,
  toAssignmentDetail,
  type Assignment,
  type Group,
  type Submission,
} from "../lib/mapper";

type Detail = { groups: Group[]; submissions: Record<string, Submission> };

type Overview = {
  totalStudents: number;
  totalGroups: number;
  totalAssignments: number;
  totalAssigned: number;
  totalSubmitted: number;
  pendingSubmissions: number;
  completionRate: number;
};

type GroupStat = {
  groupId: string;
  groupName: string;
  totalMembers: number;
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  completionRate: number;
};

type StudentAssignmentStat = {
  assignmentId: string;
  title: string;
  dueDate: string;
  status: "SUBMITTED" | "PENDING";
  confirmedAt: string | null;
  confirmedById: string | null;
};

type StudentStat = {
  studentId: string;
  name: string;
  email: string;
  collegeId: string | null;
  groupId: string;
  groupName: string;
  totalAssignments: number;
  submittedAssignments: number;
  pendingAssignments: number;
  completionRate: number;
  assignments: StudentAssignmentStat[];
};

const panel = "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";
const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-sm text-[#0F1433] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";
const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2336F0] px-4 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30";
const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");
.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
`;

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysUntil = (iso: string) => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

function Notice({
  title,
  text,
  action,
  tone = "neutral",
}: {
  title: string;
  text: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`${panel} p-10 text-center`}>
      <ClipboardList size={30} className={`mx-auto ${tone === "error" ? "text-[#B42318]" : "text-[#9CA1BC]"}`} />
      <h2 className="jf-display mt-3 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#5B6180]">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  suffix = "",
  description,
  icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5B6180]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">{icon}</span>
      </div>
      <p className="jf-display mt-3 text-3xl font-bold">
        {value}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-[#5B6180]">{description}</p>
    </div>
  );
}

function Bar({ pct, className = "h-2" }: { pct: number; className?: string }) {
  const safe = Math.min(100, Math.max(0, pct));
  return (
    <div className={`overflow-hidden rounded-full bg-[#E3E5F1] ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${safe === 100 ? "bg-[#14A36B]" : "bg-[#2336F0]"}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function useAnalytics(reloadKey: number) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [groups, setGroups] = useState<GroupStat[]>([]);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      api.get("/analytic/overview"),
      api.get("/analytic/groups"),
      api.get("/analytic/students"),
    ])
      .then(([o, g, s]) => {
        if (cancelled) return;
        setOverview(o.data.data ?? null);
        setGroups(g.data.data?.groups ?? []);
        setStudents(s.data.data?.students ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(errMsg(e, "Could not load analytics"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { overview, groups, students, loading, error };
}

const PAGE_SIZE = 10;

function AnalyticsSection({ selectedAssignment }: { selectedAssignment: Assignment }) {
  const [reloadKey, setReloadKey] = useState(0);
  const { overview, groups, students, loading, error } = useAnalytics(reloadKey);

  const [tab, setTab] = useState<"groups" | "students">("groups");
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [onlyPending, setOnlyPending] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.studentId, s.name));
    return map;
  }, [students]);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.completionRate - b.completionRate),
    [groups]
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students
      .filter((s) => {
        if (groupFilter !== "ALL" && s.groupId !== groupFilter) return false;

        if (q) {
          const hay = `${s.name} ${s.email} ${s.collegeId ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (onlyPending) {
          const entry = s.assignments.find((a) => a.assignmentId === selectedAssignment.id);
          if (!entry || entry.status !== "PENDING") return false;
        }

        return true;
      })
      .sort((a, b) => a.completionRate - b.completionRate || a.name.localeCompare(b.name));
  }, [students, query, groupFilter, onlyPending, selectedAssignment.id]);

  const tabBtn = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20 ${
      active ? "bg-[#2336F0] text-white" : "text-[#5B6180] hover:text-[#2336F0]"
    }`;

  return (
    <section aria-label="Analytics" className="mt-12">
      <div className="mb-5">
        <h2 className="jf-display text-2xl font-bold">Analytics</h2>
        <p className="mt-1 text-sm text-[#5B6180]">Completion across all assignments, groups and students.</p>
      </div>

      {loading ? (
        <div className={`${panel} p-8 text-sm text-[#5B6180]`}>Loading analytics…</div>
      ) : error ? (
        <Notice
          tone="error"
          title="Couldn't load analytics"
          text={error}
          action={
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={btnPrimary}>
              Try again
            </button>
          }
        />
      ) : (
        <>
          {overview && (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard label="Students" value={overview.totalStudents} description="Registered student accounts" icon={<GraduationCap size={19} />} />
                <SummaryCard label="Groups" value={overview.totalGroups} description="Groups created so far" icon={<Users size={19} />} />
                <SummaryCard label="Assignments" value={overview.totalAssignments} description="Assignments created" icon={<ClipboardList size={19} />} />
                <SummaryCard label="Completion rate" value={overview.completionRate} suffix="%" description="Group submissions confirmed" icon={<BarChart3 size={19} />} />
              </div>

              <div className={`${panel} mb-8 p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="jf-display text-xl font-bold">Overall submissions</h3>
                    <p className="mt-1 text-sm text-[#5B6180]">
                      {overview.totalSubmitted} of {overview.totalAssigned} group assignments confirmed
                    </p>
                  </div>
                  <span className="jf-display text-3xl font-bold text-[#2336F0]">{overview.completionRate}%</span>
                </div>

                <Bar pct={overview.completionRate} className="mt-5 h-3" />

                <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#5B6180]">
                  <span>{overview.totalSubmitted} submitted</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={12} /> {overview.pendingSubmissions} pending
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="mb-4 inline-flex gap-1 rounded-xl bg-white p-1 shadow-[3px_3px_0_0_rgba(15,20,51,0.08)]">
            <button type="button" aria-pressed={tab === "groups"} onClick={() => setTab("groups")} className={tabBtn(tab === "groups")}>
              Groups ({groups.length})
            </button>
            <button type="button" aria-pressed={tab === "students"} onClick={() => setTab("students")} className={tabBtn(tab === "students")}>
              Students ({students.length})
            </button>
          </div>

          {tab === "groups" ? (
            <div className={`overflow-hidden ${panel}`}>
              {sortedGroups.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#5B6180]">No groups yet.</div>
              ) : (
                <ul className="divide-y divide-[#E3E5F1]">
                  {sortedGroups.map((g) => (
                    <li key={g.groupId} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
                      <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">
                          <Users size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{g.groupName}</span>
                          <span className="mt-0.5 block text-xs text-[#5B6180]">
                            {g.totalMembers} {g.totalMembers === 1 ? "member" : "members"}
                          </span>
                        </span>
                      </div>

                      <div className="min-w-[180px] flex-1 basis-56">
                        <div className="mb-1.5 flex justify-between text-xs text-[#5B6180]">
                          <span>
                            {g.submittedAssignments} of {g.totalAssignments} submitted
                          </span>
                          <span className="font-semibold text-[#0F1433]">{g.completionRate}%</span>
                        </div>
                        <Bar pct={g.completionRate} />
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          g.totalAssignments > 0 && g.pendingAssignments === 0
                            ? "bg-[#E6F6EF] text-[#0E7A50]"
                            : "bg-[#EDEFFB] text-[#5B6180]"
                        }`}
                      >
                        {g.pendingAssignments} pending
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-52 flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-[#9CA1BC]" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(PAGE_SIZE);
                    }}
                    placeholder="Search name, email or student ID"
                    aria-label="Search students"
                    className={`${inputCls} pl-10`}
                  />
                </div>

                <select
                  aria-label="Filter students by group"
                  value={groupFilter}
                  onChange={(e) => {
                    setGroupFilter(e.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  className={`${inputCls} w-auto min-w-32 cursor-pointer`}
                >
                  <option value="ALL">All groups</option>
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.groupName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  aria-pressed={onlyPending}
                  onClick={() => {
                    setOnlyPending((v) => !v);
                    setLimit(PAGE_SIZE);
                  }}
                  className={`${btnGhost} h-11 ${onlyPending ? "!border-[#2336F0] !text-[#2336F0]" : ""}`}
                >
                  Pending on "{selectedAssignment.title.length > 22 ? `${selectedAssignment.title.slice(0, 22)}…` : selectedAssignment.title}"
                </button>
              </div>

              <div className={`overflow-hidden ${panel}`}>
                {filteredStudents.length === 0 ? (
                  <div className="p-10 text-center">
                    <ClipboardList size={30} className="mx-auto text-[#9CA1BC]" />
                    <p className="mt-3 font-semibold">No students match</p>
                    <p className="mt-1 text-sm text-[#5B6180]">Try a different search or filter.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E3E5F1]">
                    {filteredStudents.slice(0, limit).map((s) => {
                      const key = `${s.studentId}:${s.groupId}`;
                      const isOpen = expanded === key;

                      return (
                        <li key={key}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : key)}
                            className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 p-5 text-left transition hover:bg-[#FAFBFE] focus:outline-none focus-visible:bg-[#FAFBFE]"
                          >
                            <div className="min-w-0 flex-1 basis-48">
                              <p className="truncate font-semibold">{s.name}</p>
                              <p className="mt-0.5 truncate text-xs text-[#5B6180]">
                                {s.email}
                                {s.collegeId ? `, ${s.collegeId}` : ""}
                              </p>
                            </div>

                            <span className="rounded-full bg-[#EDEFFB] px-2.5 py-1 text-xs font-medium text-[#5B6180]">
                              {s.groupName}
                            </span>

                            <div className="min-w-[160px] flex-1 basis-48">
                              <div className="mb-1.5 flex justify-between text-xs text-[#5B6180]">
                                <span>
                                  {s.submittedAssignments} of {s.totalAssignments}
                                </span>
                                <span className="font-semibold text-[#0F1433]">{s.completionRate}%</span>
                              </div>
                              <Bar pct={s.completionRate} />
                            </div>

                            <ChevronDown size={18} className={`text-[#5B6180] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>

                          {isOpen && (
                            <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                              {s.assignments.length === 0 ? (
                                <p className="text-sm text-[#5B6180]">This student's group has no assignments yet.</p>
                              ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {s.assignments.map((a) => {
                                    const done = a.status === "SUBMITTED";
                                    const late = !done && daysUntil(a.dueDate) < 0;
                                    const confirmer = a.confirmedById ? nameById.get(a.confirmedById) : null;

                                    return (
                                      <div
                                        key={a.assignmentId}
                                        className="flex items-start justify-between gap-3 rounded-xl border border-[#E3E5F1] bg-white p-3"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium">{a.title}</p>
                                          <p className="mt-0.5 text-xs text-[#5B6180]">Due {shortDate(a.dueDate)}</p>
                                          {done && a.confirmedAt && (
                                            <p className="mt-1 text-xs text-[#0E7A50]">
                                              Confirmed{confirmer ? ` by ${confirmer}` : ""}, {dateTime(a.confirmedAt)}
                                            </p>
                                          )}
                                        </div>

                                        <span
                                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            done
                                              ? "bg-[#E6F6EF] text-[#0E7A50]"
                                              : late
                                              ? "bg-[#FDECEC] text-[#B42318]"
                                              : "bg-[#EDEFFB] text-[#5B6180]"
                                          }`}
                                        >
                                          {done ? "Submitted" : late ? "Overdue" : "Pending"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {filteredStudents.length > limit && (
                <div className="mt-4 flex justify-center">
                  <button type="button" onClick={() => setLimit((l) => l + PAGE_SIZE)} className={btnGhost}>
                    Show more ({filteredStudents.length - limit} left)
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

/* Everything below the assignment picker. Remounts per assignment, so filters reset on their own. */
function AssignmentSubmissions({ assignment, detail }: { assignment: Assignment; detail: Detail }) {
  const { groups, submissions } = detail;
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const statusFor = (groupId: string): Submission => submissions[groupId] ?? PENDING;
  const overduePeriod = daysUntil(assignment.dueDate) < 0;

  const rows = groups.map((group) => ({ group, submission: statusFor(group.id) }));
  const submitted = rows.filter((r) => r.submission.status === "SUBMITTED").length;
  const pending = rows.length - submitted;
  const overdue = overduePeriod ? pending : 0;
  const totalStudents = groups.reduce((n, g) => n + g.members.length, 0);
  const completion = rows.length ? Math.round((submitted / rows.length) * 100) : 0;

  const filteredRows = rows.filter(
    ({ group, submission }) =>
      (statusFilter === "ALL" || submission.status === statusFilter) &&
      (groupFilter === "ALL" || group.id === groupFilter)
  );

  if (groups.length === 0) {
    return (
      <Notice
        title="No groups assigned yet"
        text="This assignment hasn't been given to any group, so there are no submissions to track."
        action={
          <Link to={`/assignments/${assignment.id}/edit`} className={btnPrimary}>
            Edit assignment
          </Link>
        }
      />
    );
  }

  return (
    <>
      <section aria-label="Submission summary" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Groups assigned" value={groups.length} description="Groups expected to submit" icon={<Users size={19} />} />
        <SummaryCard label="Submitted" value={submitted} description="Groups that confirmed submission" icon={<Check size={19} />} />
        <SummaryCard label="Pending" value={pending} description="Groups yet to confirm" icon={<Clock3 size={19} />} />
        <SummaryCard label="Students" value={totalStudents} description="Students across assigned groups" icon={<GraduationCap size={19} />} />
      </section>

      <section className={`${panel} mb-8 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="jf-display text-xl font-bold">Submission completion</h2>
            <p className="mt-1 text-sm text-[#5B6180]">Group confirmation progress for this assignment</p>
          </div>
          <span className="jf-display text-3xl font-bold text-[#2336F0]">{completion}%</span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E3E5F1]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${completion === 100 ? "bg-[#14A36B]" : "bg-[#2336F0]"}`}
            style={{ width: `${completion}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#5B6180]">
          <span>{submitted} submitted</span>
          <span>{pending} pending</span>
          {overdue > 0 && <span className="font-semibold text-[#B42318]">{overdue} overdue</span>}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="jf-display text-2xl font-bold">Group submissions</h2>
            <p className="mt-1 text-sm text-[#5B6180]">View confirmation status and group members.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter by group"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className={`${inputCls} w-auto min-w-32 cursor-pointer`}
            >
              <option value="ALL">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              aria-label="Filter by submission status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} w-auto min-w-32 cursor-pointer`}
            >
              <option value="ALL">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        <div className={`overflow-hidden ${panel}`}>
          {filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList size={30} className="mx-auto text-[#9CA1BC]" />
              <p className="mt-3 font-semibold">No groups match these filters</p>
              <p className="mt-1 text-sm text-[#5B6180]">Try a different group or status.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E3E5F1]">
              {filteredRows.map(({ group, submission }) => {
                const isSubmitted = submission.status === "SUBMITTED";
                const isExpanded = expandedGroup === group.id;
                const isOverdue = !isSubmitted && overduePeriod;

                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left transition hover:bg-[#FAFBFE] focus:outline-none focus-visible:bg-[#FAFBFE]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">
                          <Users size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{group.name}</span>
                          <span className="mt-0.5 block text-xs text-[#5B6180]">
                            {group.members.length} {group.members.length === 1 ? "member" : "members"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isSubmitted
                              ? "bg-[#E6F6EF] text-[#0E7A50]"
                              : isOverdue
                              ? "bg-[#FDECEC] text-[#B42318]"
                              : "bg-[#EDEFFB] text-[#5B6180]"
                          }`}
                        >
                          {isSubmitted ? "Submitted" : isOverdue ? "Overdue" : "Pending"}
                        </span>
                        <ChevronDown size={18} className={`text-[#5B6180] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">Submission confirmation</p>
                            {isSubmitted ? (
                              <div className="mt-2">
                                <p className="flex items-center gap-2 text-sm font-medium text-[#0E7A50]">
                                  <Check size={16} />
                                  Confirmed{submission.confirmedBy ? ` by ${submission.confirmedBy}` : ""}
                                </p>
                                {submission.confirmedAt && (
                                  <p className="mt-1 text-xs text-[#5B6180]">{dateTime(submission.confirmedAt)}</p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-[#5B6180]">This group has not confirmed its submission.</p>
                            )}
                          </div>
                          <span className="text-xs text-[#5B6180]">Due {shortDate(assignment.dueDate)}</span>
                        </div>

                        <div className="border-t border-[#E3E5F1] pt-4">
                          <p className="mb-3 text-sm font-semibold">Group members</p>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {group.members.map((member) => {
                              const isConfirmer = isSubmitted && member.name === submission.confirmedBy;
                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E5F1] bg-white p-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{member.name}</p>
                                    <p className="truncate text-xs text-[#5B6180]">{member.email}</p>
                                  </div>
                                  {isConfirmer ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E6F6EF] px-2 py-1 text-[11px] font-semibold text-[#0E7A50]">
                                      <Check size={12} />
                                      Confirmer
                                    </span>
                                  ) : (
                                    <span className="shrink-0 text-[11px] text-[#9CA1BC]">Member</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <p className="mt-3 text-xs text-[#5B6180]">
                            The confirmation is recorded once for the group. The named student is the member who
                            confirmed it; individual member submissions are not tracked separately.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = String(user?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "professor";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((k) => k + 1);

  const requestedId = searchParams.get("assignmentId");
  const selected = assignments.find((a) => a.id === requestedId) ?? assignments[0] ?? null;
  const selectedId = selected?.id ?? null;

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    setListLoading(true);
    setListError(null);

    api
      .get("/assignment/all")
      .then(({ data }) => {
        if (!cancelled) setAssignments((data.assignments ?? []).map(toAssignment));
      })
      .catch((e) => {
        if (!cancelled) setListError(errMsg(e, "Could not load assignments"));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, reloadKey]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;

    setDetailLoading(true);
    setDetailError(null);

    api
      .get(`/assignment/${selectedId}`)
      .then(({ data }) => {
        if (!cancelled) setDetail(toAssignmentDetail(data.assignment));
      })
      .catch((e) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(errMsg(e, "Could not load submissions"));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, reloadKey]);

  if (!isAdmin) {
    return (
      <Shell>
        <Notice
          title="Professors only"
          text="Submission tracking is only available to professor accounts."
          action={<Link to="/dashboard" className={btnPrimary}>Back to dashboard</Link>}
        />
      </Shell>
    );
  }

  if (listLoading) {
    return (
      <Shell>
        <div className={`${panel} p-8 text-sm text-[#5B6180]`}>Loading assignments…</div>
      </Shell>
    );
  }

  if (listError) {
    return (
      <Shell>
        <Notice
          tone="error"
          title="Couldn't load assignments"
          text={listError}
          action={<button type="button" onClick={retry} className={btnPrimary}>Try again</button>}
        />
      </Shell>
    );
  }

  if (!selected) {
    return (
      <Shell>
        <Notice
          title="No assignments yet"
          text="Create an assignment and give it to a few groups. Their submission confirmations will show up here."
          action={
            <button type="button" onClick={() => navigate("/assignments/new")} className={btnPrimary}>
              New assignment
            </button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="jf-display mt-1 text-4xl font-bold">Submission details</h1>
          <p className="mt-2 text-[15px] text-[#5B6180]">Monitor group submission confirmations and their progress.</p>
        </div>

        {selected.oneDriveUrl && (
          <a
            href={selected.oneDriveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0]"
          >
            Open OneDrive <ExternalLink size={15} />
          </a>
        )}
      </div>

      <section className={`${panel} mb-8 p-5`}>
        <label htmlFor="assignment" className="mb-2 block text-sm font-semibold">
          Select assignment
        </label>

        <div className="relative">
          <select
            id="assignment"
            value={selected.id}
            onChange={(e) => setSearchParams({ assignmentId: e.target.value })}
            className={`${inputCls} cursor-pointer appearance-none pr-10`}
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          <ChevronDown size={17} className="pointer-events-none absolute right-3 top-3 text-[#5B6180]" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#5B6180]">Description</p>
            <p className="mt-1 text-sm">{selected.description || "No description"}</p>
          </div>
          <div>
            <p className="text-xs text-[#5B6180]">Due date</p>
            <p className="mt-1 text-sm font-medium">{shortDate(selected.dueDate)}</p>
          </div>
        </div>
      </section>

      {detailLoading ? (
        <div className={`${panel} p-8 text-sm text-[#5B6180]`}>Loading submissions…</div>
      ) : detailError ? (
        <Notice
          tone="error"
          title="Couldn't load submissions"
          text={detailError}
          action={<button type="button" onClick={retry} className={btnPrimary}>Try again</button>}
        />
      ) : detail ? (
        <AssignmentSubmissions key={selected.id} assignment={selected} detail={detail} />
      ) : null}

      <AnalyticsSection selectedAssignment={selected} />
    </Shell>
  );
}