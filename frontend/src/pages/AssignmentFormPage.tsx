import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, FileText, Users, X } from "lucide-react";
import Navbar from "./Navbar";
import api from "../services/api";

type Group = {
  id: string;
  name: string;
  members: number;
};

const inputClass =
  "w-full rounded-lg border border-[#DADDEE] bg-white px-4 py-3 text-sm text-[#0F1433] outline-none transition placeholder:text-[#9CA1BC] focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/10";

const labelClass = "mb-2 block text-sm font-semibold text-[#0F1433]";

const errMsg = (e: unknown, fallback: string): string =>
  (e as any)?.response?.data?.message ?? fallback;

// Accepts { _count: { members } } or a members array.
const toGroups = (raw: any[] | undefined): Group[] =>
  (raw ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    members: g._count?.members ?? g.members?.length ?? 0,
  }));

export default function AssignmentFormPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [oneDriveUrl, setOneDriveUrl] = useState("");
  const [audience, setAudience] = useState<"all" | "groups">("groups");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/group/all")
      .then(({ data }) => {
        if (!cancelled) setGroups(toGroups(data.groups));
      })
      .catch((e) => {
        if (!cancelled) setGroupsError(errMsg(e, "Could not load groups"));
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleGroup = (id: string) => {
    setSelectedGroups((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
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

    setSubmitting(true);

    try {
      await api.post("/assignment/create", {
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(`${dueDate}T23:59:00`).toISOString(),
        oneDriveUrl: oneDriveUrl.trim(),
        groupIds: audience === "all" ? "all" : selectedGroups,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(errMsg(err, "Could not create the assignment"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-[#0F1433]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-12 pt-6">
        <div className="mb-8">
          <h1 className="font-['Bricolage_Grotesque'] text-4xl font-bold tracking-tight">
            Create assignment
          </h1>
          <p className="mt-2 text-[15px] text-[#5B6180]">
            Add assignment details and choose which groups should receive it.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid items-start gap-7 lg:grid-cols-[1fr_320px]">
            <section className="space-y-7 rounded-2xl bg-white p-6 shadow-[6px_6px_0_0_rgba(15,20,51,0.08)] sm:p-8">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDEFFB] text-[#2336F0]">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h2 className="font-bold">Assignment details</h2>
                    <p className="text-xs text-[#68718F]">
                      Basic information about the assignment
                    </p>
                  </div>
                </div>

                <label className={labelClass} htmlFor="title">
                  Assignment title
                </label>
                <input
                  id="title"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Process scheduling"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the assignment requirements..."
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="dueDate">
                  Due date
                </label>
                <div className="relative">
                  <CalendarDays
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#68718F]"
                  />
                  <input
                    id="dueDate"
                    type="date"
                    required
                    min={new Date().toLocaleDateString("en-CA")}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`${inputClass} pl-11`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="oneDriveUrl">
                  OneDrive submission link
                </label>
                <input
                  id="oneDriveUrl"
                  type="url"
                  required
                  value={oneDriveUrl}
                  onChange={(e) => setOneDriveUrl(e.target.value)}
                  placeholder="https://onedrive.live.com/..."
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-[#68718F]">
                  Students will use this link to access the assignment folder.
                </p>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl bg-white p-6 shadow-[6px_6px_0_0_rgba(15,20,51,0.08)]">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDEFFB] text-[#2336F0]">
                    <Users size={18} />
                  </span>
                  <div>
                    <h2 className="font-bold">Assign to</h2>
                    <p className="text-xs text-[#68718F]">
                      Choose assignment audience
                    </p>
                  </div>
                </div>

                <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#DADDEE] p-3 transition hover:border-[#2336F0]">
                  <input
                    type="radio"
                    checked={audience === "all"}
                    onChange={() => setAudience("all")}
                    className="mt-1 accent-[#2336F0]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      All groups
                    </span>
                    <span className="mt-1 block text-xs text-[#68718F]">
                      Assign to every registered group
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#DADDEE] p-3 transition hover:border-[#2336F0]">
                  <input
                    type="radio"
                    checked={audience === "groups"}
                    onChange={() => setAudience("groups")}
                    className="mt-1 accent-[#2336F0]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      Specific groups
                    </span>
                    <span className="mt-1 block text-xs text-[#68718F]">
                      Select individual groups
                    </span>
                  </span>
                </label>

                {audience === "groups" && (
                  <div className="mt-5 border-t border-[#E3E5F1] pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Select groups</p>
                      <span className="text-xs text-[#68718F]">
                        {selectedGroups.length} selected
                      </span>
                    </div>

                    {groupsLoading ? (
                      <p className="text-sm text-[#68718F]">Loading groups…</p>
                    ) : groupsError ? (
                      <p role="alert" className="text-sm text-[#B42318]">
                        {groupsError}
                      </p>
                    ) : groups.length === 0 ? (
                      <p className="text-sm text-[#68718F]">
                        No groups have been created yet. Students create groups
                        from their dashboard.
                      </p>
                    ) : (
                      <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin] [scrollbar-color:#C7CCE0_transparent]">
                        {groups.map((group) => (
                          <label
                            key={group.id}
                            className="flex cursor-pointer items-center justify-between rounded-lg p-2 transition hover:bg-[#F6F7FB]"
                          >
                            <span>
                              <span className="block text-sm font-medium">
                                {group.name}
                              </span>
                              <span className="text-xs text-[#68718F]">
                                {group.members}{" "}
                                {group.members === 1 ? "member" : "members"}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedGroups.includes(group.id)}
                              onChange={() => toggleGroup(group.id)}
                              className="h-4 w-4 accent-[#2336F0]"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </aside>
          </div>

          {error && (
            <p role="alert" className="mt-5 text-sm font-medium text-[#B42318]">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#DADDEE] bg-white px-5 text-sm font-semibold text-[#0F1433] transition hover:border-[#2336F0]"
            >
              <X size={16} />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#2336F0] px-6 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create assignment"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}