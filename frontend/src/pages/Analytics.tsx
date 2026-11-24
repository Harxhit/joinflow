import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronDown, ClipboardList, Search, Users } from "lucide-react";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { errMsg } from "../lib/mapper";


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

type StudentAssignment = {
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
  assignments: StudentAssignment[];
};

type Slice<T> = { data: T | null; error: string | null };

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

function useAnalytics(enabled: boolean) {
  const [overview, setOverview] = useState<Slice<Overview>>({ data: null, error: null });
  const [groups, setGroups] = useState<Slice<GroupStat[]>>({ data: null, error: null });
  const [students, setStudents] = useState<Slice<StudentStat[]>>({ data: null, error: null });
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    setLoading(true);

    (async () => {
      // Each request fails on its own, so one broken endpoint doesn't blank the page
      const [o, g, s] = await Promise.allSettled([
        api.get("/analytic/overview"),
        api.get("/analytic/groups"),
        api.get("/analytic/students"),
      ]);

      if (cancelled) return;

      setOverview(
        o.status === "fulfilled"
          ? { data: o.value.data.data ?? null, error: null }
          : { data: null, error: errMsg(o.reason, "Could not load the overview") }
      );
      setGroups(
        g.status === "fulfilled"
          ? { data: g.value.data.data?.groups ?? [], error: null }
          : { data: null, error: errMsg(g.reason, "Could not load group analytics") }
      );
      setStudents(
        s.status === "fulfilled"
          ? { data: s.value.data.data?.students ?? [], error: null }
          : { data: null, error: errMsg(s.reason, "Could not load student analytics") }
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadKey]);

  return { overview, groups, students, loading, retry: () => setReloadKey((k) => k + 1) };
}

/* ------------------------------------------------------------------ */
/* Helpers and shared styles                                           */
/* ------------------------------------------------------------------ */

const panel = "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";
const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-sm text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";
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

const pct = (n: number) => Math.round(n);
const barColor = (rate: number) =>
  rate >= 100 ? "bg-[#14A36B]" : rate < 34 ? "bg-[#EA580C]" : "bg-[#2336F0]";

const AVATAR = ["#7C3AED", "#EA580C", "#0F766E", "#DB2777", "#2563EB"];
const initials = (name: string) =>
  name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

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

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Notice
      tone="error"
      title="Couldn't load this section"
      text={message}
      action={<button type="button" onClick={onRetry} className={btnPrimary}>Try again</button>}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewHero({ o }: { o: Overview }) {
  const rate = pct(o.completionRate);
  const R = 56;
  const C = 2 * Math.PI * R;

  const stats: [string, number][] = [
    ["Students", o.totalStudents],
    ["Groups", o.totalGroups],
    ["Assignments", o.totalAssignments],
    ["Submitted", o.totalSubmitted],
    ["Pending", o.pendingSubmissions],
    ["Expected submissions", o.totalAssigned],
  ];

  return (
    <section className={`${panel} p-6 sm:p-8`} aria-label="Overview">
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <div className="relative mx-auto h-40 w-40">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`${rate} percent of expected submissions confirmed`}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="#E3E5F1" strokeWidth="14" />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={rate >= 100 ? "#14A36B" : "#2336F0"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - Math.min(rate, 100) / 100)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="jf-display text-4xl font-bold">{rate}%</span>
            <span className="text-xs text-[#5B6180]">confirmed</span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[#5B6180]">{label}</dt>
              <dd className="jf-display mt-1 text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {o.totalAssigned === 0 && (
        <p className="mt-6 border-t border-[#E3E5F1] pt-5 text-sm text-[#5B6180]">
          No assignment has been given to a group yet, so there is no completion rate to show.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */

function GroupProgress({ groups }: { groups: GroupStat[] }) {
  // Lowest completion first, groups with no assignments last
  const sorted = [...groups].sort(
    (a, b) =>
      (a.totalAssignments === 0 ? 101 : a.completionRate) -
        (b.totalAssignments === 0 ? 101 : b.completionRate) || a.groupName.localeCompare(b.groupName)
  );

  return (
    <section className={`${panel} p-6`} aria-label="Group progress">
      <h2 className="jf-display text-xl font-bold">Group progress</h2>
      <p className="mt-1 text-sm text-[#5B6180]">Lowest completion first, so the groups that need a nudge come up top.</p>

      {sorted.length === 0 ? (
        <p className="mt-6 text-sm text-[#5B6180]">No groups yet. They appear here once students create them.</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {sorted.map((g) => {
            const empty = g.totalAssignments === 0;
            const rate = pct(g.completionRate);
            return (
              <li key={g.groupId}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-semibold">
                    {g.groupName}
                    <span className="ml-2 font-normal text-[#5B6180]">
                      {g.totalMembers} {g.totalMembers === 1 ? "member" : "members"}
                    </span>
                  </span>
                  <span className="text-[#5B6180]">
                    {empty ? "No assignments yet" : `${g.submittedAssignments} of ${g.totalAssignments} submitted`}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E3E5F1]">
                    {!empty && (
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${barColor(rate)}`}
                        style={{ width: `${rate}%` }}
                      />
                    )}
                  </div>
                  <span className="w-10 text-right text-sm font-semibold">{empty ? "-" : `${rate}%`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

const BANDS = [
  { label: "0-25%", min: 0, max: 25 },
  { label: "26-50%", min: 26, max: 50 },
  { label: "51-75%", min: 51, max: 75 },
  { label: "76-100%", min: 76, max: 100 },
];

function Spread({ students }: { students: StudentStat[] }) {
  const active = students.filter((s) => s.totalAssignments > 0);
  const idle = students.length - active.length;

  const counts = BANDS.map((b) => ({
    ...b,
    count: active.filter((s) => pct(s.completionRate) >= b.min && pct(s.completionRate) <= b.max).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 0);

  return (
    <section className={`${panel} p-6`} aria-label="Student completion spread">
      <h2 className="jf-display text-xl font-bold">Student completion spread</h2>
      <p className="mt-1 text-sm text-[#5B6180]">How many students sit in each completion range.</p>

      {active.length === 0 ? (
        <p className="mt-6 text-sm text-[#5B6180]">
          {students.length === 0
            ? "No students are in a group yet."
            : "Nobody has assignments yet, so there is nothing to chart."}
        </p>
      ) : (
        <>
          <div className="mt-6 flex items-end gap-4">
            {counts.map((c) => (
              <div key={c.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-sm font-semibold">{c.count}</span>
                <div className="flex h-28 w-full items-end">
                  <div
                    className={`w-full rounded-t-lg transition-[height] duration-500 ${c.min >= 76 ? "bg-[#14A36B]" : "bg-[#2336F0]"}`}
                    style={{ height: max ? `${Math.max((c.count / max) * 100, c.count ? 6 : 1)}%` : "1%" }}
                  />
                </div>
                <span className="text-xs text-[#5B6180]">{c.label}</span>
              </div>
            ))}
          </div>
          {idle > 0 && (
            <p className="mt-4 text-xs text-[#5B6180]">
              {idle} {idle === 1 ? "student has" : "students have"} no assignments yet and aren't counted.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function StudentList({ students, ungrouped }: { students: StudentStat[]; ungrouped: number }) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [sort, setSort] = useState<"lowest" | "highest" | "name">("lowest");
  const [open, setOpen] = useState<string | null>(null);
  const [visible, setVisible] = useState(15);

  const groupOptions = useMemo(
    () => Array.from(new Map(students.map((s) => [s.groupId, s.groupName])).entries()),
    [students]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students
      .filter(
        (s) =>
          (groupFilter === "ALL" || s.groupId === groupFilter) &&
          (!q ||
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            (s.collegeId ?? "").toLowerCase().includes(q))
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "highest"
          ? b.completionRate - a.completionRate || a.name.localeCompare(b.name)
          : a.completionRate - b.completionRate || a.name.localeCompare(b.name)
      );
  }, [students, query, groupFilter, sort]);

  return (
    <section aria-label="Students">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="jf-display text-2xl font-bold">Students</h2>
          <p className="mt-1 text-sm text-[#5B6180]">
            Each student's progress on their group's assignments, and who confirmed what.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#9CA1BC]" />
            <input
              aria-label="Search students"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(15);
              }}
              placeholder="Search name, email or ID"
              className={`${inputCls} w-56 pl-9`}
            />
          </div>

          <select
            aria-label="Filter by group"
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setVisible(15);
            }}
            className={`${inputCls} w-auto min-w-32 cursor-pointer`}
          >
            <option value="ALL">All groups</option>
            {groupOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select
            aria-label="Sort students"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={`${inputCls} w-auto min-w-36 cursor-pointer`}
          >
            <option value="lowest">Lowest completion</option>
            <option value="highest">Highest completion</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {ungrouped > 0 && (
        <p className="mb-4 text-sm text-[#5B6180]">
          {ungrouped} {ungrouped === 1 ? "student hasn't" : "students haven't"} joined a group yet, so
          {ungrouped === 1 ? " they don't" : " they don't"} appear here.
        </p>
      )}

      <div className={`overflow-hidden ${panel}`}>
        {students.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={30} className="mx-auto text-[#9CA1BC]" />
            <p className="mt-3 font-semibold">No students in groups yet</p>
            <p className="mt-1 text-sm text-[#5B6180]">Student progress shows up once students form groups.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Search size={30} className="mx-auto text-[#9CA1BC]" />
            <p className="mt-3 font-semibold">No students match</p>
            <p className="mt-1 text-sm text-[#5B6180]">Try a different search or group.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E3E5F1]">
            {filtered.slice(0, visible).map((s, i) => {
              const isOpen = open === s.studentId;
              const empty = s.totalAssignments === 0;
              const rate = pct(s.completionRate);

              return (
                <li key={`${s.groupId}-${s.studentId}`}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : s.studentId)}
                    className="flex w-full flex-wrap items-center gap-4 p-5 text-left transition hover:bg-[#FAFBFE] focus:outline-none focus-visible:bg-[#FAFBFE]"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: AVATAR[i % AVATAR.length] }}
                    >
                      {initials(s.name)}
                    </span>

                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block truncate font-semibold">{s.name}</span>
                      <span className="block truncate text-xs text-[#5B6180]">
                        {s.email}
                        {s.collegeId ? `, ${s.collegeId}` : ""}
                      </span>
                    </span>

                    <span className="w-28 text-sm text-[#5B6180]">{s.groupName}</span>

                    <span className="flex w-44 items-center gap-3">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#E3E5F1]">
                        {!empty && <span className={`block h-full rounded-full ${barColor(rate)}`} style={{ width: `${rate}%` }} />}
                      </span>
                      <span className="w-16 text-right text-xs text-[#5B6180]">
                        {empty ? "No work yet" : `${s.submittedAssignments} of ${s.totalAssignments}`}
                      </span>
                    </span>

                    <ChevronDown size={18} className={`shrink-0 text-[#5B6180] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                      {s.assignments.length === 0 ? (
                        <p className="text-sm text-[#5B6180]">{s.groupName} hasn't been given any assignments yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {[...s.assignments]
                            .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
                            .map((a) => {
                              const done = a.status === "SUBMITTED";
                              const overdue = !done && daysUntil(a.dueDate) < 0;
                              return (
                                <li
                                  key={a.assignmentId}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E5F1] bg-white px-4 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{a.title}</p>
                                    <p className="text-xs text-[#5B6180]">Due {shortDate(a.dueDate)}</p>
                                  </div>

                                  <div className="text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        done
                                          ? "bg-[#E6F6EF] text-[#0E7A50]"
                                          : overdue
                                          ? "bg-[#FDECEC] text-[#B42318]"
                                          : "bg-[#EDEFFB] text-[#5B6180]"
                                      }`}
                                    >
                                      {done && <Check size={12} strokeWidth={3} />}
                                      {done ? "Submitted" : overdue ? "Overdue" : "Pending"}
                                    </span>
                                    {done && (
                                      <p className="mt-1 text-xs text-[#5B6180]">
                                        {a.confirmedById === s.studentId ? "Confirmed by this student" : "Confirmed by a groupmate"}
                                        {a.confirmedAt ? `, ${shortDate(a.confirmedAt)}` : ""}
                                      </p>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {filtered.length > visible && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 15)}
            className="inline-flex h-10 items-center rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20"
          >
            Show more ({filtered.length - visible} left)
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = String(user?.role ?? "").toLowerCase();
  const isAdmin = role === "admin" || role === "professor";

  const { overview, groups, students, loading, retry } = useAnalytics(isAdmin);

  if (!isAdmin) {
    return (
      <Shell>
        <Notice
          title="Professors only"
          text="Analytics are only available to professor accounts."
          action={<Link to="/dashboard" className={btnPrimary}>Back to dashboard</Link>}
        />
      </Shell>
    );
  }

  const ungrouped =
    overview.data && students.data ? Math.max(overview.data.totalStudents - students.data.length, 0) : 0;

  const nothingYet =
    !!overview.data &&
    overview.data.totalAssignments === 0 &&
    overview.data.totalGroups === 0 &&
    overview.data.totalStudents === 0;

  return (
    <Shell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="jf-display text-4xl font-bold">Analytics</h1>
          <p className="mt-2 text-[15px] text-[#5B6180]">
            How groups and students are progressing across all assignments.
          </p>
        </div>

        <button type="button" className={btnPrimary} onClick={() => navigate("/assignments/new")}>
          New assignment
        </button>
      </div>

      {loading ? (
        <div className={`${panel} p-8 text-sm text-[#5B6180]`}>Loading analytics…</div>
      ) : nothingYet ? (
        <Notice
          title="Nothing to analyse yet"
          text="Once students sign up, form groups and you assign work to them, progress will show up here."
          action={
            <button type="button" className={btnPrimary} onClick={() => navigate("/assignments/new")}>
              Create an assignment
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {overview.error ? (
            <SectionError message={overview.error} onRetry={retry} />
          ) : overview.data ? (
            <OverviewHero o={overview.data} />
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            {groups.error ? (
              <SectionError message={groups.error} onRetry={retry} />
            ) : (
              <GroupProgress groups={groups.data ?? []} />
            )}

            {students.error ? (
              <SectionError message={students.error} onRetry={retry} />
            ) : (
              <Spread students={students.data ?? []} />
            )}
          </div>

          {students.error ? null : <StudentList students={students.data ?? []} ungrouped={ungrouped} />}
        </div>
      )}
    </Shell>
  );
}