import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";


const STEPS = [
  {
    title: "Create your account",
    text: "Use your college email so classmates can find you.",
  },
  {
    title: "Form your group",
    text: "Add members by email or student ID.",
  },
  {
    title: "Confirm your submission",
    text: "Upload to OneDrive, then confirm in two clicks.",
  },
];

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=DM+Sans:wght@400;500;600&display=swap");

.jf-root { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; }
.jf-display { font-family: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.02em; }

@keyframes jf-check {
  0%   { transform: scale(0.4); }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.jf-check { animation: jf-check 300ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .jf-check { animation: none; }
}
`;

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10">
        <div className="absolute left-1.5 top-1.5 h-full w-full rounded-xl bg-[#FFE14D]" />
        <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-[#2336F0] text-white ring-1 ring-white/20">
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

/* The three steps light up in turn, so the page explains the product while you fill the form. */
function Steps() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(1);
      return;
    }
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <ol className="w-full max-w-[420px] rounded-2xl bg-white p-3 text-[#0F1433] shadow-[10px_10px_0_0_rgba(15,20,51,0.35)]">
      {STEPS.map((step, i) => {
        const isActive = i === active;
        const isDone = i < active;
        return (
          <li
            key={step.title}
            className={`flex gap-4 rounded-xl p-4 transition-colors duration-300 ${
              isActive ? "bg-[#F1F3FF]" : ""
            }`}
          >
            <span
              className={`jf-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold transition-colors duration-300 ${
                isDone
                  ? "border-[#14A36B] bg-[#14A36B] text-white"
                  : isActive
                  ? "border-[#0F1433] bg-[#FFE14D] text-[#0F1433]"
                  : "border-[#DADDEE] bg-white text-[#8A8FAA]"
              }`}
            >
              {isDone ? (
                <Check key={`done-${i}`} size={16} strokeWidth={3.5} className="jf-check" />
              ) : (
                i + 1
              )}
            </span>
            <div>
              <p className="text-[15px] font-semibold">{step.title}</p>
              <p className="mt-0.5 text-sm leading-5 text-[#5B6180]">{step.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function getStrength(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return pw.length < 8 ? Math.min(score, 1) : Math.max(score, 1);
}

const STRENGTH_LABEL = ["", "Too weak", "Okay", "Good", "Strong"];
const STRENGTH_COLOR = ["#DADDEE", "#E5484D", "#F59E0B", "#2336F0", "#14A36B"];

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = getStrength(form.password);
  const {signup} = useAuth()
  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      navigate("/dashboard");
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(message || "Couldn't create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-lg border border-[#DADDEE] bg-white pl-11 pr-4 text-[15px] text-[#0F1433] placeholder:text-[#9CA1BC] outline-none transition focus:border-[#2336F0] focus:ring-4 focus:ring-[#2336F0]/15";
  const iconClass =
    "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA1BC]";
  const labelClass = "mb-2 block text-sm font-medium text-[#0F1433]";

  return (
    <main className="jf-root grid min-h-screen bg-[#F6F7FB] lg:grid-cols-[1.1fr_1fr]">
      <style>{STYLES}</style>

      {/* Showcase side */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden bg-[#2336F0] px-16 py-8 lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <Logo light />

        <div className="flex flex-col gap-10 py-10">
          <div className="max-w-md">
            <h2 className="jf-display text-5xl font-bold leading-[1.08] text-white">
              Your group is three steps from submitted.
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-7 text-white/80">
              Sign up, bring your classmates in, and keep every assignment
              in one place.
            </p>
          </div>

          <Steps />
        </div>

        <div />
      </section>

      {/* Form side */}
      <section className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <div className="lg:hidden">
          <Logo />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="jf-display text-4xl font-bold text-[#0F1433]">
              Create your account
            </h1>
            <p className="mt-3 text-[15px] text-[#5B6180]">
              It takes less than a minute.
            </p>

            <form onSubmit={handleSignup} className="mt-9 space-y-5">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Full name
                </label>
                <div className="relative">
                  <User size={18} className={iconClass} />
                  <input
                    id="name"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className={iconClass} />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@college.edu"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole size={18} className={iconClass} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#9CA1BC] transition hover:text-[#0F1433] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2336F0]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3" aria-live="polite">
                  <div className="flex flex-1 gap-1.5">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor:
                            seg <= strength ? STRENGTH_COLOR[strength] : "#E3E5F1",
                        }}
                      />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs text-[#5B6180]">
                    {STRENGTH_LABEL[strength]}
                  </span>
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
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-8 text-sm text-[#5B6180]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#2336F0] underline-offset-4 hover:underline focus:outline-none focus-visible:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}