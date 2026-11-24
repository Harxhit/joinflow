import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  ExternalLink,
  GraduationCap,
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

const panel = "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";
const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-sm text-[#0F1433] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";
const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2336F0] px-4 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30";

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
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5B6180]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">{icon}</span>
      </div>
      <p className="jf-display mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-[#5B6180]">{description}</p>
    </div>
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
    </Shell>
  );
}