import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Save } from "lucide-react";
import Navbar from "./Navbar";
import api from "../services/api";

type Group = {
  id: string;
  name: string;
  members: number;
};

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  oneDriveUrl: string;
  groupIds: string[];
};

type LoadState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      assignment: Assignment;
      groups: Group[];
      groupsNote: string | null;
      initialAudience: "all" | "groups";
    };

const inputCls =
  "h-11 w-full rounded-lg border border-[#DADDEE] bg-white px-3.5 text-[15px] text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";

const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2336F0] px-4 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30";

const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-4 text-sm font-medium text-[#0F1433] transition hover:border-[#2336F0] hover:text-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20";

const panel =
  "rounded-2xl bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");
.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }
`;

const errMsg = (e: unknown, fallback: string): string =>
  (e as any)?.response?.data?.message ?? fallback;

// Accepts { _count: { members } } or a members array.
const toGroups = (raw: any[] | undefined): Group[] =>
  (raw ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    members: g._count?.members ?? g.members?.length ?? 0,
  }));

function toInputDate(iso: string) {
  const date = new Date(iso);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="jf-root min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <style>{STYLES}</style>
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}

function MessagePanel({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className={`${panel} mt-6 p-8`}>
      <h1 className="jf-display text-2xl font-bold">{title}</h1>

      {detail && <p className="mt-2 text-sm text-[#5B6180]">{detail}</p>}

      <Link to="/dashboard" className={`${btnPrimary} mt-5`}>
        Return to dashboard
      </Link>
    </div>
  );
}

export default function AssignmentEditPage() {
  const { assignmentId } = useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      const [assignmentRes, groupsRes] = await Promise.allSettled([
        api.get(`/assignment/${assignmentId}`),
        api.get("/group/all"),
      ]);

      if (cancelled) return;

      if (assignmentRes.status === "rejected") {
        const e: any = assignmentRes.reason;

        setState(
          e?.response?.status === 404
            ? { status: "notFound" }
            : {
                status: "error",
                message: errMsg(e, "Could not load this assignment."),
              }
        );
        return;
      }

      const raw = assignmentRes.value.data.assignment;

      const assignment: Assignment = {
        id: raw.id,
        title: raw.title,
        description: raw.description ?? "",
        dueDate: raw.dueDate,
        oneDriveUrl: raw.oneDriveUrl ?? "",
        groupIds: (raw.groups ?? []).map((g: any) => g.groupId),
      };

      // Full group list when /group/all works; otherwise fall back to the
      // groups already on this assignment so editing still works.
      const fullList =
        groupsRes.status === "fulfilled"
          ? toGroups(groupsRes.value.data.groups)
          : null;

      const groups =
        fullList ?? toGroups((raw.groups ?? []).map((ag: any) => ag.group));

      setState({
        status: "ready",
        assignment,
        groups,
        groupsNote: fullList
          ? null
          : "Couldn't load the full group list, so only groups already on this assignment are shown.",
        initialAudience:
          fullList &&
          fullList.length > 0 &&
          fullList.every((g) => assignment.groupIds.includes(g.id))
            ? "all"
            : "groups",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  if (state.status === "loading") {
    return (
      <PageShell>
        <div className={`${panel} mt-6 p-8 text-sm text-[#5B6180]`}>
          Loading assignment…
        </div>
      </PageShell>
    );
  }

  if (state.status === "notFound") {
    return (
      <PageShell>
        <MessagePanel
          title="Assignment not found"
          detail={`No assignment exists with ID "${assignmentId}".`}
        />
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell>
        <MessagePanel
          title="Can't open this assignment"
          detail={state.message}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AssignmentEditForm
        assignment={state.assignment}
        groups={state.groups}
        groupsNote={state.groupsNote}
        initialAudience={state.initialAudience}
      />
    </PageShell>
  );
}

function AssignmentEditForm({
  assignment,
  groups,
  groupsNote,
  initialAudience,
}: {
  assignment: Assignment;
  groups: Group[];
  groupsNote: string | null;
  initialAudience: "all" | "groups";
}) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [dueDate, setDueDate] = useState(toInputDate(assignment.dueDate));
  const [oneDriveUrl, setOneDriveUrl] = useState(assignment.oneDriveUrl);
  const [audience, setAudience] = useState<"all" | "groups">(initialAudience);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    assignment.groupIds
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const toggleGroup = (id: string) => {
    setSelectedGroups((current) =>
      current.includes(id)
        ? current.filter((groupId) => groupId !== id)
        : [...current, id]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (audience === "groups" && selectedGroups.length === 0) {
      setError("Select at least one group.");
      return;
    }

    setSaving(true);

    try {
      await api.patch(`/assignment/${assignment.id}`, {
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(`${dueDate}T23:59:00`).toISOString(),
        oneDriveUrl: oneDriveUrl.trim(),
        groupIds: audience === "all" ? "all" : selectedGroups,
      });

      setSaved(true);
    } catch (err) {
      setError(errMsg(err, "Could not save your changes"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-7 mt-5">
        <h1 className="jf-display mt-1 text-4xl font-bold">
          Edit assignment
        </h1>

        <p className="mt-2 text-[15px] text-[#5B6180]">
          Update assignment details, deadline and group access.
        </p>
      </div>

      {saved ? (
        <div className={`${panel} p-8`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F6EF] text-[#0E7A50]">
            <Check size={24} strokeWidth={3} />
          </div>

          <h2 className="jf-display mt-5 text-2xl font-bold">
            Assignment updated
          </h2>

          <p className="mt-2 text-sm text-[#5B6180]">
            Your changes have been saved.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={btnGhost}
              onClick={() => setSaved(false)}
            >
              Continue editing
            </button>

            <Link to="/dashboard" className={btnPrimary}>
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className={`${panel} p-6 sm:p-8`}>
            <div className="mb-6 flex items-center justify-between border-b border-[#E3E5F1] pb-5">
              <div>
                <h2 className="jf-display text-xl font-bold">
                  Assignment details
                </h2>
                <p className="mt-1 text-sm text-[#5B6180]">
                  Assignment ID: {assignment.id}
                </p>
              </div>

              <span className="rounded-lg bg-[#EDEFFB] px-3 py-1.5 text-xs font-semibold text-[#2336F0]">
                Editing
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="assignment-title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Assignment title
                </label>

                <input
                  id="assignment-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter assignment title"
                  className={inputCls}
                />
              </div>

              <div>
                <label
                  htmlFor="assignment-description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="assignment-description"
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what students need to complete..."
                  className={`${inputCls} h-auto resize-y py-3`}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="assignment-due"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Due date
                  </label>

                  <input
                    id="assignment-due"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label
                    htmlFor="assignment-link"
                    className="mb-2 block text-sm font-semibold"
                  >
                    OneDrive submission link
                  </label>

                  <input
                    id="assignment-link"
                    type="url"
                    required
                    value={oneDriveUrl}
                    onChange={(e) => setOneDriveUrl(e.target.value)}
                    placeholder="https://onedrive.live.com/..."
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-[#E3E5F1] pt-6">
              <h2 className="jf-display text-xl font-bold">
                Assign to groups
              </h2>

              <p className="mt-1 text-sm text-[#5B6180]">
                Choose which groups should receive this assignment.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={audience === "all"}
                  onClick={() => setAudience("all")}
                  className={`rounded-xl border p-4 text-left transition ${
                    audience === "all"
                      ? "border-[#2336F0] bg-[#EDEFFB]"
                      : "border-[#DADDEE] bg-white hover:border-[#2336F0]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    All groups
                  </span>
                  <span className="mt-1 block text-xs text-[#5B6180]">
                    Assign to every group.
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={audience === "groups"}
                  onClick={() => setAudience("groups")}
                  className={`rounded-xl border p-4 text-left transition ${
                    audience === "groups"
                      ? "border-[#2336F0] bg-[#EDEFFB]"
                      : "border-[#DADDEE] bg-white hover:border-[#2336F0]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    Specific groups
                  </span>
                  <span className="mt-1 block text-xs text-[#5B6180]">
                    Select individual groups.
                  </span>
                </button>
              </div>

              {audience === "groups" && (
                <>
                  {groupsNote && (
                    <p className="mt-4 text-xs text-[#5B6180]">{groupsNote}</p>
                  )}

                  {groups.length === 0 ? (
                    <p className="mt-4 text-sm text-[#5B6180]">
                      No groups exist yet.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {groups.map((group) => (
                        <label
                          key={group.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                            selectedGroups.includes(group.id)
                              ? "border-[#2336F0] bg-[#F1F3FF]"
                              : "border-[#DADDEE] bg-white hover:border-[#2336F0]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => toggleGroup(group.id)}
                            className="h-4 w-4 accent-[#2336F0]"
                          />

                          <span className="text-sm font-medium">
                            {group.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-lg bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#B42318]"
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-[#E3E5F1] pt-6">
              <button
                type="button"
                className={btnGhost}
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>

              <button type="submit" className={btnPrimary} disabled={saving}>
                <Save size={16} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}