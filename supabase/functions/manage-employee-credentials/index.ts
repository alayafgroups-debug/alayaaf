import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const fullAccessRoles = new Set(["مدير النظام", "مدير عام", "المدير العام"]);
const canManageCredentials = (roleName: string, permissions: Record<string, unknown>) =>
  fullAccessRoles.has(roleName) ||
  permissions["module.hr"] === true ||
  permissions["module.hr"] === "manage" ||
  permissions["hr.settings"] === true ||
  permissions["hr.settings"] === "manage";

const arabicMap: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ء: "a", ؤ: "o", ئ: "e", ى: "a", ة: "a",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh", د: "d", ذ: "dh",
  ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z",
  ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", و: "w", ي: "y", پ: "p", چ: "ch", ڤ: "v", گ: "g",
};

const toEnglishFirstName = (firstName: unknown, fullName: unknown) => {
  const source = String(firstName || fullName || "").trim().split(/\s+/)[0];
  const transliterated = Array.from(source)
    .map((character) => arabicMap[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return transliterated || "employee";
};

const randomDigits = () => {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return String(value[0] % 1000).padStart(3, "0");
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encryptionKey = async (secret: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

const encryptPassword = async (password: string, secret: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(password),
  ));
  return `${bytesToBase64(iv)}.${bytesToBase64(ciphertext)}`;
};

const decryptPassword = async (encrypted: string | null, secret: string) => {
  if (!encrypted) return "";
  try {
    const [ivValue, ciphertextValue] = encrypted.split(".");
    const key = await encryptionKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(ivValue) },
      key,
      base64ToBytes(ciphertextValue),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return "";
  }
};

const secureEqual = (left: string, right: string) => {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ success: false, error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ success: false, error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) return respond({ success: false, error: "Server configuration is incomplete" }, 503);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !user?.email) return respond({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const linkedEmployeeId = String(user.user_metadata?.employee_id ?? "").trim();
    let callerQuery = adminClient
      .from("employees")
      .select("id, emp_id, name, employee_role");
    callerQuery = linkedEmployeeId
      ? callerQuery.eq("id", linkedEmployeeId)
      : callerQuery.ilike("email", user.email);
    const { data: caller } = await callerQuery.maybeSingle();

    if (action === "mailbox-info" || action === "verify-mailbox") {
      const requestedEmpId = String(body?.empId ?? "").trim();
      if (!caller || !requestedEmpId || String(caller.emp_id) !== requestedEmpId) {
        return respond({ success: false, error: "غير مصرح بالدخول إلى هذا البريد" }, 403);
      }

      let { data: credential } = await adminClient
        .from("employee_emails")
        .select("generated_email, password_ciphertext")
        .eq("employee_id", caller.id)
        .eq("status", "active")
        .maybeSingle();
      if (!credential) {
        const fallback = await adminClient
          .from("employee_emails")
          .select("generated_email, password_ciphertext")
          .eq("emp_id", caller.emp_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        credential = fallback.data;
      }
      if (!credential) return respond({ success: false, error: "لم يتم إنشاء بريد إلكتروني لك بعد" }, 404);

      if (action === "mailbox-info") {
        return respond({ success: true, generated_email: credential.generated_email });
      }

      const suppliedPassword = String(body?.password ?? "");
      const savedPassword = await decryptPassword(credential.password_ciphertext, serviceKey);
      if (!savedPassword || !secureEqual(suppliedPassword, savedPassword)) {
        return respond({ success: false, error: "كلمة مرور البريد غير صحيحة" }, 401);
      }
      return respond({ success: true, generated_email: credential.generated_email });
    }

    if (!caller?.employee_role) return respond({ success: false, error: "غير مصرح بإدارة بيانات الدخول" }, 403);
    const { data: role } = await adminClient
      .from("user_roles")
      .select("permissions")
      .eq("name_ar", caller.employee_role)
      .eq("status", "فعال")
      .maybeSingle();
    const permissions = role?.permissions && typeof role.permissions === "object"
      ? role.permissions as Record<string, unknown>
      : {};
    if (!canManageCredentials(caller.employee_role, permissions)) {
      return respond({ success: false, error: "غير مصرح بإدارة بيانات الدخول" }, 403);
    }

    if (action === "list") {
      const { data, error } = await adminClient
        .from("employee_emails")
        .select("id, emp_id, emp_name, generated_email, password_ciphertext, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const credentials = await Promise.all((data ?? []).map(async (row) => ({
        id: row.id,
        emp_id: row.emp_id,
        emp_name: row.emp_name,
        generated_email: row.generated_email,
        generated_password: await decryptPassword(row.password_ciphertext, serviceKey),
        created_at: row.created_at,
      })));
      return respond({ success: true, credentials });
    }

    if (action !== "generate") return respond({ success: false, error: "Unknown action" }, 400);
    const employeeId = String(body?.employeeId ?? "").trim();
    if (!employeeId) return respond({ success: false, error: "الموظف مطلوب" }, 400);

    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .select("id, emp_id, name, first_name, email, nationality")
      .eq("id", employeeId)
      .maybeSingle();
    if (employeeError || !employee) return respond({ success: false, error: "لم يتم العثور على الموظف" }, 404);
    if (String(employee.nationality).trim() !== "سعودي") {
      return respond({ success: false, error: "توليد البريد متاح للموظفين السعوديين فقط" }, 400);
    }

    const firstName = toEnglishFirstName(employee.first_name, employee.name);
    let localPart = firstName;
    let generatedEmail = `${localPart}@alayaf.com`;
    let suffix = 1;
    while (true) {
      const { data: collision } = await adminClient
        .from("employee_emails")
        .select("employee_id")
        .eq("generated_email", generatedEmail)
        .maybeSingle();
      if (!collision || collision.employee_id === employee.id) break;
      suffix += 1;
      localPart = `${firstName}${suffix}`;
      generatedEmail = `${localPart}@alayaf.com`;
    }

    const generatedPassword = `${localPart}@${randomDigits()}`;
    const { data: existingCredential } = await adminClient
      .from("employee_emails")
      .select("id, auth_user_id")
      .or(`employee_id.eq.${employee.id},emp_id.eq.${employee.emp_id}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let authUserId = existingCredential?.auth_user_id ? String(existingCredential.auth_user_id) : "";
    if (!authUserId && employee.email) {
      for (let page = 1; page <= 10 && !authUserId; page += 1) {
        const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
        if (usersError) throw usersError;
        const matchingUser = usersData.users.find((candidate) => candidate.email?.toLowerCase() === String(employee.email).toLowerCase());
        if (matchingUser) authUserId = matchingUser.id;
        if (usersData.users.length < 100) break;
      }
    }

    const passwordCiphertext = await encryptPassword(generatedPassword, serviceKey);
    const credentialPayload = {
      employee_id: employee.id,
      auth_user_id: authUserId || null,
      emp_id: employee.emp_id,
      emp_name: employee.name,
      generated_first_name: localPart,
      generated_email: generatedEmail,
      password_ciphertext: passwordCiphertext,
      status: "active",
      updated_at: new Date().toISOString(),
    };
    const credentialResult = existingCredential?.id
      ? await adminClient.from("employee_emails").update(credentialPayload).eq("id", existingCredential.id)
      : await adminClient.from("employee_emails").insert(credentialPayload);
    if (credentialResult.error) throw credentialResult.error;

    return respond({
      success: true,
      credential: {
        employee_id: employee.id,
        emp_id: employee.emp_id,
        emp_name: employee.name,
        generated_email: generatedEmail,
        generated_password: generatedPassword,
      },
    });
  } catch (error) {
    console.error(error);
    return respond({
      success: false,
      error: error instanceof Error ? error.message : "تعذر إدارة بيانات دخول الموظف",
    }, 500);
  }
});
