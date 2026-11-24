import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
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

type AppUser = { id: string; name: string; email: string; role: string };
type Member = { id: string; name: string; email: string };
type Group = { id: string; name: string; members: Member[] };

type Submission = {
  status: "PENDING" | "SUBMITTED";
  confirmedBy?: string;
  confirmedAt?: string;
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  oneDriveUrl: string;
  groupIds: string[] | "all";
};

type AssignmentInput = Omit<Assignment, "id">;
type View = "student" | "admin";

/* ---------- API helpers (groups) ---------- */

const errMsg = (e: unknown, fallback: string): string =>
  (e as any)?.response?.data?.message ?? fallback;

// Backend group -> UI group. Members come back as { user: { id, name, email } }.
const toGroup = (g: any): Group => ({
  id: g.id,
  name: g.name,
  members: (g.members ?? []).map((m: any) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  })),
});

// Backend assignment -> UI assignment (only the fields the group page shows).
const toAssignment = (a: any): Assignment => ({
  id: a.id,
  title: a.title,
  description: a.description ?? "",
  dueDate: a.dueDate,
  oneDriveUrl: a.oneDriveUrl ?? a.oneDriveLink ?? a.link ?? "",
  groupIds: "all",
});

// A Submission row for (assignment, group). No row means still pending.
// Field names are my best guess at your Prisma model: adjust here if they differ.
const toSubmission = (raw: any, members: Member[]): Submission => {
  if (!raw) return { status: "PENDING" };

  const status = raw.status
    ? String(raw.status).toUpperCase() === "SUBMITTED"
      ? "SUBMITTED"
      : "PENDING"
    : "SUBMITTED";

  const byId = raw.confirmedById ?? raw.submittedById ?? raw.userId;

  return {
    status,
    confirmedBy:
      raw.confirmedBy?.name ?? members.find((m) => m.id === byId)?.name,
    confirmedAt: raw.confirmedAt ?? raw.submittedAt ?? raw.createdAt,
  };
};



const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 86_400_000).toISOString();

const key = (assignmentId: string, groupId: string) =>
  `${assignmentId}:${groupId}`;

const NAMES = [
  ["Aarav Mehta", "Meera Iyer", "Kabir Shah", "Isha Verma"],
  ["Rohan Das", "Tara Nair", "Dev Patel", "Anaya Rao"],
  ["Neel Joshi", "Sana Khan", "Vivaan Gupta", "Riya Sen"],
  ["Yash Malik", "Kiara Bose", "Arjun Pillai", "Zoya Ali"],
];

const GROUP_NAMES = ["Orbit", "Nimbus", "Quanta", "Helix"];

const SEED_GROUPS: Group[] = GROUP_NAMES.map((name, i) => ({
  id: `g${i + 1}`,
  name,
  members: NAMES[i].map((n, j) => ({
    id: `g${i + 1}-m${j}`,
    name: n,
    email: `${n.split(" ")[0].toLowerCase()}@college.edu`,
  })),
}));

const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: "a1",
    title: "Lab 4: Process scheduling",
    description:
      "Implement round robin and MLFQ, then compare average waiting time.",
    dueDate: daysFromNow(2),
    oneDriveUrl: "https://onedrive.live.com/",
    groupIds: "all",
  },
  {
    id: "a2",
    title: "ER diagram and schema",
    description:
      "Model the library system and submit the diagram with your SQL.",
    dueDate: daysFromNow(5),
    oneDriveUrl: "https://onedrive.live.com/",
    groupIds: "all",
  },
  {
    id: "a3",
    title: "Mini project proposal",
    description: "Two pages: problem, users, stack and timeline.",
    dueDate: daysFromNow(9),
    oneDriveUrl: "https://onedrive.live.com/",
    groupIds: ["g1", "g2", "g3"],
  },
  {
    id: "a4",
    title: "Literature survey",
    description: "Ten papers, one paragraph each.",
    dueDate: daysFromNow(-1),
    oneDriveUrl: "https://onedrive.live.com/",
    groupIds: "all",
  },
];

const done = (
  assignmentId: string,
  groupId: string,
  by: string,
  daysAgo: number
): [string, Submission] => [
  key(assignmentId, groupId),
  {
    status: "SUBMITTED",
    confirmedBy: by,
    confirmedAt: daysFromNow(-daysAgo),
  },
];

const SEED_SUBMISSIONS: Record<string, Submission> = Object.fromEntries([
  done("a1", "g2", "Rohan Das", 1),
  done("a2", "g3", "Sana Khan", 0),
  done("a3", "g1", "Meera Iyer", 2),
  done("a4", "g1", "Aarav Mehta", 3),
  done("a4", "g2", "Tara Nair", 2),
  done("a4", "g3", "Neel Joshi", 2),
]);

function useMockData(user: AppUser) {
  // Only the professor view still reads this: there is no "list all groups" endpoint yet.
  const [groups] = useState<Group[]>(SEED_GROUPS);
  const [assignments, setAssignments] =
    useState<Assignment[]>(SEED_ASSIGNMENTS);
  const [submissions, setSubmissions] =
    useState<Record<string, Submission>>(SEED_SUBMISSIONS);

  const statusOf = (
    assignmentId: string,
    groupId: string
  ): Submission =>
    submissions[key(assignmentId, groupId)] ?? {
      status: "PENDING",
    };

  const targetsOf = (a: Assignment): Group[] => {
    const ids = a.groupIds;
    return ids === "all"
      ? groups
      : groups.filter((g) => ids.includes(g.id));
  };

  const confirm = (assignmentId: string, groupId: string) => {
    setSubmissions((s) => ({
      ...s,
      [key(assignmentId, groupId)]: {
        status: "SUBMITTED",
        confirmedBy: user.name,
        confirmedAt: new Date().toISOString(),
      },
    }));
  };

  const saveAssignment = (input: AssignmentInput, id?: string) =>
    setAssignments((list) =>
      id
        ? list.map((a) => (a.id === id ? { ...a, ...input } : a))
        : [{ id: `a-${Date.now()}`, ...input }, ...list]
    );

  return {
    groups,
    assignments,
    statusOf,
    targetsOf,
    confirm,
    saveAssignment,
  };
}

type Data = ReturnType<typeof useMockData>;

/* The logged-in student's own group, straight from the API. */
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
  Math.round(
    (startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY
  );

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

const AVATAR = [
  "#7C3AED",
  "#EA580C",
  "#0F766E",
  "#DB2777",
  "#2563EB",
];

const btnPrimary =
  "inline-flex h-10 items-center cursor-pointer justify-center gap-2 rounded-lg bg-[#2336F0] px-4 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30";

const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20";

const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-[15px] text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";

const panel =
  "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");
.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
@keyframes jf-pop { 0% { transform: scale(0.5); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
.jf-pop { animation: jf-pop 300ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .jf-pop { animation: none; } }
`;

function DateBlock({
  iso,
  finished,
}: {
  iso: string;
  finished: boolean;
}) {
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

function Avatar({
  name,
  index,
}: {
  name: string;
  index: number;
}) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{
        backgroundColor: AVATAR[index % AVATAR.length],
      }}
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

function StudentView({
  user,
  data,
}: {
  user: AppUser;
  data: Data;
}) {
  const { assignments, statusOf, confirm } = data;

  const {
    group: myGroup,
    loading: groupLoading,
    error: groupLoadError,
    createGroup,
    addMember,
  } = useMyGroup();

  const [flow, setFlow] = useState<{
    id: string;
    step: 1 | 2;
  } | null>(null);

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
    !!myGroup &&
    statusOf(a.id, myGroup.id).status === "SUBMITTED";

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
                : "Your group has submitted everything."}
            </p>

            <div className="mt-5 max-w-md">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">
                  Group {myGroup.name}
                </span>
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
          </>
        ) : (
          <p className="mt-2 text-[15px] text-[#5B6180]">
            Create a group first, then your group can confirm each submission.
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-label="Assignments">
          <ul className={`divide-y divide-[#E3E5F1] overflow-hidden ${panel}`}>
            {sorted.map((a) => {
              const sub = myGroup
                ? statusOf(a.id, myGroup.id)
                : null;

              const active = flow?.id === a.id ? flow : null;

              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center"
                >
                  <DateBlock
                    iso={a.dueDate}
                    finished={isDone(a)}
                  />

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
                          onClick={() =>
                            setFlow({ id: a.id, step: 1 })
                          }
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
                            onClick={() =>
                              setFlow({ id: a.id, step: 2 })
                            }
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
                            onClick={() => {
                              confirm(a.id, myGroup.id);
                              setFlow(null);
                            }}
                          >
                            Confirm submission
                          </button>

                          <button
                            type="button"
                            className={`${btnGhost} h-9 px-3`}
                            onClick={() =>
                              setFlow({ id: a.id, step: 1 })
                            }
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
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
                      <p className="truncate text-sm font-medium">
                        {m.name}
                      </p>
                      <p className="truncate text-xs text-[#5B6180]">
                        {m.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={handleAddMember}
                className="mt-6 border-t border-[#E3E5F1] pt-5"
              >
                <label
                  htmlFor="member"
                  className="mb-2 block text-sm font-medium"
                >
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
            <form
              onSubmit={handleCreate}
            >
              <h2 className="jf-display text-xl font-bold">
                Create your group
              </h2>
              <p className="mt-1 text-sm text-[#5B6180]">
                Name it now, then add classmates by email or student ID.
              </p>

              <label
                htmlFor="gname"
                className="mb-2 mt-5 block text-sm font-medium"
              >
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

function AdminView({
  user,
  data,
}: {
  user: AppUser;
  data: Data;
}) {
  const { assignments, groups, statusOf, targetsOf } = data;
  const navigate = useNavigate();
  const [open, setOpen] = useState<string | null>(null);

  const rows = assignments.map((a) => {
    const targets = targetsOf(a);
    const submitted = targets.filter(
      (g) => statusOf(a.id, g.id).status === "SUBMITTED"
    ).length;

    return {
      a,
      targets,
      submitted,
      total: targets.length,
    };
  });

  const submittedAll = rows.reduce(
    (n, r) => n + r.submitted,
    0
  );

  const totalAll = rows.reduce(
    (n, r) => n + r.total,
    0
  );

  const pctAll = totalAll
    ? Math.round((submittedAll / totalAll) * 100)
    : 0;

  const behind = groups
    .map((g) => {
      const mine = rows.filter((r) =>
        r.targets.some((t) => t.id === g.id)
      );

      const ok = mine.filter(
        (r) => statusOf(r.a.id, g.id).status === "SUBMITTED"
      ).length;

      return {
        name: g.name,
        pct: mine.length
          ? Math.round((ok / mine.length) * 100)
          : 100,
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
          <h1 className="jf-display text-4xl font-bold">
            Assignments
          </h1>

          <p className="mt-2 text-[15px] text-[#5B6180]">
            {assignments.length === 0
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
          <ul className={`divide-y divide-[#E3E5F1] overflow-hidden ${panel}`}>
            {rows.map(({ a, targets, submitted, total }) => {
              const pct = total
                ? Math.round((submitted / total) * 100)
                : 0;

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
                      onClick={() =>
                        setOpen(isOpen ? null : a.id)
                      }
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
                                pct === 100
                                  ? "bg-[#14A36B]"
                                  : "bg-[#2336F0]"
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
                        className={`shrink-0 text-[#5B6180] cursor-pointer transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/assignments/${a.id}/edit`)
                      }
                      aria-label={`Edit ${a.title}`}
                      className="rounded-lg border border-[#DADDEE] cursor-pointer p-2.5 text-[#5B6180] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[#5B6180]">
                        <span>
                          {a.groupIds === "all"
                            ? "Assigned to all groups"
                            : `Assigned to ${targets.length} groups`}
                        </span>

                        <a
                          href={a.oneDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-[#2336F0]"
                        >
                          OneDrive link <ExternalLink size={14} />
                        </a>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        {targets.map((g) => {
                          const sub = statusOf(a.id, g.id);
                          const ok = sub.status === "SUBMITTED";

                          return (
                            <div key={g.id}>
                              <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="font-semibold">
                                  {g.name}
                                </span>

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
                                        <Check
                                          size={12}
                                          strokeWidth={3}
                                        />
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
        </section>

        <aside
          aria-label="Analytics"
          className={`h-fit p-6 lg:sticky lg:top-24 ${panel}`}
        >
          <p className="text-sm text-[#5B6180]">
            Overall completion
          </p>

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
              <span className="jf-display text-3xl font-bold">
                {pctAll}%
              </span>
              <span className="text-xs text-[#5B6180]">
                submitted
              </span>
            </div>
          </div>

          <div className="mt-7 border-t border-[#E3E5F1] pt-5">
            <p className="text-sm font-semibold">
              Groups furthest behind
            </p>

            <ul className="mt-4 space-y-4">
              {behind.map((g) => (
                <li key={g.name}>
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-[#5B6180]">
                      {g.pct}%
                    </span>
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
        </aside>
      </div>
    </>
  );
}

type GroupRow = { a: Assignment; sub: Submission };

type GroupState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; group: Group; rows: GroupRow[] };

function StatusPage({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#5B6180] hover:text-[#2336F0]"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <h1 className="jf-display mt-6 text-3xl font-bold">{title}</h1>
        {detail && <p className="mt-2 text-[15px] text-[#5B6180]">{detail}</p>}
      </main>
    </div>
  );
}

export function GroupPage() {
  const { groupId } = useParams();
  const [state, setState] = useState<GroupState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    api
      .get(`/group/details/${groupId}`)
      .then(({ data }) => {
        if (cancelled) return;

        const group = toGroup(data.group);

        // group.assignments is AssignmentGroup[]; each has the assignment and
        // that assignment's submissions already filtered to this group.
        const rows: GroupRow[] = (data.group.assignments ?? []).map(
          (ag: any) => ({
            a: toAssignment(ag.assignment),
            sub: toSubmission(ag.assignment.submissions?.[0], group.members),
          })
        );

        setState({ status: "ready", group, rows });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: errMsg(e, "Could not load this group"),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (state.status === "loading") return <StatusPage title="Loading group…" />;
  if (state.status === "error")
    return <StatusPage title="Can't open this group" detail={state.message} />;

  const { group } = state;

  const mine = [...state.rows].sort(
    (x, y) =>
      Number(x.sub.status === "SUBMITTED") -
        Number(y.sub.status === "SUBMITTED") ||
      +new Date(x.a.dueDate) - +new Date(y.a.dueDate)
  );

  const total = mine.length;
  const submitted = mine.filter(
    (r) => r.sub.status === "SUBMITTED"
  ).length;
  const pending = total - submitted;

  const overdue = mine.filter(
    (r) =>
      r.sub.status !== "SUBMITTED" &&
      daysUntil(r.a.dueDate) < 0
  ).length;

  const pct = total
    ? Math.round((submitted / total) * 100)
    : 0;

  const complete = total > 0 && submitted === total;

  const confirmCount = (name: string) =>
    mine.filter(
      (r) =>
        r.sub.status === "SUBMITTED" &&
        r.sub.confirmedBy === name
    ).length;

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#5B6180] hover:text-[#2336F0]"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <div className="mb-10 mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#5B6180]">Group</p>

            <h1 className="jf-display text-4xl font-bold">
              {group.name}
            </h1>

            <p className="mt-2 text-[15px] text-[#5B6180]">
              {group.members.length} members · {total}{" "}
              {total === 1 ? "assignment" : "assignments"} assigned
            </p>
          </div>

          {complete ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F6EF] px-4 py-2 text-sm font-semibold text-[#0E7A50]">
              <span className="jf-pop flex h-5 w-5 items-center justify-center rounded-full bg-[#14A36B] text-white">
                <Check size={12} strokeWidth={3.5} />
              </span>
              All assignments submitted
            </span>
          ) : overdue > 0 ? (
            <span className="rounded-full bg-[#FDECEC] px-4 py-2 text-sm font-semibold text-[#B42318]">
              {overdue} overdue
            </span>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div className="space-y-8">
            <aside
              aria-label="Group progress"
              className={`h-fit p-6 ${panel}`}
            >
              <p className="text-sm text-[#5B6180]">
                Group progress
              </p>

              <div className="relative mx-auto mt-4 h-36 w-36">
                <svg
                  viewBox="0 0 128 128"
                  className="h-full w-full -rotate-90"
                  role="img"
                  aria-label={`${pct} percent submitted`}
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
                    stroke={complete ? "#14A36B" : "#2336F0"}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - pct / 100)}
                    className="transition-[stroke-dashoffset] duration-700"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="jf-display text-3xl font-bold">
                    {pct}%
                  </span>
                  <span className="text-xs text-[#5B6180]">
                    submitted
                  </span>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-[#E3E5F1] pt-5 text-center">
                <div>
                  <dd className="jf-display text-2xl font-bold text-[#0E7A50]">
                    {submitted}
                  </dd>
                  <dt className="text-xs text-[#5B6180]">
                    Submitted
                  </dt>
                </div>

                <div>
                  <dd className="jf-display text-2xl font-bold">
                    {pending}
                  </dd>
                  <dt className="text-xs text-[#5B6180]">
                    Pending
                  </dt>
                </div>

                <div>
                  <dd
                    className={`jf-display text-2xl font-bold ${
                      overdue ? "text-[#B42318]" : ""
                    }`}
                  >
                    {overdue}
                  </dd>
                  <dt className="text-xs text-[#5B6180]">
                    Overdue
                  </dt>
                </div>
              </dl>
            </aside>

            <aside
              aria-label="Members"
              className={`h-fit p-6 ${panel}`}
            >
              <p className="text-sm font-semibold">Members</p>

              <ul className="mt-4 space-y-3">
                {group.members.map((m, i) => {
                  const n = confirmCount(m.name);

                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={m.name} index={i} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.name}
                        </p>
                        <p className="truncate text-xs text-[#5B6180]">
                          {m.email}
                        </p>
                      </div>

                      {n > 0 && (
                        <span className="shrink-0 rounded-full bg-[#E6F6EF] px-2.5 py-0.5 text-xs font-medium text-[#0E7A50]">
                          {n} confirmed
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          <section aria-label="Assignment progress">
            <ul className={`divide-y divide-[#E3E5F1] overflow-hidden ${panel}`}>
              {mine.length === 0 && (
                <li className="p-6 text-sm text-[#5B6180]">
                  No assignments have been given to this group yet.
                </li>
              )}

              {mine.map(({ a, sub }) => {
                const ok = sub.status === "SUBMITTED";
                const late =
                  !ok && daysUntil(a.dueDate) < 0;

                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                  >
                    <DateBlock iso={a.dueDate} finished={ok} />

                    <div className="min-w-0 flex-1">
                      <h3 className="jf-display text-lg font-bold leading-snug">
                        {a.title}
                      </h3>

                      <p className="mt-0.5 text-sm text-[#5B6180]">
                        {dueText(a.dueDate)}
                      </p>

                      {ok && (
                        <p className="mt-1 text-xs text-[#5B6180]">
                          Confirmed by {sub.confirmedBy}
                          {sub.confirmedAt
                            ? `, ${shortDate(sub.confirmedAt)}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      {ok ? (
                        <SubmittedMark>Submitted</SubmittedMark>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            late
                              ? "bg-[#FDECEC] text-[#B42318]"
                              : "bg-[#EDEFFB] text-[#5B6180]"
                          }`}
                        >
                          {late ? "Overdue" : "Pending"}
                        </span>
                      )}

                      <a
                        href={a.oneDriveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[#5B6180] hover:text-[#2336F0]"
                      >
                        OneDrive link <ExternalLink size={14} />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
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

  const data = useMockData(me);

  const role = String(me.role).toLowerCase();

  const view: View =
    role === "admin" || role === "professor"
      ? "admin"
      : "student";

  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {view === "admin" ? (
          <AdminView user={me} data={data} />
        ) : (
          <StudentView user={me} data={data} />
        )}
      </main>
    </div>
  );
}