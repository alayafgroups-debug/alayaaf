import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const TARGET_NET = 1000;
const SOCIAL_INSURANCE_RATE = 0.0975;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

const canManageReports = (permissions: Record<string, unknown>) =>
  [permissions["hr.reports"], permissions["hr.reports.full-employee"], permissions["module.hr"]]
    .some((value) => value === true || value === "manage");

const isSaudiNationality = (value: unknown) => [
  "سعودي",
  "سعودية",
  "السعودية",
  "المملكة العربية السعودية",
  "saudi",
  "saudi arabia",
  "saudi arabian",
].includes(String(value ?? "").trim().toLowerCase());

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

type PatternItem = {
  id: string;
  reason_code: string;
  reason_name: string;
  reason_description: string;
  allocation_weight: number;
  sort_order: number;
};

type Pattern = {
  id: string;
  code: string;
  name_ar: string;
  description: string;
  version: number;
  priority: number;
  items: PatternItem[];
  signature: string;
};

type AssignmentItem = {
  id: string;
  assignment_id: string;
  reason_code: string;
  reason_name_snapshot: string;
  reason_description_snapshot: string;
  allocation_weight: number;
  amount: number;
  sort_order: number;
  notification_text: string;
  acknowledgement_text: string;
};

const allocateAmounts = (total: number, items: PatternItem[]) => {
  const weightTotal = items.reduce((sum, item) => sum + Number(item.allocation_weight), 0);
  let allocated = 0;
  return items.map((item, index) => {
    const amount = index === items.length - 1
      ? roundMoney(total - allocated)
      : roundMoney(total * Number(item.allocation_weight) / weightTotal);
    allocated = roundMoney(allocated + amount);
    return { ...item, amount };
  });
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) return respond({ error: "Server configuration is incomplete" }, 503);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !user?.email) return respond({ error: "Unauthorized" }, 401);

    const { data: caller } = await adminClient
      .from("employees")
      .select("name, employee_role")
      .ilike("email", user.email)
      .maybeSingle();
    if (!caller?.employee_role) return respond({ error: "Forbidden" }, 403);

    const { data: role } = await adminClient
      .from("user_roles")
      .select("permissions")
      .eq("name_ar", caller.employee_role)
      .eq("status", "فعال")
      .maybeSingle();
    const permissions = role?.permissions && typeof role.permissions === "object"
      ? role.permissions as Record<string, unknown>
      : {};
    if (!canManageReports(permissions)) return respond({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const empId = String(body?.empId ?? "").trim();
    const reportMonth = String(body?.month ?? "").trim();
    const reportGross = roundMoney(Number(body?.reportGross ?? 0));
    const reportExistingDeductions = roundMoney(Number(body?.reportExistingDeductions ?? 0));
    if (!empId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) {
      return respond({ error: "Valid empId and month are required" }, 400);
    }

    const [employeeResult, payrollResult, emailResult, primaryEmailResult] = await Promise.all([
      adminClient
        .from("employees")
        .select("id, emp_id, name, nationality, base_salary, total_salary")
        .eq("emp_id", empId)
        .maybeSingle(),
      adminClient
        .from("payroll")
        .select("basic_salary, allowances, overtime, bonus, deductions, social_insurance_deduction")
        .eq("emp_id", empId)
        .eq("month", reportMonth),
      adminClient
        .from("employee_emails")
        .select("generated_email")
        .eq("emp_id", empId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("hr_config_items")
        .select("value")
        .eq("config_type", "primary_email_domain")
        .limit(1)
        .maybeSingle(),
    ]);

    if (employeeResult.error || !employeeResult.data) return respond({ error: "Employee not found" }, 404);
    const employee = employeeResult.data;
    if (!isSaudiNationality(employee.nationality)) {
      return respond({ error: "أنماط الخصومات مخصصة للموظفين السعوديين" }, 400);
    }
    if (!emailResult.data?.generated_email) {
      return respond({ error: `لا يوجد بريد مولد ومحفوظ للموظف ${employee.name}` }, 400);
    }

    const generatedEmail = String(emailResult.data.generated_email);
    const primaryDomain = String(primaryEmailResult.data?.value || "alayaf.com").replace(/^@/, "");
    const primaryEmail = primaryDomain.includes("@") ? primaryDomain : `hr@${primaryDomain}`;

    const loadSavedAssignment = async () => {
      const { data: assignment } = await adminClient
        .from("employee_deduction_assignments")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("report_month", reportMonth)
        .maybeSingle();
      if (!assignment) return null;
      const { data: items, error } = await adminClient
        .from("employee_deduction_assignment_items")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("sort_order");
      if (error) throw error;
      return { assignment, items: (items ?? []) as AssignmentItem[] };
    };

    const formatSavedAssignment = (saved: { assignment: any; items: AssignmentItem[] }) => ({
      deductionItems: saved.items.map((item) => ({
        title: "hr@alayaf.com",
        amount: Number(item.amount),
        reason: item.reason_name_snapshot,
        notification: item.notification_text,
        acknowledgement: item.acknowledgement_text,
      })),
      generatedEmail,
      gross: Number(saved.assignment.gross_amount),
      existingDeductions: Number(saved.assignment.existing_deductions),
      socialInsuranceAmount: Number(saved.assignment.social_insurance_amount),
      additionalDeductionTotal: Number(saved.assignment.generated_deduction_total),
      displayedDeductionTotal: Number(saved.assignment.displayed_deduction_total),
      finalNet: Number(saved.assignment.final_net),
      assignmentId: saved.assignment.id,
      patternId: saved.assignment.pattern_id,
      reusedAssignment: true,
    });

    const savedAssignment = await loadSavedAssignment();
    if (savedAssignment) return respond(formatSavedAssignment(savedAssignment));

    const payrollRows = payrollResult.data ?? [];
    const serverGross = payrollRows.length
      ? payrollRows.reduce((sum: number, row: any) =>
          sum + Number(row.basic_salary ?? 0) + Number(row.allowances ?? 0) + Number(row.overtime ?? 0) + Number(row.bonus ?? 0), 0)
      : Number(employee.total_salary ?? employee.base_salary ?? 0);
    const basicSalary = payrollRows.length
      ? payrollRows.reduce((sum: number, row: any) => sum + Number(row.basic_salary ?? 0), 0)
      : Number(employee.base_salary ?? serverGross);
    const socialInsurance = payrollRows.length
      ? roundMoney(payrollRows.reduce((sum: number, row: any) => sum + Number(row.social_insurance_deduction ?? 0), 0))
      : roundMoney(basicSalary * SOCIAL_INSURANCE_RATE);
    const serverExistingDeductions = payrollRows.reduce(
      (sum: number, row: any) => sum + Number(row.deductions ?? 0),
      0,
    );
    const gross = Number.isFinite(reportGross) && reportGross > TARGET_NET && reportGross <= serverGross
      ? reportGross
      : roundMoney(serverGross);
    const requestedExisting = Number.isFinite(reportExistingDeductions) && reportExistingDeductions >= 0 && reportExistingDeductions < gross
      ? reportExistingDeductions
      : serverExistingDeductions;
    const existingDeductions = roundMoney(Math.max(requestedExisting, serverExistingDeductions, socialInsurance));
    const requiredDeduction = roundMoney(gross - existingDeductions - TARGET_NET);
    if (requiredDeduction <= 0) {
      return respond({ error: "الراتب بعد الخصومات القائمة لا يسمح بصافي 1000 ريال" }, 400);
    }

    const [patternsResult, patternItemsResult, previousAssignmentsResult, monthAssignmentsResult] = await Promise.all([
      adminClient.from("deduction_patterns").select("id, code, name_ar, description, version, priority").eq("status", "فعال").order("priority"),
      adminClient.from("deduction_pattern_items").select("id, pattern_id, reason_code, reason_name, reason_description, allocation_weight, sort_order").order("sort_order"),
      adminClient.from("employee_deduction_assignments").select("pattern_id").eq("employee_id", employee.id),
      adminClient.from("employee_deduction_assignments").select("pattern_id, pattern_signature").eq("report_month", reportMonth),
    ]);
    if (patternsResult.error || patternItemsResult.error) throw patternsResult.error ?? patternItemsResult.error;

    const allItems = patternItemsResult.data ?? [];
    const patterns: Pattern[] = (patternsResult.data ?? []).map((pattern: any) => {
      const items = allItems
        .filter((item: any) => item.pattern_id === pattern.id)
        .map((item: any) => ({ ...item, allocation_weight: Number(item.allocation_weight), sort_order: Number(item.sort_order) }));
      return {
        ...pattern,
        version: Number(pattern.version),
        priority: Number(pattern.priority),
        items,
        signature: items.map((item: PatternItem) => item.reason_code).sort().join("|"),
      };
    }).filter((pattern: Pattern) => pattern.items.length >= 5);
    if (patterns.length === 0) return respond({ error: "لا توجد أنماط خصم فعالة تحتوي على خمسة أسباب على الأقل" }, 400);

    const previousPatternIds = new Set((previousAssignmentsResult.data ?? []).map((row: any) => String(row.pattern_id)));
    const monthSignatures = new Set((monthAssignmentsResult.data ?? []).map((row: any) => String(row.pattern_signature)));
    const usage = new Map<string, number>();
    (monthAssignmentsResult.data ?? []).forEach((row: any) => {
      const id = String(row.pattern_id);
      usage.set(id, (usage.get(id) ?? 0) + 1);
    });

    const seed = await hashHex(`${employee.id}:${reportMonth}:v1`);
    const rankPatterns = async (list: Pattern[]) => {
      const ranked = await Promise.all(list.map(async (pattern) => ({
        pattern,
        rank: await hashHex(`${seed}:${pattern.id}`),
        usage: usage.get(pattern.id) ?? 0,
      })));
      return ranked.sort((left, right) => left.usage - right.usage || left.rank.localeCompare(right.rank)).map((entry) => entry.pattern);
    };

    let candidates = patterns.filter((pattern) => !previousPatternIds.has(pattern.id) && !monthSignatures.has(pattern.signature));
    if (candidates.length === 0) candidates = patterns.filter((pattern) => !monthSignatures.has(pattern.signature));
    if (candidates.length === 0) candidates = patterns.filter((pattern) => !previousPatternIds.has(pattern.id));
    if (candidates.length === 0) candidates = patterns;
    const selectedPattern = (await rankPatterns(candidates))[0];
    const patternCollision = monthSignatures.has(selectedPattern.signature);
    const allocatedItems = allocateAmounts(requiredDeduction, selectedPattern.items);
    const displayedDeductionTotal = roundMoney(socialInsurance + requiredDeduction);

    const { data: assignment, error: assignmentError } = await adminClient
      .from("employee_deduction_assignments")
      .insert({
        employee_id: employee.id,
        emp_id: employee.emp_id,
        report_month: reportMonth,
        pattern_id: selectedPattern.id,
        pattern_version: selectedPattern.version,
        pattern_signature: selectedPattern.signature,
        assignment_seed: seed,
        gross_amount: gross,
        existing_deductions: existingDeductions,
        social_insurance_amount: socialInsurance,
        generated_deduction_total: requiredDeduction,
        displayed_deduction_total: displayedDeductionTotal,
        target_net: TARGET_NET,
        final_net: TARGET_NET,
        assignment_status: "sent",
        source: patternCollision ? "stored_pattern_collision" : "stored_pattern",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (assignmentError) {
      if (assignmentError.code === "23505") {
        const concurrentAssignment = await loadSavedAssignment();
        if (concurrentAssignment) return respond(formatSavedAssignment(concurrentAssignment));
      }
      throw assignmentError;
    }

    const [year, monthNumber] = reportMonth.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const preferredDays = [2, 6, 11, 16, 21, 26];
    const rawItems = [
      {
        pattern_item_id: null,
        reason_code: "social-insurance",
        reason_name_snapshot: "استقطاع التأمينات الاجتماعية بنسبة 9.75%",
        reason_description_snapshot: "استقطاع التأمينات الاجتماعية المحفوظ في مسير رواتب الموظف السعودي.",
        allocation_weight: 0,
        amount: socialInsurance,
        sort_order: 0,
      },
      ...allocatedItems.map((item, index) => ({
        pattern_item_id: item.id,
        reason_code: item.reason_code,
        reason_name_snapshot: item.reason_name,
        reason_description_snapshot: item.reason_description,
        allocation_weight: item.allocation_weight,
        amount: item.amount,
        sort_order: index + 1,
      })),
    ];

    const assignmentItemPayload = rawItems.map((item, index) => {
      const day = Math.min(preferredDays[index] ?? lastDay - 1, Math.max(1, lastDay - 1));
      const noticeDate = `${reportMonth}-${String(day).padStart(2, "0")}`;
      return {
        assignment_id: assignment.id,
        ...item,
        notification_text: `أُرسل إشعار الخصم من ${primaryEmail} إلى ${generatedEmail} بتاريخ ${noticeDate}`,
        acknowledgement_text: `تم تسجيل رد الاستلام بتاريخ ${reportMonth}-${String(Math.min(day + 1, lastDay)).padStart(2, "0")}`,
      };
    });
    const { data: savedItems, error: itemsError } = await adminClient
      .from("employee_deduction_assignment_items")
      .insert(assignmentItemPayload)
      .select("*");
    if (itemsError) throw itemsError;

    const messages: Record<string, unknown>[] = [];
    (savedItems as AssignmentItem[]).forEach((item, index) => {
      const day = Math.min(preferredDays[index] ?? lastDay - 1, Math.max(1, lastDay - 1));
      const replyDay = Math.min(day + 1, lastDay);
      const noticeDate = `${reportMonth}-${String(day).padStart(2, "0")}`;
      const replyDate = `${reportMonth}-${String(replyDay).padStart(2, "0")}`;
      const noticeId = crypto.randomUUID();
      const replyId = crypto.randomUUID();
      const amountText = Number(item.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      messages.push({
        id: noticeId,
        emp_id: empId,
        emp_name: employee.name,
        from_email: primaryEmail,
        to_email: generatedEmail,
        subject: `إشعار خصم بمبلغ ${amountText} ريال — ${item.reason_name_snapshot}`,
        body: `مرحباً ${employee.name}،\n\nتم تسجيل خصم بمبلغ ${amountText} ريال.\nالسبب: ${item.reason_name_snapshot}.\n${item.reason_description_snapshot}`,
        message_kind: "deduction_notice",
        deduction_reason_id: item.reason_code,
        deduction_amount: item.amount,
        report_month: reportMonth,
        parent_message_id: null,
        deduction_assignment_id: assignment.id,
        deduction_item_id: item.id,
        created_at: `${noticeDate}T09:00:00+03:00`,
      });
      messages.push({
        id: replyId,
        emp_id: empId,
        emp_name: employee.name,
        from_email: generatedEmail,
        to_email: primaryEmail,
        subject: `رد استلام: ${item.reason_name_snapshot}`,
        body: `السلام عليكم،\n\nتم استلام إشعار الخصم الخاص بسبب: ${item.reason_name_snapshot}.\n\n${employee.name}`,
        message_kind: "employee_reply",
        deduction_reason_id: item.reason_code,
        deduction_amount: item.amount,
        report_month: reportMonth,
        parent_message_id: noticeId,
        deduction_assignment_id: assignment.id,
        deduction_item_id: item.id,
        created_at: `${replyDate}T10:00:00+03:00`,
      });
    });

    const { error: writeError } = await adminClient.rpc("replace_ai_deduction_messages", {
      p_emp_id: empId,
      p_report_month: reportMonth,
      p_messages: messages,
      p_actor_name: caller.name ?? user.email,
      p_expected_total: displayedDeductionTotal,
    });
    if (writeError) throw writeError;

    const finalSavedAssignment = await loadSavedAssignment();
    if (!finalSavedAssignment) throw new Error("تعذر تحميل تخصيص الخصم بعد حفظه");
    return respond({ ...formatSavedAssignment(finalSavedAssignment), reusedAssignment: false, patternCollision });
  } catch (error) {
    console.error("hr-ai-deduction", error);
    return respond({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
