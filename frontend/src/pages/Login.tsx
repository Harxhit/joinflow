import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import api from "../services/api";

/*
  Palette
  cobalt    #2336F0  brand + primary action
  ink       #0F1433  text and sticker outline
  paper     #F6F7FB  form side background
  highlight #FFE14D  the "Submitted" sticker
  confirm   #14A36B  confirmed checks only
*/

const MEMBERS = [
  { name: "Aarav Mehta", initials: "AM", color: "#7C3AED" },
  { name: "Meera Iyer", initials: "MI", color: "#EA580C" },
  { name: "Kabir Shah", initials: "KS", color: "#0F766E" },
  { name: "Isha Verma", initials: "IV", color: "#DB2777" },
];

const GROUPS = [
  { name: "Orbit", done: 4 },
  { name: "Nimbus", done: 3 },
  { name: "Quanta", done: 2 },
  { name: "Helix", done: 1 },
];

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");

.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }

@keyframes jf-stamp {
  0%   { opacity: 0; transform: rotate(-8deg) scale(2.2); }
  60%  { opacity: 1; transform: rotate(-8deg) scale(0.94); }
  100% { opacity: 1; transform: rotate(-8deg) scale(1); }
}
@keyframes jf-check {
  0%   { transform: scale(0.4); }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes jf-grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.jf-stamp { animation: jf-stamp 420ms cubic-bezier(.2,.8,.3,1) both; }
.jf-check { animation: jf-check 300ms ease-out both; }
.jf-grow  { transform-origin: left; animation: jf-grow 700ms cubic-bezier(.2,.8,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .jf-stamp, .jf-check, .jf-grow { animation: none; }
}
`;

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10">
        <div className="absolute left-1.5 top-1.5 h-full w-full rounded-xl bg-[#FFE14D]" />
        <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-[#2336F0] text-white">
          <Check size={20} strokeWidth={3} />
        </div>
      </div>
      <span
        className={`jf-display text-xl font-bold ${
          light ? "text-white" : "text-[#0F1433]"
        }`}
      >
        JoinFlow
      </span>
    </div>
  );
}

/* The one memorable thing: a submission receipt that fills in and gets stamped. */
function Preview() {
  const [view, setView] = useState<"student" | "professor">("student");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick(4);
      return;
    }
    const id = setInterval(() => setTick((t) => (t + 1) % 7), 1100);
    return () => clearInterval(id);
  }, []);

  const confirmed = Math.min(tick, 4);
  const stamped = tick >= 4;
  const totalDone = GROUPS.reduce((n, g) => n + g.done, 0);

  return (
    <div className="w-full max-w-[420px]">
      <div
        className="mb-5 inline-flex rounded-full bg-white/15 p-1"
        role="group"
        aria-label="Preview"
      >
        {(["student", "professor"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              view === v
                ? "bg-white text-[#2336F0]"
                : "text-white/80 hover:text-white"
            }`}
          >
            {v === "student" ? "Student view" : "Professor view"}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl bg-white p-6 text-[#0F1433] shadow-[10px_10px_0_0_rgba(15,20,51,0.35)]">
        <p className="text-sm text-[#5B6180]">Operating Systems</p>
        <h3 className="jf-display mt-0.5 text-2xl font-bold leading-tight">
          Lab 4: Process scheduling
        </h3>
        <p className="mt-1 text-sm text-[#5B6180]">Due Friday, 28 Nov, 11:59 pm</p>

        {view === "student" ? (
          <div key="student" className="mt-6">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">Group Orbit</span>
              <span className="text-[#5B6180]">{confirmed} of 4 confirmed</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EAF5]">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-500 ${
                  stamped ? "bg-[#14A36B]" : "bg-[#2336F0]"
                }`}
                style={{ width: `${(confirmed / 4) * 100}%` }}
              />
            </div>

            <ul className="mt-5 space-y-3">
              {MEMBERS.map((m, i) => {
                const done = i < confirmed;
                return (
                  <li key={m.name} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.initials}
                    </span>
                    <span className="flex-1 text-sm font-medium">{m.name}</span>
                    {done ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-[#0E7A50]">
                        <span className="jf-check flex h-5 w-5 items-center justify-center rounded-full bg-[#14A36B] text-white">
                          <Check size={12} strokeWidth={3.5} />
                        </span>
                        Confirmed
                      </span>
                    ) : (
                      <span className="text-sm text-[#8A8FAA]">Waiting</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {stamped && (
              <div className="jf-stamp absolute -right-4 top-20 rounded-md border-[3px] border-[#0F1433] bg-[#FFE14D] px-4 py-1.5">
                <span className="jf-display text-xl font-bold">Submitted</span>
              </div>
            )}
          </div>
        ) : (
          <div key="professor" className="mt-6">
            <p className="text-sm font-semibold">Group progress</p>
            <ul className="mt-4 space-y-4">
              {GROUPS.map((g, i) => (
                <li key={g.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-[#5B6180]">{g.done} / 4</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E8EAF5]">
                    <div
                      className={`jf-grow h-full rounded-full ${
                        g.done === 4 ? "bg-[#14A36B]" : "bg-[#2336F0]"
                      }`}
                      style={{
                        width: `${(g.done / 4) * 100}%`,
                        animationDelay: `${i * 90}ms`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-[#5B6180]">
              {totalDone} of 16 students have confirmed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/login", { email, password });
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(message || "Couldn't sign you in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-lg border border-[#DADDEE] bg-white pl-11 pr-4 text-[15px] text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";

  return (
    <main className="jf-root grid min-h-screen bg-[#F6F7FB] lg:grid-cols-[1fr_1.1fr]">
      <style>{STYLES}</style>

      {/* Form side */}
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <Logo />

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="jf-display text-4xl font-bold text-[#0F1433]">
              Sign in
            </h1>
            <p className="mt-3 text-[15px] text-[#5B6180]">
              Pick up where your group left off.
            </p>

            <form onSubmit={handleLogin} className="mt-9 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#0F1433]"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA1BC]"
                  />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#0F1433]"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA1BC]"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#9CA1BC] cursor-pointer transition hover:text-[#0F1433] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2336F0]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-lg bg-[#2336F0] text-[15px] font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-sm text-[#5B6180]">
              No account yet?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#2336F0] underline-offset-4 hover:underline focus:outline-none focus-visible:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Showcase side */}
      <section
        className="relative hidden flex-col justify-center gap-10 overflow-hidden bg-[#2336F0] px-16 py-12 lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <div className="max-w-md">
          <h2 className="jf-display text-5xl font-bold leading-[1.08] text-white">
            Submit as a group. Know it went through.
          </h2>
          <p className="mt-5 max-w-sm text-lg leading-7 text-white/80">
            Every member confirms their part, and professors see exactly who
            is done.
          </p>
        </div>

        <Preview />
      </section>
    </main>
  );
}