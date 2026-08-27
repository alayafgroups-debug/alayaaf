import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { readUserSession, type PermissionMap } from "@/lib/authSession";

type PermState = {
  permissions: PermissionMap;
  ready: boolean;
};

/**
 * Fetches the current user's role permissions from user_roles table on every
 * navigation so changes in the role editor take effect without re-login.
 */
export function useRolePermissions(): PermState {
  const location = useLocation();
  const [state, setState] = useState<PermState>({ permissions: {}, ready: false });

  useEffect(() => {
    let cancelled = false;
    const session = readUserSession();
    if (!session?.role) {
      setState({ permissions: {}, ready: true });
      return;
    }
    if (["مدير النظام", "مدير عام", "المدير العام"].includes(session.role)) {
      setState({ permissions: { "*": "manage" }, ready: true });
      return;
    }
    supabase
      .from("user_roles")
      .select("permissions")
      .eq("name_ar", session.role)
      .eq("status", "فعال")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const perms =
          data?.permissions && typeof data.permissions === "object" && !Array.isArray(data.permissions)
            ? (data.permissions as PermissionMap)
            : {};
        setState({ permissions: perms, ready: true });
      });
    return () => { cancelled = true; };
  // refetch on every route change so role-editor updates are immediate
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return state;
}
