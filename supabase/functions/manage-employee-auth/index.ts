import { createClient } from "jsr:@supabase/supabase-js@2";

// حسابات دخول الموظفين (Supabase Auth).
// { action: "set-password", employeeId, password }      ← إنشاء الحساب أو تغيير كلمة مروره
// { action: "set-login-state", employeeId, enabled }    ← إيقاف الدخول عند تعطيل الموظف أو إعادته
// { action: "change-email", employeeId, newEmail }      ← تغيير بريد الموظف وبريد حساب دخوله معًا (مدير النظام فقط)
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
    if (action !== "set-password" && action !== "set-login-state" && action !== "change-email") {
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

    // حساب دخول بالبريد (إن وُجد)
    type AuthAccount = { id: string; user_metadata?: Record<string, unknown>; banned_until?: string | null };
    const findAccountByEmail = async (address: string): Promise<AuthAccount | null> => {
      if (!EMAIL_PATTERN.test(address)) return null;
      for (let page = 1; page <= 50; page += 1) {
        const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (listError) throw listError;
        const match = usersPage.users.find((candidate) => (candidate.email ?? "").toLowerCase() === address);
        if (match) return { id: match.id, user_metadata: match.user_metadata ?? {}, banned_until: (match as { banned_until?: string | null }).banned_until ?? null };
        if (usersPage.users.length < 200) break;
      }
      return null;
    };
    let existing = await findAccountByEmail(email);

    // الحساب القائم يجب أن يكون لهذا الموظف وحده. حساب بقي من موظف محذوف (معرّفه في بياناته غير موجود) يُعد حرًا.
    // البريد المشترك مع موظف آخر: الحساب قد يكون له، فلا يُغيَّر بريده ولا يُوقف من هنا.
    let sharedEmail = false;
    if (existing) {
      const metadataEmployee = String(existing.user_metadata?.employee_id ?? "");
      let foreignOwner = false;
      if (metadataEmployee && metadataEmployee !== target.id) {
        const { data: ownerRow } = await admin.from("employees").select("id").eq("id", metadataEmployee).maybeSingle();
        foreignOwner = Boolean(ownerRow);
      }
      const [{ data: otherLink }, { data: special }, { data: sameEmailOthers }] = await Promise.all([
        admin.from("employee_emails").select("employee_id").eq("auth_user_id", existing.id).neq("employee_id", target.id).limit(1),
        admin.from("system_users").select("id").eq("auth_user_id", existing.id).limit(1),
        admin.from("employees").select("id").ilike("email", escapeLike(email)).neq("id", target.id).limit(1),
      ]);
      foreignOwner = foreignOwner || (otherLink ?? []).length > 0;
      sharedEmail = !metadataEmployee && (sameEmailOthers ?? []).length > 0;
      if ((special ?? []).length) {
        if (action === "change-email") existing = null;
        else return respond({ success: false, error: "حساب الدخول بهذا البريد مرتبط بمستخدم خاص" }, 409);
      } else if (foreignOwner) {
        // تغيير البريد يصحح السجل وحده (الحساب لموظف آخر)، وغيره يُرفض
        if (action === "change-email") existing = null;
        else return respond({ success: false, error: "حساب الدخول بهذا البريد مرتبط بموظف آخر" }, 409);
      }
    }
    // تغيير البريد يفحص البريد الجديد بدل الحالي (قد يكون الحالي مكررًا وهو ما يُصحَّح)
    if (email && !disabling && action !== "change-email") {
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

    if (action === "change-email") {
      // البريد هوية الدخول وتوجيه الطلبات: يغيّره مدير النظام فقط، ويتغيّر في السجل وحساب الدخول معًا
      if (!callerIsAdmin) return respond({ success: false, error: "تغيير بريد الموظف لمدير النظام فقط" }, 403);
      const newEmail = String(body?.newEmail ?? "").trim().toLowerCase();
      if (!EMAIL_PATTERN.test(newEmail)) return respond({ success: false, error: "البريد الجديد غير صحيح" }, 400);
      if (newEmail === email) return respond({ success: false, error: "البريد الجديد مطابق للحالي" }, 400);
      const [{ data: sameEmployee }, { data: sameSpecial }, newAccount] = await Promise.all([
        admin.from("employees").select("id").ilike("email", escapeLike(newEmail)).neq("id", target.id).limit(1),
        admin.from("system_users").select("id").ilike("email", escapeLike(newEmail)).limit(1),
        findAccountByEmail(newEmail),
      ]);
      if ((sameEmployee ?? []).length) return respond({ success: false, error: "هذا البريد مسجّل لموظف آخر" }, 409);
      if ((sameSpecial ?? []).length) return respond({ success: false, error: "هذا البريد مستخدم لمستخدم خاص" }, 409);
      if (newAccount && newAccount.id !== existing?.id) {
        return respond({ success: false, error: "يوجد حساب دخول آخر بهذا البريد" }, 409);
      }

      // 1) حساب الدخول أولًا (إن وُجد وكان لهذا الموظف وحده)، 2) ثم سجل الموظف، وإن فشل الثاني يعود الحساب لبريده القديم
      if (sharedEmail) existing = null;
      if (existing) {
        const { error: accountError } = await admin.auth.admin.updateUserById(existing.id, {
          email: newEmail,
          email_confirm: true,
          user_metadata: { ...(existing.user_metadata ?? {}), employee_id: target.id, emp_id: target.emp_id, name: target.name },
        });
        if (accountError) throw accountError;
      }
      const { error: employeeError } = await admin.from("employees").update({ email: newEmail }).eq("id", target.id);
      if (employeeError) {
        if (existing) {
          const { error: revertError } = await admin.auth.admin.updateUserById(existing.id, { email, email_confirm: true });
          if (revertError) {
            console.error(revertError);
            return respond({
              success: false,
              error: `تعذر حفظ البريد في سجل الموظف، وتعذر إرجاع بريد حساب الدخول إلى ${email}. راجع حساب الدخول من لوحة Supabase`,
            }, 500);
          }
        }
        throw employeeError;
      }
      await log("employee_email_changed",
        `تغيير بريد الموظف ${target.emp_id ?? ""} — ${target.name ?? ""} من ${email || "—"} إلى ${newEmail}${existing ? " (مع حساب الدخول)" : ""}`);
      return respond({ success: true, email: newEmail, accountUpdated: Boolean(existing) });
    }

    if (action === "set-login-state") {
      if (!existing) return respond({ success: true, changed: false, previouslyBanned: false });
      // حساب ببريد مشترك مع موظف آخر وبلا ربط صريح بهذا الموظف: لا يُوقف ولا يُفعَّل من ملف هذا الموظف
      if (sharedEmail) return respond({ success: true, changed: false, previouslyBanned: false, sharedEmail: true });
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
