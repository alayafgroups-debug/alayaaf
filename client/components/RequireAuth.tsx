import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { checkPerm, permissionForHRPath, permissionForMainPath, permissionForMainSubPath } from "@/lib/authSession";

/**
 * Route guard: only renders protected routes when a Supabase Auth session exists.
 * Redirects to /login otherwise. RLS on the database requires an authenticated
 * session for every read/write, so the app must be logged in to work.
 */
export default function RequireAuth() {
  const location = useLocation();
  const { permissions, ready: permissionsReady } = useRolePermissions();
  const [status, setStatus] = useState<"loading" | "authed" | "guest">("loading");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "authed" : "guest");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? "authed" : "guest");
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading" || !permissionsReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-[#004e89]" />
      </div>
    );
  }

  if (status === "guest") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (location.pathname !== "/") {
    const mainKey = permissionForMainPath(location.pathname);
    const keys = location.pathname.startsWith("/hr") ? permissionForHRPath(location.pathname) : permissionForMainSubPath(location.pathname);
    if (mainKey && !checkPerm(permissions, ...keys)) return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
