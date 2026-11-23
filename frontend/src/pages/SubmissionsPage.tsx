import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Users,
  ClipboardList,
  Clock3,
  GraduationCap,
} from "lucide-react";
import Navbar from "./Navbar";

type Member = {
  id: string;
  name: string;
  email: string;
};

type Group = {
  id: string;
  name: string;
  members: Member[];
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  oneDriveUrl: string;
  groupIds: string[] | "all";
};

type Submission = {
  status: "PENDING" | "SUBMITTED";
  confirmedBy?: string;
  confirmedAt?: string;
};

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const groups: Group[] = [
  {
    id: "g1",
    name: "Orbit",
    members: [
      { id: "g1-m1", name: "Aarav Mehta", email: "aarav@college.edu" },
      { id: "g1-m2", name: "Meera Iyer", email: "meera@college.edu" },
      { id: "g1-m3", name: "Kabir Shah", email: "kabir@college.edu" },
      { id: "g1-m4", name: "Isha Verma", email: "isha@college.edu" },
    ],
  },
  {
    id: "g2",
    name: "Nimbus",
    members: [
      { id: "g2-m1", name: "Rohan Das", email: "rohan@college.edu" },
      { id: "g2-m2", name: "Tara Nair", email: "tara@college.edu" },
      { id: "g2-m3", name: "Dev Patel", email: "dev@college.edu" },
      { id: "g2-m4", name: "Anaya Rao", email: "anaya@college.edu" },
    ],
  },
  {
    id: "g3",
    name: "Quanta",
    members: [
      { id: "g3-m1", name: "Neel Joshi", email: "neel@college.edu" },
      { id: "g3-m2", name: "Sana Khan", email: "sana@college.edu" },
      { id: "g3-m3", name: "Vivaan Gupta", email: "vivaan@college.edu" },
      { id: "g3-m4", name: "Riya Sen", email: "riya@college.edu" },
    ],
  },
  {
    id: "g4",
    name: "Helix",
    members: [
      { id: "g4-m1", name: "Yash Malik", email: "yash@college.edu" },
      { id: "g4-m2", name: "Kiara Bose", email: "kiara@college.edu" },
      { id: "g4-m3", name: "Arjun Pillai", email: "arjun@college.edu" },
      { id: "g4-m4", name: "Zoya Ali", email: "zoya@college.edu" },
    ],
  },
];

const assignments: Assignment[] = [
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

const submissions: Record<string, Submission> = {
  "a1:g2": {
    status: "SUBMITTED",
    confirmedBy: "Rohan Das",
    confirmedAt: daysFromNow(-1),
  },
  "a1:g4": {
    status: "SUBMITTED",
    confirmedBy: "Yash Malik",
    confirmedAt: daysFromNow(0),
  },
  "a2:g3": {
    status: "SUBMITTED",
    confirmedBy: "Sana Khan",
    confirmedAt: daysFromNow(0),
  },
  "a2:g1": {
    status: "SUBMITTED",
    confirmedBy: "Meera Iyer",
    confirmedAt: daysFromNow(-1),
  },
  "a3:g1": {
    status: "SUBMITTED",
    confirmedBy: "Meera Iyer",
    confirmedAt: daysFromNow(-2),
  },
  "a3:g2": {
    status: "SUBMITTED",
    confirmedBy: "Tara Nair",
    confirmedAt: daysFromNow(-1),
  },
  "a4:g1": {
    status: "SUBMITTED",
    confirmedBy: "Aarav Mehta",
    confirmedAt: daysFromNow(-3),
  },
  "a4:g2": {
    status: "SUBMITTED",
    confirmedBy: "Tara Nair",
    confirmedAt: daysFromNow(-2),
  },
  "a4:g3": {
    status: "SUBMITTED",
    confirmedBy: "Neel Joshi",
    confirmedAt: daysFromNow(-2),
  },
};

const panel =
  "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";

const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-sm text-[#0F1433] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";

const DAY = 86_400_000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const daysUntil = (iso: string) =>
  Math.round(
    (startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY
  );

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const statusFor = (assignmentId: string, groupId: string): Submission =>
  submissions[`${assignmentId}:${groupId}`] ?? {
    status: "PENDING",
  };

function SummaryCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5B6180]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">
          {icon}
        </span>
      </div>
      <p className="jf-display mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-[#5B6180]">{description}</p>
    </div>
  );
}

export default function SubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedId = searchParams.get("assignmentId") ?? "a1";

  const selectedAssignment =
    assignments.find((a) => a.id === requestedId) ?? assignments[0];

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [expandedGroup, setExpandedGroup] = useState<string | null>("g1");

  const targets = useMemo(() => {
    return selectedAssignment.groupIds === "all"
      ? groups
      : groups.filter((group) =>
          selectedAssignment.groupIds.includes(group.id)
        );
  }, [selectedAssignment]);

  const rows = targets.map((group) => ({
    group,
    submission: statusFor(selectedAssignment.id, group.id),
  }));

  const submitted = rows.filter(
    (row) => row.submission.status === "SUBMITTED"
  ).length;

  const pending = rows.length - submitted;

  const overdue = rows.filter(
    (row) =>
      row.submission.status === "PENDING" &&
      daysUntil(selectedAssignment.dueDate) < 0
  ).length;

  const totalStudents = targets.reduce(
    (count, group) => count + group.members.length,
    0
  );

  const completion = rows.length
    ? Math.round((submitted / rows.length) * 100)
    : 0;

  const filteredRows = rows.filter(({ group, submission }) => {
    const matchesStatus =
      statusFilter === "ALL" || submission.status === statusFilter;

    const matchesGroup =
      groupFilter === "ALL" || group.id === groupFilter;

    return matchesStatus && matchesGroup;
  });

  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");
        .jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
        .jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
      `}</style>

      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="jf-display mt-1 text-4xl font-bold">
              Submission details
            </h1>
            <p className="mt-2 text-[15px] text-[#5B6180]">
              Monitor group submission confirmations and their progress.
            </p>
          </div>

          <a
            href={selectedAssignment.oneDriveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0]"
          >
            Open OneDrive <ExternalLink size={15} />
          </a>
        </div>

        {/* Assignment selector */}
        <section className={`${panel} mb-8 p-5`}>
          <label
            htmlFor="assignment"
            className="mb-2 block text-sm font-semibold"
          >
            Select assignment
          </label>

          <div className="relative">
            <select
              id="assignment"
              value={selectedAssignment.id}
              onChange={(event) => {
                setSearchParams({ assignmentId: event.target.value });
                setStatusFilter("ALL");
                setGroupFilter("ALL");
                setExpandedGroup(null);
              }}
              className={`${inputCls} appearance-none pr-10 cursor-pointer`}
            >
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={17}
              className="pointer-events-none absolute cursor-pointer right-3 cursor-pointer top-3 text-[#5B6180]"
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[#5B6180]">Description</p>
              <p className="mt-1 text-sm">{selectedAssignment.description}</p>
            </div>
            <div>
              <p className="text-xs text-[#5B6180]">Due date</p>
              <p className="mt-1 text-sm font-medium">
                {shortDate(selectedAssignment.dueDate)}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-[#5B6180]">
            {selectedAssignment.groupIds === "all"
              ? "Assigned to all groups"
              : `Assigned to ${targets.length} selected groups`}
          </p>
        </section>

        {/* Summary cards */}
        <section
          aria-label="Submission summary"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <SummaryCard
            label="Groups assigned"
            value={targets.length}
            description="Groups expected to submit"
            icon={<Users size={19} />}
          />
          <SummaryCard
            label="Submitted"
            value={submitted}
            description="Groups that confirmed submission"
            icon={<Check size={19} />}
          />
          <SummaryCard
            label="Pending"
            value={pending}
            description="Groups yet to confirm"
            icon={<Clock3 size={19} />}
          />
          <SummaryCard
            label="Students"
            value={totalStudents}
            description="Students across assigned groups"
            icon={<GraduationCap size={19} />}
          />
        </section>

        {/* Completion overview */}
        <section className={`${panel} mb-8 p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="jf-display text-xl font-bold">
                Submission completion
              </h2>
              <p className="mt-1 text-sm text-[#5B6180]">
                Group confirmation progress for this assignment
              </p>
            </div>

            <span className="jf-display text-3xl font-bold text-[#2336F0]">
              {completion}%
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E3E5F1]">
            <div
              className="h-full rounded-full bg-[#2336F0] transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#5B6180]">
            <span>{submitted} submitted</span>
            <span>{pending} pending</span>
            {overdue > 0 && (
              <span className="font-semibold text-[#B42318]">
                {overdue} overdue
              </span>
            )}
          </div>
        </section>

        {/* Group details */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="jf-display text-2xl font-bold">
                Group submissions
              </h2>
              <p className="mt-1 text-sm text-[#5B6180]">
                View confirmation status and group members.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter by group"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className={`${inputCls} w-auto min-w-32 cursor-pointer`}
              >
                <option value="ALL">All groups</option>
                {targets.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by submission status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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
                <ClipboardList
                  size={30}
                  className="mx-auto text-[#9CA1BC]"
                />
                <p className="mt-3 font-semibold">No groups found</p>
                <p className="mt-1 text-sm text-[#5B6180]">
                  Try changing your filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E5F1]">
                {filteredRows.map(({ group, submission }) => {
                  const isSubmitted =
                    submission.status === "SUBMITTED";
                  const isExpanded = expandedGroup === group.id;
                  const isOverdue =
                    !isSubmitted &&
                    daysUntil(selectedAssignment.dueDate) < 0;

                  return (
                    <div key={group.id}>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedGroup(
                            isExpanded ? null : group.id
                          )
                        }
                        className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left transition hover:bg-[#FAFBFE]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDEFFB] text-[#2336F0]">
                            <Users size={20} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold">
                              {group.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-[#5B6180]">
                              {group.members.length} members
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
                            {isSubmitted
                              ? "Submitted"
                              : isOverdue
                                ? "Overdue"
                                : "Pending"}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`text-[#5B6180] transition-transform cursor-pointer ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[#E3E5F1] bg-[#FAFBFE] p-5">
                          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                Submission confirmation
                              </p>

                              {isSubmitted ? (
                                <div className="mt-2">
                                  <p className="flex items-center gap-2 text-sm font-medium text-[#0E7A50]">
                                    <Check size={16} />
                                    Confirmed by {submission.confirmedBy}
                                  </p>
                                  {submission.confirmedAt && (
                                    <p className="mt-1 text-xs text-[#5B6180]">
                                      {dateTime(submission.confirmedAt)}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-[#5B6180]">
                                  This group has not confirmed its submission.
                                </p>
                              )}
                            </div>

                            <span className="text-xs text-[#5B6180]">
                              Due {shortDate(selectedAssignment.dueDate)}
                            </span>
                          </div>

                          <div className="border-t border-[#E3E5F1] pt-4">
                            <p className="mb-3 text-sm font-semibold">
                              Group members
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {group.members.map((member) => {
                                const isConfirmer =
                                  isSubmitted &&
                                  member.name === submission.confirmedBy;

                                return (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E5F1] bg-white p-3"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {member.name}
                                      </p>
                                      <p className="truncate text-xs text-[#5B6180]">
                                        {member.email}
                                      </p>
                                    </div>

                                    {isConfirmer ? (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E6F6EF] px-2 py-1 text-[11px] font-semibold text-[#0E7A50]">
                                        <Check size={12} />
                                        Confirmer
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[11px] text-[#9CA1BC]">
                                        Member
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <p className="mt-3 text-xs text-[#5B6180]">
                              The confirmation is recorded once for the
                              group. The named student is the member who
                              confirmed it; individual member submissions
                              are not tracked separately.
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
      </main>
    </div>
  );
}