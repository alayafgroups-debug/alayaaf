import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !anonKey || !serviceKey) return respond({ error: "Server configuration is incomplete" }, 503);

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return respond({ error: "Unauthorized" }, 401);

    const { data: allowed } = await caller.rpc("business_permission_allowed", {
      p_permissions: ["users.special.manage", "hr.permissions"],
      p_manage: true,
    });
    const { data: mainAdmin } = await caller.rpc("is_main_system_admin");
    if (!allowed && !mainAdmin) return respond({ error: "غير مصرح بإدارة المستخدمين الخاصين" }, 403);

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const roleId = String(body.roleId ?? "").trim();
    const branchId = String(body.branchId ?? "").trim() || null;

    if (!fullName || !email || !roleId || password.length < 8) {
      return respond({ error: "الاسم والبريد والدور وكلمة مرور من 8 أحرف على الأقل مطلوبة" }, 400);
    }

    const { data: role } = await admin.from("user_roles").select("id").eq("id", roleId).eq("status", "فعال").maybeSingle();
    if (!role) return respond({ error: "الدور المحدد غير صالح" }, 400);

    const [{ data: employeeWithEmail }, { data: systemUserWithEmail }] = await Promise.all([
      admin.from("employees").select("id").ilike("email", email).maybeSingle(),
      admin.from("system_users").select("id").ilike("email", email).maybeSingle(),
    ]);
    if (employeeWithEmail) {
      return respond({ error: "هذا البريد مرتبط مسبقًا بحساب موظف، استخدم بريدًا مختلفًا للمستخدم الخاص" }, 400);
    }
    if (systemUserWithEmail) {
      return respond({ error: "يوجد مستخدم خاص مسجل مسبقًا بهذا البريد الإلكتروني" }, 400);
    }

    const userMetadata = { full_name: fullName, account_type: "special_system_user" };
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    let authUser = created.user;
    let createdNewAuthUser = Boolean(authUser);
    if (createError || !authUser) {
      const duplicateEmail = createError?.message.toLowerCase().includes("already") || createError?.message.toLowerCase().includes("registered");
      if (!duplicateEmail) {
        return respond({ error: createError?.message ?? "تعذر إنشاء حساب الدخول" }, 400);
      }

      let existingAuthUser: { id: string; email?: string } | undefined;
      for (let page = 1; page <= 10 && !existingAuthUser; page += 1) {
        const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) return respond({ error: "تعذر التحقق من حساب الدخول السابق" }, 500);
        existingAuthUser = usersPage.users.find((item) => item.email?.toLowerCase() === email);
        if (usersPage.users.length < 1000) break;
      }
      if (!existingAuthUser) {
        return respond({ error: "هذا البريد مستخدم بالفعل لحساب دخول في النظام، استخدم بريدًا مختلفًا" }, 400);
      }

      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (updateError || !updated.user) {
        return respond({ error: updateError?.message ?? "تعذر إعادة تفعيل حساب الدخول السابق" }, 400);
      }
      authUser = updated.user;
      createdNewAuthUser = false;
    }

    const { data: systemUser, error: insertError } = await admin
      .from("system_users")
      .insert({
        auth_user_id: authUser.id,
        full_name: fullName,
        email,
        role_id: roleId,
        branch_id: branchId,
        created_by: user.id,
      })
      .select("id, full_name, email, role_id, branch_id, status, created_at")
      .single();

    if (insertError) {
      if (createdNewAuthUser) await admin.auth.admin.deleteUser(authUser.id);
      return respond({ error: insertError.message }, 400);
    }

    return respond({ user: systemUser }, 201);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
