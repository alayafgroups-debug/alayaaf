import { createClient } from "jsr:@supabase/supabase-js@2";

// حسابات دخول الموظفين (Supabase Auth).
// { action: "set-password", employeeId, password }      ← إنشاء الحساب أو تغيير كلمة مروره
// { action: "set-login-state", employeeId, enabled }    ← إيقاف الدخول عند تعطيل الموظف أو إعادته
// القواعد:
// - الموظف يُحدَّد بمعرّفه، وبريده يُقرأ من سجله (لا يُقبل بريد من المتصفح).
// - الصلاحية من قاعدة البيانات نفسها: is_main_system_admin() أو hr_area_allowed(['hr.employees'], إدارة).
// - غير المدير:
//   * لا يمس حساب مدير، ولا حسابه هو.
//   * لا ينشئ حساب دخول ولا يعيد تفعيله لموظف دوره فيه صلاحية أعلى من صلاحياته (grant_ceiling_violations).
//   * لا يغيّر كلمة مرور حساب قائم لموظف دوره له صلاحيات (انتحال؛ يتطلب مديرًا).
//   * إيقاف الدخول مسموح دائمًا لمن يدير الموظفين (حتى لا يبقى المعطّل قادرًا على الدخول).
// - لا يمس حساب مستخدم خاص، ولا حسابًا مرتبطًا بموظف آخر.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const adminRoles = new Set(["مدير النظام", "مدير عام", "المدير العام"]);
// نفس قائمة قاعدة البيانات (employee_status_active)
const inactiveStatuses = new Set(["غير فعال", "غير نشط", "منتهي", "منتهية", "منتهي الخدمة", "مستقيل", "مفصول", "موقوف", "inactive", "terminated"]);
const isInactive = (status: unknown) => inactiveStatuses.has(String(status ?? "").trim().toLowerCase());
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`);
const hasPermissions = (permissions: unknown) =>
  Boolean(permissions && typeof permissions === "object" && !Array.isArray(permissions)
    && Object.values(permissions as Record<string, unknown>).some((value) => value === true || value === "read" || value === "manage"));
const missingFunction = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "")));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ success: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ success: false, error: "غير مصرح" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) return respond({ success: false, error: "إعدادات الخادم ناقصة" }, 503);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !user?.email) return respond({ success: false, error: "غير مصرح" }, 401);
    const callerEmail = user.email.toLowerCase();

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    if (action !== "set-password" && action !== "set-login-state") {
      return respond({ success: false, error: "إجراء غير معروف" }, 400);
    }
    const employeeId = String(body?.employeeId ?? "").trim();
    if (!employeeId) return respond({ success: false, error: "الموظف مطلوب" }, 400);
    const enabling = action === "set-login-state" && body?.enabled === true;
    const disabling = action === "set-login-state" && body?.enabled !== true;

    // الصلاحية بمنطق قاعدة البيانات وبجلسة المستدعي نفسه
    const [{ data: isAdmin, error: adminError }, { data: canManage, error: manageError }] = await Promise.all([
      callerClient.rpc("is_main_system_admin"),
      callerClient.rpc("hr_area_allowed", { p_areas: ["hr.employees"], p_manage: true }),
    ]);
    if (adminError || manageError) return respond({ success: false, error: "تعذر التحقق من الصلاحية" }, 403);
    const callerIsAdmin = isAdmin === true;
    if (!callerIsAdmin && canManage !== true) {
      return respond({ success: false, error: "ليست لديك صلاحية إدارة حسابات دخول الموظفين" }, 403);
    }

    // اسم المستدعي ومعرّفه (للسجل ولمنع تغيير الحساب الذاتي)
    const { data: linked } = await admin.from("employee_emails").select("employee_id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle();
    const { data: callerRows } = linked?.employee_id
      ? await admin.from("employees").select("id, name").eq("id", linked.employee_id).limit(1)
      : await admin.from("employees").select("id, name").ilike("email", escapeLike(callerEmail)).limit(2);
    const callerEmployee = callerRows && callerRows.length === 1 ? callerRows[0] : null;
    let callerName = String(callerEmployee?.name ?? "");
    if (!callerName) {
      const { data: special } = await admin.from("system_users").select("full_name").eq("auth_user_id", user.id).maybeSingle();
      callerName = String(special?.full_name ?? callerEmail);
    }

    // الموظف المستهدف
    const { data: target, error: targetError } = await admin
      .from("employees")
      .select("id, emp_id, name, email, employee_role, status")
      .eq("id", employeeId)
      .maybeSingle();
    if (targetError || !target) return respond({ success: false, error: "لم يتم العثور على الموظف" }, 404);
    const email = String(target.email ?? "").trim().toLowerCase();
    const targetIsAdmin = adminRoles.has(String(target.employee_role ?? ""));
    if (targetIsAdmin && !callerIsAdmin) {
      return respond({ success: false, error: "حساب مدير النظام لا يغيّره إلا مدير النظام" }, 403);
    }
    if (target.id === callerEmployee?.id || (email && email === callerEmail)) {
      return respond({ success: false, error: "لا تغيّر حسابك أنت من هنا" }, 400);
    }

    // دور الموظف فوق صلاحيات المستدعي؟ (null = لا تجاوز)
    // صلاحيات دور الموظف (الاسم كما هو وبلا مسافات؛ أي صف بصلاحيات يكفي)
    let roleHasPermissions = false;
    const roleName = String(target.employee_role ?? "").trim();
    if (roleName) {
      const { data: roleRows } = await admin.from("user_roles").select("name_ar, permissions").limit(500);
      roleHasPermissions = (roleRows ?? []).some((row) =>
        String(row.name_ar ?? "").trim() === roleName && hasPermissions(row.permissions));
    }
    let aboveCaller = false;
    if (!callerIsAdmin && !disabling) {
      const { data: violations, error: ceilingError } = await callerClient.rpc("grant_ceiling_violations", {
        p_role: String(target.employee_role ?? ""),
        p_permissions: null,
      });
      if (ceilingError && !missingFunction(ceilingError)) {
        return respond({ success: false, error: "تعذر التحقق من صلاحيات دور الموظف" }, 403);
      }
      // قبل تطبيق K2 (الدالة غير موجودة): أي دور له صلاحيات يُعامل كأنه فوق المستدعي
      aboveCaller = ceilingError ? roleHasPermissions : Boolean(violations);
    }
    if (aboveCaller) {
      return respond({
        success: false,
        error: "دور هذا الموظف فيه صلاحيات أعلى من صلاحياتك؛ حساب دخوله يديره مدير النظام",
      }, 403);
    }

    // حساب الدخول الحالي بهذا البريد (إن وُجد)
    let existing: { id: string; user_metadata?: Record<string, unknown>; banned_until?: string | null } | null = null;
    if (EMAIL_PATTERN.test(email)) {
      for (let page = 1; page <= 50 && !existing; page += 1) {
        const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (listError) throw listError;
        const match = usersPage.users.find((candidate) => (candidate.email ?? "").toLowerCase() === email);
        if (match) existing = { id: match.id, user_metadata: match.user_metadata ?? {}, banned_until: (match as { banned_until?: string | null }).banned_until ?? null };
        if (usersPage.users.length < 200) break;
      }
    }

    // الحساب القائم يجب أن يكون لهذا الموظف وحده
    if (existing) {
      const metadataEmployee = String(existing.user_metadata?.employee_id ?? "");
      if (metadataEmployee && metadataEmployee !== target.id) {
        return respond({ success: false, error: "حساب الدخول بهذا البريد مرتبط بموظف آخر" }, 409);
      }
      const [{ data: otherLink }, { data: special }] = await Promise.all([
        admin.from("employee_emails").select("employee_id").eq("auth_user_id", existing.id).neq("employee_id", target.id).limit(1),
        admin.from("system_users").select("id").eq("auth_user_id", existing.id).limit(1),
      ]);
      if ((otherLink ?? []).length) return respond({ success: false, error: "حساب الدخول بهذا البريد مرتبط بموظف آخر" }, 409);
      if ((special ?? []).length) return respond({ success: false, error: "حساب الدخول بهذا البريد مرتبط بمستخدم خاص" }, 409);
    }
    if (email && !disabling) {
      const [{ data: sameEmail }, { data: specialEmail }] = await Promise.all([
        admin.from("employees").select("id").ilike("email", escapeLike(email)).neq("id", target.id).limit(1),
        admin.from("system_users").select("id").ilike("email", escapeLike(email)).limit(1),
      ]);
      if ((sameEmail ?? []).length) return respond({ success: false, error: "هذا البريد مسجّل لموظف آخر" }, 409);
      if ((specialEmail ?? []).length) return respond({ success: false, error: "هذا البريد مستخدم لمستخدم خاص" }, 409);
    }

    // غير المدير لا يغيّر كلمة مرور حساب قائم لموظف دوره له صلاحيات (يصبح قادرًا على الدخول باسمه)
    if (action === "set-password" && existing && !callerIsAdmin && roleHasPermissions) {
      return respond({ success: false, error: "هذا الموظف له دور بصلاحيات؛ تغيير كلمة مرور حسابه يتم من مدير النظام" }, 403);
    }

    const log = (operation: string, details: string) =>
      admin.from("user_logs").insert({ user_name: callerName, module: "hr.employees", module_label: "الموظفون", operation, details })
        .then(() => undefined, () => undefined);

    if (action === "set-login-state") {
      if (!existing) return respond({ success: true, changed: false, previouslyBanned: false });
      const previouslyBanned = Boolean(existing.banned_until && new Date(existing.banned_until).getTime() > Date.now());
      if (enabling && isInactive(target.status)) {
        return respond({ success: false, error: "الموظف غير فعال؛ فعّله أولًا" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(existing.id, { ban_duration: enabling ? "none" : "876000h" });
      if (error) throw error;
      await log(enabling ? "employee_login_enabled" : "employee_login_disabled",
        `${enabling ? "إعادة تفعيل" : "إيقاف"} دخول الموظف ${target.emp_id ?? ""} — ${target.name ?? ""}`);
      return respond({ success: true, changed: true, previouslyBanned });
    }

    // set-password
    const password = String(body?.password ?? "");
    const bytes = new TextEncoder().encode(password).length;
    if (password.length < 8 || bytes > 72) return respond({ success: false, error: "كلمة المرور 8 أحرف على الأقل ولا تزيد على 72 بايت" }, 400);
    if (!EMAIL_PATTERN.test(email)) return respond({ success: false, error: "أضف بريدًا إلكترونيًا صحيحًا للموظف أولًا" }, 400);
    if (isInactive(target.status)) {
      return respond({ success: false, error: "الموظف غير فعال؛ فعّله أولًا" }, 400);
    }

    const metadata = { employee_id: target.id, emp_id: target.emp_id, name: target.name };
    let created = false;
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password, email_confirm: true, ban_duration: "none", user_metadata: { ...(existing.user_metadata ?? {}), ...metadata },
      });
      if (error) throw error;
    } else {
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
      if (error) throw error;
      created = true;
    }
    await log(created ? "employee_login_created" : "employee_password_reset",
      `${created ? "إنشاء حساب دخول" : "تغيير كلمة مرور"} للموظف ${target.emp_id ?? ""} — ${target.name ?? ""}`);
    return respond({ success: true, created });
  } catch (error) {
    console.error(error);
    return respond({ success: false, error: error instanceof Error ? error.message : "تعذر حفظ حساب الدخول" }, 500);
  }
});
