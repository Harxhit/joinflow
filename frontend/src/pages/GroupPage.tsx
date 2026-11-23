import { useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Layers3,
  Users,
} from "lucide-react";
import Navbar from "./Navbar";

type Member = {
  id: string;
  name: string;
  email: string;
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  oneDriveUrl: string;
};

type Submission = {
  assignmentId: string;
  status: "PENDING" | "SUBMITTED";
  confirmedBy?: string;
  confirmedAt?: string;
};

const MOCK_GROUP = {
  id: "g1",
  name: "Orbit",
  members: [
    {
      id: "m1",
      name: "Harshit Parihar",
      email: "harshit@example.com",
    },
    {
      id: "m2",
      name: "Aarav Mehta",
      email: "aarav@college.edu",
    },
    {
      id: "m3",
      name: "Meera Iyer",
      email: "meera@college.edu",
    },
    {
      id: "m4",
      name: "Kabir Shah",
      email: "kabir@college.edu",
    },
  ] as Member[],
};

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "a1",
    title: "Lab 4: Process scheduling",
    description:
      "Implement round robin and MLFQ, then compare average waiting time.",
    dueDate: "2026-11-25",
    oneDriveUrl: "https://onedrive.live.com/",
  },
  {
    id: "a2",
    title: "ER diagram and schema",
    description:
      "Model the library system and submit the diagram with your SQL.",
    dueDate: "2026-11-28",
    oneDriveUrl: "https://onedrive.live.com/",
  },
  {
    id: "a3",
    title: "Computer Networks Assignment",
    description:
      "Analyze TCP congestion control mechanisms and prepare a report.",
    dueDate: "2026-11-30",
    oneDriveUrl: "https://onedrive.live.com/",
  },
  {
    id: "a4",
    title: "Software Engineering Report",
    description:
      "Prepare project documentation, requirements and system design.",
    dueDate: "2026-12-04",
    oneDriveUrl: "https://onedrive.live.com/",
  },
  {
    id: "a5",
    title: "Data Structures Assignment",
    description:
      "Implement graph traversal and shortest path algorithms.",
    dueDate: "2026-12-08",
    oneDriveUrl: "https://onedrive.live.com/",
  },
];

const MOCK_SUBMISSIONS: Submission[] = [
  {
    assignmentId: "a1",
    status: "SUBMITTED",
    confirmedBy: "Harshit Parihar",
    confirmedAt: "2026-11-22T10:30:00",
  },
  {
    assignmentId: "a2",
    status: "SUBMITTED",
    confirmedBy: "Meera Iyer",
    confirmedAt: "2026-11-23T09:15:00",
  },
  {
    assignmentId: "a3",
    status: "PENDING",
  },
  {
    assignmentId: "a4",
    status: "PENDING",
  },
  {
    assignmentId: "a5",
    status: "PENDING",
  },
];

const DAY = 86_400_000;

function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysUntil(date: string) {
  const due = parseLocalDate(date);
  const today = new Date();

  const dueDay = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  ).getTime();

  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  return Math.round((dueDay - todayDay) / DAY);
}

function formatDate(date: string) {
  return parseLocalDate(date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dueText(date: string) {
  const days = daysUntil(date);

  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";

  return `Due in ${days} days`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E7F3] bg-white p-5 shadow-[0_3px_8px_rgba(20,30,70,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#68718F]">{label}</p>
        <Icon size={20} className={iconColor} />
      </div>

      <p className="mt-4 text-3xl font-semibold text-[#111936]">
        {value}
      </p>
    </div>
  );
}

function MemberCard({
  member,
  index,
}: {
  member: Member;
  index: number;
}) {
  const avatarColors = [
    "bg-[#EDEEFF] text-[#293BFA]",
    "bg-[#F0E8FF] text-[#8339E9]",
    "bg-[#FFF0E7] text-[#EF5A13]",
    "bg-[#DDF4F0] text-[#117F72]",
  ];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          avatarColors[index % avatarColors.length]
        }`}
      >
        {getInitials(member.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#111936]">
          {member.name}
        </p>
        <p className="truncate text-xs text-[#68718F]">
          {member.email}
        </p>
      </div>

      {index === 0 && (
        <span className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-xs font-medium text-[#293BFA]">
          You
        </span>
      )}
    </div>
  );
}

export default function GroupPage() {
  const { groupId } = useParams();

  // Mock group is shown for preview.
  const group =
    !groupId || groupId === MOCK_GROUP.id ? MOCK_GROUP : null;

  if (!group) {
    return (
      <div className="min-h-screen bg-[#F5F6FC] text-[#111936]">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <div className="mt-8 rounded-2xl border border-[#E4E7F3] bg-white p-8">
            <h1 className="text-2xl font-semibold">Group not found</h1>
            <p className="mt-2 text-sm text-[#68718F]">
              The requested group could not be found.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const assignmentData = MOCK_ASSIGNMENTS.map((assignment) => {
    const submission =
      MOCK_SUBMISSIONS.find(
        (item) => item.assignmentId === assignment.id
      ) ?? {
        assignmentId: assignment.id,
        status: "PENDING" as const,
      };

    return { assignment, submission };
  });

  const total = assignmentData.length;

  const submitted = assignmentData.filter(
    (item) => item.submission.status === "SUBMITTED"
  ).length;

  const pending = total - submitted;

  const overdue = assignmentData.filter(
    (item) =>
      item.submission.status === "PENDING" &&
      daysUntil(item.assignment.dueDate) < 0
  ).length;

  const percentage = total
    ? Math.round((submitted / total) * 100)
    : 0;

  const R = 52;
  const C = 2 * Math.PI * R;

  const sortedAssignments = [...assignmentData].sort(
    (a, b) =>
      Number(a.submission.status === "SUBMITTED") -
        Number(b.submission.status === "SUBMITTED") ||
      parseLocalDate(a.assignment.dueDate).getTime() -
        parseLocalDate(b.assignment.dueDate).getTime()
  );

  return (
    <div className="min-h-screen bg-[#F5F6FC] text-[#111936]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 pb-10">
        {/* Group heading */}
        <div className="mb-8 mt-0 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111936]">
              {group.name}
            </h1>

            <p className="mt-2 text-base text-[#68718F]">
              Monitor your team's assignments and submission progress.
            </p>

            <div className="mt-4 flex items-center gap-4 text-sm text-[#68718F]">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-[#293BFA]" />
                {group.members.length} members
              </span>

              <span className="h-1 w-1 rounded-full bg-[#B5BAD0]" />

              <span>{total} assignments</span>
            </div>
          </div>

          <span className="rounded-full bg-[#EEF0FF] px-4 py-2 text-sm font-medium text-[#293BFA]">
            {overdue > 0 ? `${overdue} overdue` : "In progress"}
          </span>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total assignments"
            value={total}
            icon={ClipboardList}
            iconColor="text-[#293BFA]"
          />
          <StatCard
            label="Submitted"
            value={submitted}
            icon={CheckCircle2}
            iconColor="text-[#16866F]"
          />
          <StatCard
            label="Pending"
            value={pending}
            icon={Clock3}
            iconColor="text-[#E8A900]"
          />
          <StatCard
            label="Overdue"
            value={overdue}
            icon={CalendarDays}
            iconColor="text-[#E85B49]"
          />
        </div>

        {/* Main content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Progress */}
            <section className="rounded-2xl border border-[#E4E7F3] bg-white p-6 shadow-[0_3px_8px_rgba(20,30,70,0.04)]">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#111936]">
                  Group progress
                </h2>

                <div className="rounded-xl bg-[#EEF0FF] p-2 text-[#293BFA]">
                  <Layers3 size={19} />
                </div>
              </div>

              <div className="relative mx-auto mt-5 h-44 w-44">
                <svg
                  viewBox="0 0 128 128"
                  className="h-full w-full -rotate-90"
                >
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    fill="none"
                    stroke="#E8EAF4"
                    strokeWidth="11"
                  />

                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    fill="none"
                    stroke="#293BFA"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - percentage / 100)}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-[#111936]">
                    {percentage}%
                  </span>
                  <span className="mt-1 text-xs text-[#68718F]">
                    completed
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#E9EBF4] pt-5">
                <span className="text-sm text-[#68718F]">
                  Overall completion
                </span>
                <span className="text-sm font-semibold text-[#293BFA]">
                  {submitted} / {total}
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8EAF4]">
                <div
                  className="h-full rounded-full bg-[#293BFA]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </section>

            {/* Members */}
            <section className="rounded-2xl border border-[#E4E7F3] bg-white p-6 shadow-[0_3px_8px_rgba(20,30,70,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-[#111936]">
                    Group members
                  </h2>
                  <p className="mt-1 text-xs text-[#68718F]">
                    Your team members
                  </p>
                </div>

                <div className="rounded-xl bg-[#EEF0FF] p-2 text-[#293BFA]">
                  <Users size={19} />
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {group.members.map((member, index) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    index={index}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right column */}
          <section>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#111936]">
                  Assignment progress
                </h2>
                <p className="mt-1 text-sm text-[#68718F]">
                  Track the submission status of each assignment.
                </p>
              </div>

              <span className="text-xs text-[#68718F]">
                {submitted} of {total} completed
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E4E7F3] bg-white shadow-[0_3px_8px_rgba(20,30,70,0.04)]">
              {sortedAssignments.map(
                ({ assignment, submission }, index) => {
                  const isSubmitted =
                    submission.status === "SUBMITTED";

                  const isOverdue =
                    !isSubmitted &&
                    daysUntil(assignment.dueDate) < 0;

                  const date = parseLocalDate(assignment.dueDate);

                  return (
                    <article
                      key={assignment.id}
                      className={`p-5 transition hover:bg-[#FAFAFE] ${
                        index !== 0
                          ? "border-t border-[#E9EBF4]"
                          : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div
                            className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${
                              isSubmitted
                                ? "bg-[#EEF0FF] text-[#293BFA]"
                                : isOverdue
                                ? "bg-[#FDECE9] text-[#E85B49]"
                                : index === 0
                                ? "bg-[#FFE34D] text-[#111936]"
                                : "bg-[#EEF0FF] text-[#111936]"
                            }`}
                          >
                            <span className="text-xs font-medium">
                              {date.toLocaleDateString("en-IN", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-2xl font-bold leading-tight">
                              {date.getDate()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-semibold text-[#111936]">
                              {assignment.title}
                            </h3>

                            <p className="mt-1 text-sm text-[#68718F]">
                              {dueText(assignment.dueDate)},{" "}
                              {formatDate(assignment.dueDate)}
                            </p>

                            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#68718F]">
                              {assignment.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                            isSubmitted
                              ? "bg-[#E6F6EF] text-[#16866F]"
                              : isOverdue
                              ? "bg-[#FDECE9] text-[#E85B49]"
                              : "bg-[#EEF0FF] text-[#293BFA]"
                          }`}
                        >
                          {isSubmitted
                            ? "Submitted"
                            : isOverdue
                            ? "Overdue"
                            : "Pending"}
                        </span>
                      </div>

                      {isSubmitted && (
                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#D5EEE2] bg-[#F0FAF5] p-3">
                          <CheckCircle2
                            size={17}
                            className="mt-0.5 shrink-0 text-[#16866F]"
                          />

                          <div>
                            <p className="text-sm font-medium text-[#16866F]">
                              Submission confirmed
                            </p>
                            <p className="mt-1 text-xs text-[#68718F]">
                              Confirmed by {submission.confirmedBy}
                              {submission.confirmedAt
                                ? ` · ${new Date(
                                    submission.confirmedAt
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap justify-end gap-3">
                        <a
                          href={assignment.oneDriveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DDE1F0] bg-white px-4 py-2.5 text-sm font-medium text-[#111936] transition hover:bg-[#F5F6FC]"
                        >
                          OneDrive
                          <ExternalLink size={15} />
                        </a>

                        <button
                          type="button"
                          disabled={isSubmitted}
                          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                            isSubmitted
                              ? "cursor-default bg-[#E6F6EF] text-[#16866F]"
                              : "bg-[#293BFA] text-white shadow-[0_2px_0_#1728C9] hover:bg-[#1F31E5]"
                          }`}
                        >
                          {isSubmitted
                            ? "Submitted"
                            : "Mark submitted"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        </div>

        <footer className="mt-10 border-t border-[#E4E7F3] pt-5 text-center text-xs text-[#8990A9]">
          JoinFlow · Group workspace
        </footer>
      </main>
    </div>
  );
}