export type PermissionMap = Record<string, boolean>;

export type UserSession = {
  id: string;
  email: string;
  empId: string;
  name: string;
  role: string;
  permissions: PermissionMap;
  portal: "business" | "employee";
};

export function readUserSession(): UserSession | null {
  try {
    const value = localStorage.getItem("user_session");
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<UserSession>;
    if (!parsed.id || !parsed.portal) return null;
    return {
      id: parsed.id,
      email: parsed.email ?? "",
      empId: parsed.empId ?? "",
      name: parsed.name ?? "",
      role: parsed.role ?? "",
      permissions: parsed.permissions ?? {},
      portal: parsed.portal,
    };
  } catch {
    return null;
  }
}

/**
 * Check a permission key against a LIVE permissions map (fetched from DB).
 * Returns true when the map is empty (no restrictions configured yet).
 */
export function checkPerm(liveMap: PermissionMap, ...keys: string[]): boolean {
  const hasAnyKey = Object.keys(liveMap).length > 0;
  if (!hasAnyKey) return true;          // no rules configured → show everything
  return keys.some((k) => liveMap[k] === true);
}

// ── Legacy helpers kept for non-sidebar code ─────────────────────────────────
export function hasPermission(session: UserSession | null, ...keys: string[]): boolean {
  if (!session) return false;
  return checkPerm(session.permissions, ...keys);
}

export function hasFullAccess(session: UserSession | null): boolean {
  if (!session) return false;
  const perms = session.permissions;
  const keys = Object.keys(perms);
  if (keys.length === 0) return true;
  return keys.every((k) => perms[k] === true);
}

// ── Path → permission key helpers ────────────────────────────────────────────
export function permissionForMainPath(path: string): string | null {
  if (path === "/") return null;
  if (path.startsWith("/sales")) return "module.sales";
  if (path.startsWith("/purchases")) return "module.purchases";
  if (path.startsWith("/hr")) return "module.hr";
  if (path.startsWith("/crm")) return "module.crm";
  if (path.startsWith("/expenses")) return "module.accounting";
  if (path.startsWith("/users")) return "module.users";
  if (path.startsWith("/ai")) return "module.ai";
  if (path.startsWith("/settings")) return "module.settings";
  return null;
}

export function permissionForHRPath(path: string): string[] {
  if (path === "/hr" || path === "/hr/dashboard") return ["module.hr"];
  if (path.startsWith("/hr/employees") || path.startsWith("/hr/user-logs")) return ["hr.employees"];
  if (path.startsWith("/hr/requests")) return ["requests.sent.view", "requests.incoming.view"];
  if (path.startsWith("/hr/attendance")) return ["hr.attendance", "attendance.view"];
  if (path.startsWith("/hr/payroll")) return ["hr.payroll", "payroll.view"];
  if (path.startsWith("/hr/reports")) return ["hr.reports", "reports.view"];
  if (path.startsWith("/hr/penalties")) return ["hr.penalties", "penalties.view"];
  if (path.startsWith("/hr/leaves")) return ["hr.leaves", "leaves.view"];
  if (path.startsWith("/hr/termination")) return ["hr.termination"];
  if (path.startsWith("/hr/insurance")) return ["insurance.view"];
  if (path.startsWith("/hr/approvals")) return ["requests.incoming.view", "requests.approve"];
  if (path.startsWith("/hr/financial-setup")) return ["finance.view"];
  if (path.startsWith("/hr/succession") || path.startsWith("/hr/certificates")) return ["module.hr"];
  if (path.startsWith("/hr/organization")) return ["hr.org"];
  if (path.startsWith("/hr/permissions")) return ["hr.permissions"];
  if (path.startsWith("/hr/settings")) return ["hr.settings"];
  return ["module.hr"];
}
