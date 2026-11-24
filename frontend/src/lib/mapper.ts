/* eslint-disable @typescript-eslint/no-explicit-any */
export type Member = { id: string; name: string; email: string };
export type Group = { id: string; name: string; members: Member[] };

export type Submission = {
  status: "PENDING" | "SUBMITTED";
  confirmedBy?: string;
  confirmedAt?: string;
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  oneDriveUrl: string;
  groupIds: string[];
};

export const PENDING: Submission = { status: "PENDING" };

export const errMsg = (e: unknown, fallback: string): string =>
  (e as any)?.response?.data?.message ?? fallback;

export const toGroup = (g: any): Group => ({
  id: g.id,
  name: g.name,
  members: (g.members ?? []).map((m: any) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  })),
});

export const toAssignment = (a: any): Assignment => ({
  id: a.id,
  title: a.title,
  description: a.description ?? "",
  dueDate: a.dueDate,
  oneDriveUrl: a.oneDriveUrl ?? "",
  groupIds: (a.groups ?? []).map((g: any) => g.groupId),
});

export const toSubmission = (raw: any, members: Member[]): Submission => {
  if (!raw) return PENDING;

  const status =
    String(raw.status ?? "SUBMITTED").toUpperCase() === "SUBMITTED"
      ? "SUBMITTED"
      : "PENDING";

  const byId = raw.confirmedById ?? raw.submittedById ?? raw.userId;

  return {
    status,
    confirmedBy: raw.confirmedBy?.name ?? members.find((m) => m.id === byId)?.name,
    confirmedAt: raw.confirmedAt ?? raw.submittedAt ?? raw.createdAt,
  };
};

export const toAssignmentDetail = (raw: any) => {
  const groups: Group[] = (raw.groups ?? []).map((ag: any) => toGroup(ag.group));
  const submissions: Record<string, Submission> = {};

  for (const sub of raw.submissions ?? []) {
    const group = groups.find((g) => g.id === sub.groupId);
    submissions[sub.groupId] = toSubmission(sub, group?.members ?? []);
  }

  return { groups, submissions };
};