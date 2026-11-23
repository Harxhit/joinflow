import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F6F7FB] text-sm text-[#5B6180]">
      Loading...
    </div>
  );
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}