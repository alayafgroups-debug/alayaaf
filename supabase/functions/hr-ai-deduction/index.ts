import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const AGENT_ID = Deno.env.get("CLAUDE_AGENT_ID") ?? "agent_01XLBEZrtW9Vn7vzi6QxtMv8";
const ENVIRONMENT_ID = Deno.env.get("CLAUDE_ENVIRONMENT_ID") ?? "env_01PATFPhRRPye8Rnf3xPUG4h";
const MODEL = "claude-opus-5";

type Reason = { id: string; name: string; description: string };
type AgentDeduction = { reasonId?: string; weight?: number; notice?: string; acknowledgement?: string };

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const canManageReports = (permissions: Record<string, unknown>) =>
  [permissions["hr.reports"], permissions["hr.reports.full-employee"], permissions["module.hr"]]
    .some((value) => value === true || value === "manage");

const extractJson = (text: string) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The managed agent did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
};

const anthropicRequest = async (path: string, apiKey: string, init?: RequestInit) => {
  const response = await fetch(`${ANTHROPIC_BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "managed-agents-2026-04-01",
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message ?? data?.message ?? `Anthropic request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
};

const readAgentOutput = (events: any) => {
  const list = Array.isArray(events?.data) ? events.data : Array.isArray(events?.events) ? events.events : [];
  for (const event of list) {
    if (!String(event?.type ?? "").startsWith("agent.") || !Array.isArray(event?.content)) continue;
    const text = event.content
      .filter((block: any) => block?.type === "text" && block?.text)
      .map((block: any) => String(block.text))
      .join("\n");
    if (!text) continue;
    try {
      return extractJson(text);
    } catch {
      // The agent may still be streaming an incomplete JSON response.
    }
  }
  return null;
};

const runManagedAgent = async (apiKey: string, prompt: string) => {
  const session = await anthropicRequest("/sessions", apiKey, {
    method: "POST",
    body: JSON.stringify({
      agent: { type: "agent_with_overrides", id: AGENT_ID, model: MODEL },
      environment_id: ENVIRONMENT_ID,
      initial_events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }],
    }),
  });
  if (!session?.id) throw new Error("Anthropic did not return a session ID");

  const deadline = Date.now() + 44_000;
  let status = String(session.status ?? "running");
  let iteration = 0;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const events = await anthropicRequest(`/sessions/${session.id}/events?limit=30&order=desc`, apiKey);
    const output = readAgentOutput(events);
    if (output) return { output, sessionId: String(session.id) };

    iteration += 1;
    if (iteration % 4 === 0) {
      const current = await anthropicRequest(`/sessions/${session.id}`, apiKey);
      status = String(current.status ?? status);
      if (["failed", "terminated", "aborted", "canceled", "interrupted"].includes(status)) {
        throw new Error(`Managed agent session ended with status: ${status}`);
      }
      if (["idle", "completed"].includes(status)) break;
    }
  }

  const finalEvents = await anthropicRequest(`/sessions/${session.id}/events?limit=100&order=desc`, apiKey);
  const output = readAgentOutput(finalEvents);
  if (output) return { output, sessionId: String(session.id) };
  throw new Error(status === "idle" ? "Managed agent returned no valid JSON" : "Managed agent response timed out");
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
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return respond({ error: "ANTHROPIC_API_KEY is not configured" }, 503);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: authError } = await callerClient.auth.getUser(token);
    if (authError || !user?.email) return respond({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const empId = String(body?.empId ?? "").trim();
    const month = String(body?.month ?? "").trim();
    const reportGross = roundMoney(Number(body?.reportGross ?? 0));
    const reportExistingDeductions = roundMoney(Number(body?.reportExistingDeductions ?? 0));
    if (!empId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return respond({ error: "Valid empId and month are required" }, 400);
    }

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
    const permissions = role?.permissions && typeof role.permissions === "object" ? role.permissions : {};
    if (!canManageReports(permissions as Record<string, unknown>)) return respond({ error: "Forbidden" }, 403);

    const [employeeResult, payrollResult, attendanceResult, reasonsResult, emailResult, primaryEmailResult, leavesResult] = await Promise.all([
      adminClient.from("employees").select("id, emp_id, name, nationality, job_title, department, base_salary, total_salary, daily_hours").eq("emp_id", empId).maybeSingle(),
      adminClient.from("payroll").select("basic_salary, allowances, deductions, net_salary, notes").eq("emp_id", empId).eq("month", month),
      adminClient.from("attendance").select("date, check_in, check_out, status, late_minutes, notes").eq("emp_id", empId).gte("date", `${month}-01`).lte("date", `${month}-31`).order("date"),
      adminClient.from("hr_config_items").select("id, name_ar, description").eq("config_type", "deduction_reason").eq("status", "فعال").order("sort_order"),
      adminClient.from("employee_emails").select("generated_email").eq("emp_id", empId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      adminClient.from("hr_config_items").select("value").eq("config_type", "primary_email_domain").limit(1).maybeSingle(),
      adminClient.from("leave_requests").select("leave_type, start_date, end_date, status, notes, admin_note").eq("emp_id", empId).lte("start_date", `${month}-31`).gte("end_date", `${month}-01`),
    ]);

    if (employeeResult.error || !employeeResult.data) return respond({ error: "Employee not found" }, 404);
    const employee = employeeResult.data;
    if (String(employee.nationality).trim() !== "سعودي") return respond({ error: "AI deductions apply to Saudi employees only" }, 400);
    if (payrollResult.error || attendanceResult.error || reasonsResult.error) throw payrollResult.error ?? attendanceResult.error ?? reasonsResult.error;
    if (!emailResult.data?.generated_email) return respond({ error: `لا يوجد بريد مولد ومحفوظ للموظف ${employee.name}` }, 400);

    const reasons: Reason[] = (reasonsResult.data ?? []).map((reason: any) => ({
      id: String(reason.id),
      name: String(reason.name_ar || "سبب خصم"),
      description: String(reason.description || ""),
    }));
    if (reasons.length === 0) return respond({ error: "أضف أسباب خصومات محفوظة أولاً" }, 400);

    const payrollRows = payrollResult.data ?? [];
    const serverGross = payrollRows.length
      ? payrollRows.reduce((sum: number, row: any) => sum + Number(row.basic_salary ?? 0) + Number(row.allowances ?? 0), 0)
      : Number(employee.total_salary ?? employee.base_salary ?? 0);
    const serverExistingDeductions = payrollRows.reduce((sum: number, row: any) => sum + Number(row.deductions ?? 0), 0);
    const gross = Number.isFinite(reportGross) && reportGross > 1000 && reportGross <= serverGross
      ? reportGross
      : serverGross;
    const existingDeductions = Number.isFinite(reportExistingDeductions) && reportExistingDeductions >= 0 && reportExistingDeductions < gross
      ? reportExistingDeductions
      : serverExistingDeductions;
    const attendanceRows = attendanceResult.data ?? [];
    const approvedLeaves = (leavesResult.data ?? []).filter((leave: any) => ["موافق", "موافق عليها", "معتمد", "approved"].includes(String(leave.status).toLowerCase()));
    const absentRows = attendanceRows.filter((row: any) => ["غائب", "absent"].includes(String(row.status).toLowerCase()));
    const deductibleAbsences = absentRows.filter((row: any) => !approvedLeaves.some((leave: any) => String(leave.start_date) <= String(row.date) && String(leave.end_date) >= String(row.date)));
    const lateMinutes = attendanceRows.reduce((sum: number, row: any) => sum + Math.max(0, Number(row.late_minutes ?? 0)), 0);
    const dailyHours = Math.max(1, Number(employee.daily_hours ?? 8));
    const absenceAmount = roundMoney((gross / 30) * deductibleAbsences.length);
    const lateAmount = roundMoney((gross / 30 / dailyHours / 60) * lateMinutes);
    const attendanceSummary = {
      records: attendanceRows.length,
      present: attendanceRows.filter((row: any) => Boolean(row.check_in) && !["غائب", "absent"].includes(String(row.status).toLowerCase())).length,
      absentDates: absentRows.map((row: any) => ({ date: row.date, notes: row.notes || "لا يوجد سبب مسجل" })),
      approvedLeaves,
      deductibleAbsentDays: deductibleAbsences.length,
      lateRecords: attendanceRows.filter((row: any) => Number(row.late_minutes ?? 0) > 0).map((row: any) => ({ date: row.date, minutes: row.late_minutes, notes: row.notes || "" })),
      lateMinutes,
    };
    const requiredDeduction = roundMoney(gross - existingDeductions - 1000);
    if (requiredDeduction <= 0) return respond({ error: "الراتب بعد الخصومات القائمة لا يسمح بصافي 1000 ريال" }, 400);
    const finalNet = 1000;
    const requiredReasonCount = Math.min(Math.max(3, reasons.length), 4);
    if (reasons.length < 3) return respond({ error: "يجب حفظ ثلاثة أسباب خصم فعالة على الأقل لتوزيع الخصم منطقياً" }, 400);
    const compactReasons = reasons.map((reason) => ({ id: reason.id, name: reason.name }));
    const prompt = [
      `اختر ${requiredReasonCount} أسباب خصم مختلفة للموظف ${employee.name} من القائمة فقط: ${JSON.stringify(compactReasons)}.`,
      `الوقائع: غياب ${deductibleAbsences.length} يوم، تأخير ${lateMinutes} دقيقة، والمبلغ المطلوب توزيعه ${requiredDeduction} ريال لصافي 1000.`,
      "اختر الغياب والتأخير عند وجودهما. أعد JSON فقط بلا شرح. مجموع الأوزان 100 وكل وزن لا يتجاوز 40:",
      '{"deductions":[{"reasonId":"id","weight":25}]}',
    ].join("\n");

    const { output, sessionId } = await runManagedAgent(apiKey, prompt);
    const rawDeductions: AgentDeduction[] = Array.isArray(output?.deductions) ? output.deductions.slice(0, requiredReasonCount) : [];
    if (rawDeductions.length !== requiredReasonCount) throw new Error("Managed agent did not select enough deduction reasons");

    const reasonMap = new Map(reasons.map((reason) => [reason.id, reason]));
    const usedReasonIds = new Set<string>();
    const selected = rawDeductions.map((item) => {
      const reasonId = String(item.reasonId ?? "");
      const reason = reasonMap.get(reasonId);
      if (!reason || usedReasonIds.has(reasonId)) throw new Error("Managed agent selected an invalid deduction reason");
      usedReasonIds.add(reasonId);
      const weight = Number(item.weight ?? 0);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 40) throw new Error("Managed agent returned an invalid deduction weight");
      return { reason, weight, amount: 0, notice: String(item.notice ?? "").trim(), acknowledgement: String(item.acknowledgement ?? "").trim() };
    });
    const weightTotal = selected.reduce((sum, item) => sum + item.weight, 0);
    selected.forEach((item, index) => {
      item.amount = index === selected.length - 1
        ? roundMoney(requiredDeduction - selected.reduce((sum, current) => sum + current.amount, 0))
        : roundMoney(requiredDeduction * item.weight / weightTotal);
    });

    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const preferredDays = [4, 11, 18, 25];
    const generatedEmail = String(emailResult.data.generated_email);
    const primaryEmail = String(primaryEmailResult.data?.value || "hr.alayaf.com");
    const messages: Record<string, unknown>[] = [];
    const deductionItems = selected.map((item, index) => {
      const noticeDay = Math.min(preferredDays[index], Math.max(1, lastDay - 1));
      const replyDay = Math.min(noticeDay + 1, lastDay);
      const noticeDate = `${month}-${String(noticeDay).padStart(2, "0")}`;
      const replyDate = `${month}-${String(replyDay).padStart(2, "0")}`;
      const noticeId = crypto.randomUUID();
      const replyId = crypto.randomUUID();
      const amountText = item.amount.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const attendanceDetail = item.reason.name.includes("غياب")
        ? `سجل الشهر يتضمن ${deductibleAbsences.length} يوم غياب غير مغطى بإجازة معتمدة.`
        : item.reason.name.includes("تأخير") || item.reason.name.includes("تاخير")
          ? `سجل الشهر يتضمن تأخيراً بإجمالي ${lateMinutes} دقيقة.`
          : "تم اختيار السبب بواسطة وكيل Claude من قائمة أسباب الخصم المعتمدة.";
      const noticeBody = `مرحباً ${employee.name}،\n\nتم تسجيل خصم بمبلغ ${amountText} ريال بسبب: ${item.reason.name}.\n${attendanceDetail}`;
      const acknowledgementBody = `السلام عليكم،\n\nأؤكد استلام وقبول إشعار الخصم بسبب: ${item.reason.name}.\n\n${employee.name}`;

      messages.push({
        id: noticeId, emp_id: empId, emp_name: employee.name, from_email: primaryEmail, to_email: generatedEmail,
        subject: `إشعار خصم بمبلغ ${amountText} ريال — ${item.reason.name}`, body: noticeBody,
        message_kind: "deduction_notice", deduction_reason_id: item.reason.id, deduction_amount: item.amount,
        source: "ai_report", report_month: month, parent_message_id: null, created_at: `${noticeDate}T09:00:00+03:00`,
      });
      messages.push({
        id: replyId, emp_id: empId, emp_name: employee.name, from_email: generatedEmail, to_email: primaryEmail,
        subject: `رد وقبول: ${item.reason.name}`, body: acknowledgementBody,
        message_kind: "employee_reply", deduction_reason_id: item.reason.id, deduction_amount: item.amount,
        source: "ai_report", report_month: month, parent_message_id: noticeId, created_at: `${replyDate}T10:00:00+03:00`,
      });
      return {
        title: "مسؤول الخصم",
        amount: item.amount,
        reason: item.reason.name,
        notification: `أُرسل من بريد إدارة HR: ${primaryEmail} إلى ${generatedEmail} بتاريخ ${noticeDate}`,
        acknowledgement: `تم قبول الخصم والرد بتاريخ ${replyDate}`,
      };
    });

    const { error: writeError } = await adminClient.rpc("replace_ai_deduction_messages", {
      p_emp_id: empId,
      p_report_month: month,
      p_messages: messages,
      p_actor_name: caller.name ?? user.email,
      p_expected_total: requiredDeduction,
    });
    if (writeError) throw writeError;

    return respond({
      deductionItems,
      generatedEmail,
      gross,
      existingDeductions,
      generatedDeductionTotal: requiredDeduction,
      finalNet,
      sessionId,
      model: MODEL,
    });
  } catch (error: any) {
    console.error("hr-ai-deduction", error);
    return respond({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
