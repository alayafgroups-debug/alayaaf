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

const FULL_ACCESS_ROLES = new Set([
  "مدير النظام",
  "مدير عام",
  "system admin",
  "general manager",
  "admin",
]);

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

export function hasFullAccess(session: UserSession | null) {
  return Boolean(session && FULL_ACCESS_ROLES.has(session.role.trim().toLowerCase()));
}

export function hasPermission(session: UserSession | null, ...keys: string[]) {
  if (!session) return false;
  if (hasFullAccess(session)) return true;
  return keys.some((key) => session.permissions[key] === true);
}

export function permissionForMainPath(path: string) {
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

export function canAccessPath(session: UserSession | null, path: string) {
  if (!session || session.portal !== "business") return false;
  if (hasFullAccess(session)) return true;
  if (path.startsWith("/hr")) return hasPermission(session, ...permissionForHRPath(path));
  const key = permissionForMainPath(path);
  return key === null || hasPermission(session, key);
}

export function firstAllowedBusinessPath(session: UserSession | null) {
  const candidates = ["/", "/sales", "/purchases", "/hr/dashboard", "/crm", "/expenses", "/users", "/ai", "/settings"];
  return candidates.find((path) => canAccessPath(session, path)) ?? "/login";
}
