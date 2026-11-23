import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Check, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E3E5F1] bg-[#F6F7FB]/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to={ "/dashboard"} className="flex items-center gap-3">
            <span className="relative block h-9 w-9">
              <span className="absolute left-1 top-1 h-full w-full rounded-lg bg-[#FFE14D]" />
              <span className="relative flex h-full w-full items-center justify-center rounded-lg bg-[#2336F0] text-white">
                <Check size={18} strokeWidth={3} />
              </span>
            </span>
            <span className="jf-display text-lg font-bold text-[#0F1433]">JoinFlow</span>
          </Link>

          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-md px-1 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2336F0] ${
                  isActive ? "text-[#2336F0]" : "text-[#5B6180] hover:text-[#0F1433]"
                }`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        {/* Right side: placeholder while checking the session, then either guest links or the user menu */}
        {loading ? (
          <div className="h-9 w-28" aria-hidden />
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-[#EDEFFB] px-3 py-1 text-xs font-medium text-[#2336F0] sm:inline">
              {user.role.toLowerCase()}
            </span>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-2 rounded-full border border-[#DADDEE] bg-white py-1 pl-1 pr-3 transition hover:border-[#2336F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/20"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2336F0] text-xs font-semibold text-white">
                  {initials(user.name) || "U"}
                </span>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-[#0F1433] sm:block">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown
                  size={15}
                  className={`text-[#5B6180] transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-[#E3E5F1] bg-white shadow-[6px_6px_0_0_rgba(15,20,51,0.12)]"
                >
                  <div className="border-b border-[#E3E5F1] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[#0F1433]">{user.name}</p>
                    <p className="truncate text-xs text-[#5B6180]">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#0F1433] transition hover:bg-[#F6F7FB] focus:bg-[#F6F7FB] focus:outline-none"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#0F1433] transition hover:text-[#2336F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2336F0]"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-[#2336F0] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_0_0_#1424B8] transition hover:bg-[#1A2BDB] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2336F0]/30"
            >
              Create account
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}