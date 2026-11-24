import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Users,
  UserPlus,
} from "lucide-react";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  PENDING,
  errMsg,
  toAssignment,
  toAssignmentDetail,
  toGroup,
  toSubmission,
  type Assignment,
  type Group,
  type Submission,
} from "../lib/mapper";

type AppUser = { id: string; name: string; email: string; role: string };
type View = "student" | "admin";


function useStudentAssignments(
  groupId: string | null,
  ready: boolean,
  user: AppUser
) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [allRes, groupRes] = await Promise.all([
          api.get("/assignment/all"),
          groupId ? api.get(`/group/details/${groupId}`) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setAssignments((allRes.data.assignments ?? []).map(toAssignment));

        const byAssignment: Record<string, Submission> = {};

        if (groupRes) {
          const members = toGroup(groupRes.data.group).members;

          for (const ag of groupRes.data.group.assignments ?? []) {
            byAssignment[ag.assignment.id] = toSubmission(
              ag.assignment.submissions?.[0],
              members
            );
          }
        }

        setSubmissions(byAssignment);
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load assignments"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, ready]);

  const statusOf = (assignmentId: string): Submission =>
    submissions[assignmentId] ?? PENDING;

  const confirm = async (assignmentId: string): Promise<boolean> => {
    setConfirmError(null);

    try {
      const { data } = await api.post("/submission/confirm", { assignmentId });

      setSubmissions((s) => ({
        ...s,
        [assignmentId]: {
          status: "SUBMITTED",
          confirmedBy: user.name,
          confirmedAt:
            data?.data?.submission?.confirmedAt ?? new Date().toISOString(),
        },
      }));

      return true;
    } catch (e) {
      setConfirmError(errMsg(e, "Could not confirm your submission"));
      return false;
    }
  };

  return { assignments, statusOf, confirm, confirmError, loading, error };
}

type AssignmentDetail = {
  groups: Group[];
  submissions: Record<string, Submission>; // keyed by groupId
};


function useAdminData() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [details, setDetails] = useState<Record<string, AssignmentDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/assignment/all");
        const list: Assignment[] = (data.assignments ?? []).map(toAssignment);

        const responses = await Promise.all(
          list.map((a) => api.get(`/assignment/${a.id}`))
        );

        if (cancelled) return;

        const byId: Record<string, AssignmentDetail> = {};
        responses.forEach((res, i) => {
          byId[list[i].id] = toAssignmentDetail(res.data.assignment);
        });

        setAssignments(list);
        setDetails(byId);
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Could not load assignments"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const targetsOf = (a: Assignment): Group[] => details[a.id]?.groups ?? [];

  const statusOf = (assignmentId: string, groupId: string): Submission =>
    details[assignmentId]?.submissions[groupId] ?? PENDING;

  // Every group that has at least one assignment.
  const groups = Array.from(
    new Map(
      Object.values(details)
        .flatMap((d) => d.groups)
        .map((g) => [g.id, g] as const)
    ).values()
  );

  return { assignments, groups, statusOf, targetsOf, loading, error };
}

function useMyGroup() {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/group/me")
      .then(({ data }) => {
        if (!cancelled) setGroup(data.group ? toGroup(data.group) : null);
      })
      .catch((e) => {
        // 404 just means "not in a group yet"
        if (!cancelled && e?.response?.status !== 404) {
          setError(errMsg(e, "Could not load your group"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async (id: string) => {
    const { data } = await api.get(`/group/${id}`);
    setGroup(toGroup(data.group));
  };

  const createGroup = async (name: string) => {
    const { data } = await api.post("/group/create", { name });
    await refresh(data.group.id);
  };

  const addMember = async (identifier: string) => {
    if (!group) return;

    await api.post(
      `/group/${group.id}/members`,
      identifier.includes("@") ? { email: identifier } : { studentId: identifier }
    );
    await refresh(group.id);
  };

  return { group, loading, error, createGroup, addMember };
}

const DAY = 86_400_000;

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const daysUntil = (iso: string) =>
  Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

function dueText(iso: string) {
  const n = daysUntil(iso);

  if (n < 0) return `Was due ${shortDate(iso)}`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";

  return `Due in ${n} days, ${shortDate(iso)}`;
}

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AVATAR = ["#7C3AED", "#EA580C", "#0F766E", "#DB2777", "#2563EB"];

const btnPrimary =
  "inline-flex h-10 items-center cursor-pointer justify-center gap-2 rounded-lg bg-[#2336F0] px-4 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30";

const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20";

const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-[15px] text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";

const panel = "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");
.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
@keyframes jf-pop { 0% { transform: scale(0.5); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
.jf-pop { animation: jf-pop 300ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .jf-pop { animation: none; } }
`;

function DateBlock({ iso, finished }: { iso: string; finished: boolean }) {
  const d = new Date(iso);
  const n = daysUntil(iso);

  const tone = finished
    ? "bg-[#E6F6EF] text-[#0E7A50]"
    : n < 0
      ? "bg-[#FDECEC] text-[#B42318]"
      : n <= 2
        ? "bg-[#FFE14D] text-[#0F1433]"
        : "bg-[#EDEFFB] text-[#0F1433]";

  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${tone}`}
    >
      <span className="text-xs font-medium">
        {d.toLocaleDateString(undefined, { month: "short" })}
      </span>
      <span className="jf-display text-2xl font-bold leading-none">
        {d.getDate()}
      </span>
    </div>
  );
}

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: AVATAR[index % AVATAR.length] }}
    >
      {initials(name)}
    </span>
  );
}

function SubmittedMark({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0E7A50]">
      <span className="jf-pop flex h-5 w-5 items-center justify-center rounded-full bg-[#14A36B] text-white">
        <Check size={12} strokeWidth={3.5} />
      </span>
      {children}
    </span>
  );
}

function StudentView({ user }: { user: AppUser }) {
  const {
    group: myGroup,
    loading: groupLoading,
    error: groupLoadError,
    createGroup,
    addMember,
  } = useMyGroup();

  const {
    assignments,
    statusOf,
    confirm,
    confirmError,
    loading: assignmentsLoading,
    error: assignmentsError,
  } = useStudentAssignments(myGroup?.id ?? null, !groupLoading, user);

  const [flow, setFlow] = useState<{ id: string; step: 1 | 2 } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    const name = groupName.trim();
    if (!name || busy) return;

    setBusy(true);
    setCreateError(null);

    try {
      await createGroup(name);
      setGroupName("");
    } catch (err) {
      setCreateError(errMsg(err, "Could not create the group"));
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();

    const value = identifier.trim();
    if (!value || busy) return;

    setBusy(true);
    setMemberError(null);

    try {
      await addMember(value);
      setIdentifier("");
    } catch (err) {
      setMemberError(errMsg(err, "Could not add that student"));
    } finally {
      setBusy(false);
    }
  };

  const isDone = (a: Assignment) =>
    !!myGroup && statusOf(a.id).status === "SUBMITTED";

  const sorted = useMemo(
    () =>
      [...assignments].sort(
        (a, b) =>
          Number(isDone(a)) - Number(isDone(b)) ||
          +new Date(a.dueDate) - +new Date(b.dueDate)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignments, myGroup, statusOf]
  );

  const submittedCount = assignments.filter(isDone).length;
  const next = sorted.find((a) => !isDone(a));

  return (
    <>
      <div className="mb-10">
        <h1 className="jf-display text-4xl font-bold">
          Hi, {user.name.split(" ")[0] || "there"}
        </h1>

        {myGroup ? (
          <>
            <p className="mt-2 text-[15px] text-[#5B6180]">
              {next
                ? `Next up: ${next.title}. ${dueText(next.dueDate)}.`
                : assignments.length === 0
                  ? "No assignments yet."
                  : "Your group has submitted everything."}
            </p>

            {assignments.length > 0 && (
              <div className="mt-5 max-w-md">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">Group {myGroup.name}</span>
                  <span className="text-[#5B6180]">
                    {submittedCount} of {assignments.length} submitted
                  </span>
                </div>

                <div
                  className="flex gap-1.5"
                  role="img"
                  aria-label={`${submittedCount} of ${assignments.length} assignments submitted`}
                >
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        isDone(a)
                          ? submittedCount === assignments.length
                            ? "bg-[#14A36B]"
                            : "bg-[#2336F0]"
                          : "bg-[#E3E5F1]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : groupLoading ? null : (
          <p className="mt-2 text-[15px] text-[#5B6180]">
            Create a group first, then your group can confirm each submission.
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-label="Assignments">
          {assignmentsLoading || groupLoading ? (
            <div className={`${panel} p-8 text-sm text-[#5B6180]`}>
              Loading assignments…
            </div>
          ) : assignmentsError ? (
            <div role="alert" className={`${panel} p-8 text-sm text-[#B42318]`}>
              {assignmentsError}
            </div>
          ) : sorted.length === 0 ? (
            <div className={`${panel} p-8`}>
              <h2 className="jf-display text-xl font-bold">No assignments yet</h2>
              <p className="mt-2 text-sm text-[#5B6180]">
                {myGroup
                  ? "Your professor hasn't given your group any assignments yet. They will show up here as soon as they do."
                  : "Assignments are given to groups. Create a group and they will show up here."}
              </p>
            </div>
          ) : (
            <ul className={`divide-y divide-[#E3E5F1] overflow-hidden ${panel}`}>
              {sorted.map((a) => {
                const sub = myGroup ? statusOf(a.id) : null;
                const active = flow?.id === a.id ? flow : null;

                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
                  >
                    <DateBlock iso={a.dueDate} finished={isDone(a)} />

                    <div className="min-w-0 flex-1">
                      <h3 className="jf-display text-lg font-bold leading-snug">
                        {a.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-[#5B6180]">
                        {dueText(a.dueDate)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-[#5B6180]">
                        {a.description}
                      </p>
                    </div>

                    <div className="sm:w-60">
                      {sub?.status === "SUBMITTED" ? (
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <div className="sm:text-right">
                            <SubmittedMark>Submitted</SubmittedMark>
                            <p className="mt-1 text-xs text-[#5B6180]">
                              Confirmed by {sub.confirmedBy}
                              {sub.confirmedAt
                                ? `, ${shortDate(sub.confirmedAt)}`
                                : ""}
                            </p>
                          </div>

                          <a
                            href={a.oneDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-[#5B6180] hover:text-[#2336F0]"
                          >
                            OneDrive link <ExternalLink size={14} />
                          </a>
                        </div>
                      ) : !myGroup ? (
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                          <a
                            href={a.oneDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={btnGhost}
                          >
                            OneDrive <ExternalLink size={14} />
                          </a>
                          <span className="text-xs text-[#5B6180]">
                            Create a group to confirm
                          </span>
                        </div>
                      ) : !active ? (
                        <div className="flex gap-2 sm:justify-end">
                          <a
                            href={a.oneDriveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={btnGhost}
                          >
                            OneDrive <ExternalLink size={14} />
                          </a>

                          <button
                            type="button"
                            className={btnPrimary}
                            onClick={() => setFlow({ id: a.id, step: 1 })}
                          >
                            Mark submitted
                          </button>
                        </div>
                      ) : active.step === 1 ? (
                        <div className="rounded-xl bg-[#F1F3FF] p-3">
                          <p className="text-sm font-medium">
                            Did you upload your work to OneDrive?
                          </p>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className={`${btnPrimary} h-9 px-3`}
                              onClick={() => setFlow({ id: a.id, step: 2 })}
                            >
                              Yes, I have submitted
                            </button>

                            <button
                              type="button"
                              className={`${btnGhost} h-9 px-3`}
                              onClick={() => setFlow(null)}
                            >
                              Not yet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-[#FFF8D6] p-3">
                          <p className="text-sm font-medium">
                            Confirm for group {myGroup.name}? You can't undo this.
                          </p>

                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className={`${btnPrimary} h-9 px-3`}
                              disabled={confirming}
                              onClick={async () => {
                                setConfirming(true);
                                const ok = await confirm(a.id);
                                setConfirming(false);
                                if (ok) setFlow(null);
                              }}
                            >
                              {confirming ? "Confirming..." : "Confirm submission"}
                            </button>

                            <button
                              type="button"
                              className={`${btnGhost} h-9 px-3`}
                              disabled={confirming}
                              onClick={() => setFlow({ id: a.id, step: 1 })}
                            >
                              Back
                            </button>
                          </div>

                          {confirmError && (
                            <p role="alert" className="mt-2 text-xs text-[#B42318]">
                              {confirmError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside
          aria-label="Your group"
          className={`h-fit p-6 lg:sticky lg:top-24 ${panel}`}
        >
          {groupLoading ? (
            <p className="text-sm text-[#5B6180]">Loading your group…</p>
          ) : myGroup ? (
            <>
              <p className="text-sm text-[#5B6180]">Your groups</p>

              <Link
                to={`/groups/${myGroup.id}`}
                className="group mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#E3E5F1] p-3 transition hover:border-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EDEFFB] text-[#2336F0]">
                    <Users size={18} />
                  </span>

                  <span className="min-w-0">
                    <span className="jf-display block truncate text-lg font-bold leading-tight">
                      {myGroup.name}
                    </span>
                    <span className="block text-xs text-[#5B6180]">
                      {myGroup.members.length} members · View progress
                    </span>
                  </span>
                </span>

                <ChevronRight
                  size={18}
                  className="shrink-0 text-[#5B6180] transition group-hover:text-[#2336F0]"
                />
              </Link>

              <p className="mt-6 text-sm font-semibold">Members</p>

              <ul className="mt-5 space-y-3">
                {myGroup.members.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.name} index={i} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-[#5B6180]">{m.email}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={handleAddMember}
                className="mt-6 border-t border-[#E3E5F1] pt-5"
              >
                <label htmlFor="member" className="mb-2 block text-sm font-medium">
                  Add a member
                </label>

                <div className="flex gap-2">
                  <input
                    id="member"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email or student ID"
                    className={inputCls}
                  />

                  <button
                    type="submit"
                    className={`${btnPrimary} h-11 w-11 shrink-0 px-0`}
                    aria-label="Add member"
                    disabled={busy}
                  >
                    <UserPlus size={18} />
                  </button>
                </div>

                {memberError && (
                  <p role="alert" className="mt-2 text-sm text-[#B42318]">
                    {memberError}
                  </p>
                )}
              </form>
            </>
          ) : (
            <form onSubmit={handleCreate}>
              <h2 className="jf-display text-xl font-bold">Create your group</h2>
              <p className="mt-1 text-sm text-[#5B6180]">
                Name it now, then add classmates by email or student ID.
              </p>

              <label htmlFor="gname" className="mb-2 mt-5 block text-sm font-medium">
                Group name
              </label>

              <input
                id="gname"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Orbit"
                className={inputCls}
              />

              <button
                type="submit"
                className={`${btnPrimary} mt-4 w-full`}
                disabled={busy}
              >
                <Plus size={16} /> Create group
              </button>

              {(createError || groupLoadError) && (
                <p role="alert" className="mt-3 text-sm text-[#B42318]">
                  {createError ?? groupLoadError}
                </p>
              )}
            </form>
          )}
        </aside>
      </div>
    </>
  );
}

function AdminView({ user }: { user: AppUser }) {
  const { assignments, groups, statusOf, targetsOf, loading, error } =
    useAdminData();
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const rows = assignments.map((a) => {
    const targets = targetsOf(a);
    const submitted = targets.filter(
      (g) => statusOf(a.id, g.id).status === "SUBMITTED"
    ).length;

    return { a, targets, submitted, total: targets.length };
  });

  const submittedAll = rows.reduce((n, r) => n + r.submitted, 0);
  const totalAll = rows.reduce((n, r) => n + r.total, 0);
  const pctAll = totalAll ? Math.round((submittedAll / totalAll) * 100) : 0;

  const behind = groups
    .map((g) => {
      const mine = rows.filter((r) => r.targets.some((t) => t.id === g.id));
      const ok = mine.filter(
        (r) => statusOf(r.a.id, g.id).status === "SUBMITTED"
      ).length;

      return {
        name: g.name,
        pct: mine.length ? Math.round((ok / mine.length) * 100) : 100,
      };
    })
    .sort((x, y) => x.pct - y.pct)
    .slice(0, 3);

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="jf-display text-4xl font-bold">Assignments</h1>

          <p className="mt-2 text-[15px] text-[#5B6180]">
            {loading
              ? "Loading assignments…"
              : assignments.length === 0
                ? `Welcome, ${user.name.split(" ")[0]}. Create your first assignment to get started.`
                : `${submittedAll} of ${totalAll} group submissions are in across ${assignments.length} ${assignments.length === 1 ? "assignment" : "assignments"}.`}
          </p>
        </div>

        <button
          type="button"
          className={btnPrimary}
          onClick={() => navigate("/assignments/new")}
        >
          <Plus size={16} /> New assignment
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-label="Assignments">
          {loading ? (
            <div className={`${panel} p-8 text-sm text-[#5B6180]`}>
              Loading assignments…
            </div>
          ) : error ? (
            <div role="alert" className={`${panel} p-8 text-sm text-[#B42318]`}>
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className={`${panel} p-8`}>
              <h2 className="jf-display text-xl font-bold">No assignments yet</h2>
              <p className="mt-2 text-sm text-[#5B6180]">
                Use "New assignment" to create one and choose which groups
                receive it.
              </p>
            </div>
          ) : (
            <ul className={`divide-y divide-[#E3E5F1] overflow-hidden ${panel}`}>
              {rows.map(({ a, targets, submitted, total }) => {
                const pct = total ? Math.round((submitted / total) * 100) : 0;
                const isOpen = open === a.id;

                return (
                  <li key={a.id}>
                    <div className="flex items-center gap-4 p-5">
                      <DateBlock
                        iso={a.dueDate}
                        finished={total > 0 && submitted === total}
                      />

                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : a.id)}
                        aria-expanded={isOpen}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2336F0]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="jf-display block text-lg font-bold leading-snug">
                            {a.title}
                          </span>

                          <span className="block text-sm text-[#5B6180]">
                            {dueText(a.dueDate)}
                          </span>

                          <span className="mt-3 flex items-center gap-3">
                            <span className="block h-2 w-40 overflow-hidden rounded-full bg-[#E3E5F1]">
                              <span
                                className={`block h-full rounded-full transition-[width] duration-500 ${
                                  pct === 100 ? "bg-[#14A36B]" : "bg-[#2336F0]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </span>

                            <span className="text-xs text-[#5B6180]">
                              {submitted} of {total} groups
                            </span>
                          </span>
                        </span>

                        <ChevronDown
                          size={18}
                          className={`shrink-0 cursor-pointer text-[#5B6180] transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/assignments/${a.id}/edit`)}
                        aria-label={`Edit ${a.title}`}
                        className="cursor-pointer rounded-lg border border-[#DADDEE] p-2.5 text-[#5B6180] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#5B6180]">
                          <span>
                            Assigned to {targets.length}{" "}
                            {targets.length === 1 ? "group" : "groups"}
                          </span>

                          {a.oneDriveUrl && (
                            <a
                              href={a.oneDriveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 hover:text-[#2336F0]"
                            >
                              OneDrive link <ExternalLink size={14} />
                            </a>
                          )}
                        </div>

                        {targets.length === 0 ? (
                          <p className="text-sm text-[#5B6180]">
                            This assignment hasn't been given to any group yet.
                          </p>
                        ) : (
                          <div className="grid gap-5 sm:grid-cols-2">
                            {targets.map((g) => {
                              const sub = statusOf(a.id, g.id);
                              const ok = sub.status === "SUBMITTED";

                              return (
                                <div key={g.id}>
                                  <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="font-semibold">{g.name}</span>

                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        ok
                                          ? "bg-[#E6F6EF] text-[#0E7A50]"
                                          : "bg-[#EDEFFB] text-[#5B6180]"
                                      }`}
                                    >
                                      {ok ? "Submitted" : "Pending"}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {g.members.map((m) => {
                                      const confirmer =
                                        ok && m.name === sub.confirmedBy;

                                      return (
                                        <span
                                          key={m.id}
                                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                            confirmer
                                              ? "bg-[#14A36B] text-white"
                                              : "bg-[#EDEFFB] text-[#5B6180]"
                                          }`}
                                        >
                                          {confirmer && (
                                            <Check size={12} strokeWidth={3} />
                                          )}
                                          {m.name}
                                        </span>
                                      );
                                    })}
                                  </div>

                                  {ok && (
                                    <p className="mt-2 text-xs text-[#5B6180]">
                                      Confirmed by {sub.confirmedBy}
                                      {sub.confirmedAt
                                        ? `, ${shortDate(sub.confirmedAt)}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-5 flex justify-end border-t border-[#E3E5F1] pt-4">
                          <Link
                            to={`/submissions?assignmentId=${a.id}`}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2336F0] transition hover:text-[#1A2BDB]"
                          >
                            More details
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside
          aria-label="Analytics"
          className={`h-fit p-6 lg:sticky lg:top-24 ${panel}`}
        >
          <p className="text-sm text-[#5B6180]">Overall completion</p>

          <div className="relative mx-auto mt-4 h-36 w-36">
            <svg
              viewBox="0 0 128 128"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${pctAll} percent submitted`}
            >
              <circle
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke="#E3E5F1"
                strokeWidth="14"
              />

              <circle
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke={pctAll === 100 ? "#14A36B" : "#2336F0"}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pctAll / 100)}
                className="transition-[stroke-dashoffset] duration-700"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="jf-display text-3xl font-bold">{pctAll}%</span>
              <span className="text-xs text-[#5B6180]">submitted</span>
            </div>
          </div>

          {behind.length > 0 && (
            <div className="mt-7 border-t border-[#E3E5F1] pt-5">
              <p className="text-sm font-semibold">Groups furthest behind</p>

              <ul className="mt-4 space-y-4">
                {behind.map((g) => (
                  <li key={g.name}>
                    <div className="flex justify-between text-sm">
                      <span>{g.name}</span>
                      <span className="text-[#5B6180]">{g.pct}%</span>
                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E3E5F1]">
                      <div
                        className="h-full rounded-full bg-[#2336F0]"
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const me: AppUser = user ?? {
    id: "me",
    name: "Student",
    email: "",
    role: "student",
  };

  const role = String(me.role).toLowerCase();
  const view: View = role === "admin" || role === "professor" ? "admin" : "student";

  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "admin" ? <AdminView user={me} /> : <StudentView user={me} />}
      </main>
    </div>
  );
}