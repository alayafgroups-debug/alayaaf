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
type AgentDeduction = { reasonId?: string; reason?: string; amount?: number; notice?: string; acknowledgement?: string };

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

  const deadline = Date.now() + 52_000;
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

    const [employeeResult, payrollResult, attendanceResult, reasonsResult, emailResult, primaryEmailResult] = await Promise.all([
      adminClient.from("employees").select("id, emp_id, name, nationality, job_title, department, base_salary, total_salary").eq("emp_id", empId).maybeSingle(),
      adminClient.from("payroll").select("basic_salary, allowances, deductions, net_salary, notes").eq("emp_id", empId).eq("month", month),
      adminClient.from("attendance").select("date, check_in, check_out, status, late_minutes, notes").eq("emp_id", empId).gte("date", `${month}-01`).lte("date", `${month}-31`).order("date"),
      adminClient.from("hr_config_items").select("id, name_ar, description").eq("config_type", "deduction_reason").eq("status", "فعال").order("sort_order"),
      adminClient.from("employee_emails").select("generated_email").eq("emp_id", empId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      adminClient.from("hr_config_items").select("value").eq("config_type", "primary_email_domain").limit(1).maybeSingle(),
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
    const gross = payrollRows.length
      ? payrollRows.reduce((sum: number, row: any) => sum + Number(row.basic_salary ?? 0) + Number(row.allowances ?? 0), 0)
      : Number(employee.total_salary ?? employee.base_salary ?? 0);
    const existingDeductions = payrollRows.reduce((sum: number, row: any) => sum + Number(row.deductions ?? 0), 0);
    const requiredDeduction = roundMoney(gross - existingDeductions - 1000);
    if (requiredDeduction <= 0) return respond({ error: `راتب الموظف ${employee.name} لا يسمح بخصومات تترك متبقياً قدره 1000 ريال` }, 400);

    const attendanceRows = attendanceResult.data ?? [];
    const attendanceSummary = {
      records: attendanceRows.length,
      absent: attendanceRows.filter((row: any) => ["غائب", "absent"].includes(String(row.status))).length,
      lateRecords: attendanceRows.filter((row: any) => Number(row.late_minutes ?? 0) > 0).length,
      lateMinutes: attendanceRows.reduce((sum: number, row: any) => sum + Number(row.late_minutes ?? 0), 0),
    };
    const prompt = [
      "أنشئ إشعارات خصم موارد بشرية عربية مختصرة لموظف سعودي.",
      `الموظف: ${employee.name}. الشهر: ${month}. ملخص الحضور: ${JSON.stringify(attendanceSummary)}.`,
      `قيمة الخصم التي سيطبقها النظام: ${requiredDeduction} ريال وصافي الراتب الإلزامي: 1000 ريال.`,
      `اختر سبباً واحداً أو سببين مختلفين فقط من هذه القائمة: ${JSON.stringify(reasons)}`,
      "أعد JSON فقط بلا markdown. لا تحسب المبالغ؛ النظام يحسبها. استخدم معرفات القائمة حرفياً:",
      '{"deductions":[{"reasonId":"id","notice":"إشعار عربي مختصر","acknowledgement":"رد قبول عربي مختصر باسم الموظف"}]}',
    ].join("\n");

    const { output, sessionId } = await runManagedAgent(apiKey, prompt);
    const rawDeductions: AgentDeduction[] = Array.isArray(output?.deductions) ? output.deductions.slice(0, 3) : [];
    if (rawDeductions.length === 0) throw new Error("Managed agent returned no deductions");

    const reasonMap = new Map(reasons.map((reason) => [reason.id, reason]));
    const usedReasonIds = new Set<string>();
    const selected = rawDeductions.map((item) => {
      const reasonId = String(item.reasonId ?? "");
      const reason = reasonMap.get(reasonId);
      if (!reason || usedReasonIds.has(reasonId)) throw new Error("Managed agent selected an invalid deduction reason");
      usedReasonIds.add(reasonId);
      return { reason, amount: 0, notice: String(item.notice ?? "").trim(), acknowledgement: String(item.acknowledgement ?? "").trim() };
    });
    const weights = selected.length === 1 ? [1] : selected.length === 2 ? [0.6, 0.4] : [0.45, 0.35, 0.2];
    selected.forEach((item, index) => {
      item.amount = index === selected.length - 1
        ? roundMoney(requiredDeduction - selected.reduce((sum, current) => sum + current.amount, 0))
        : roundMoney(requiredDeduction * weights[index]);
    });

    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const preferredDays = [4, 14, 24];
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
      const noticeBody = item.notice || `مرحباً ${employee.name}،\n\nتم تسجيل خصم بمبلغ ${amountText} ريال بسبب: ${item.reason.name}.`;
      const acknowledgementBody = item.acknowledgement || `السلام عليكم،\n\nأؤكد استلام وقبول إشعار الخصم بسبب: ${item.reason.name}.\n\n${employee.name}`;

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
        title: "خصم عبر Claude Opus 5",
        amount: item.amount,
        reason: item.reason.name,
        notification: `أُرسل إلى ${generatedEmail} بتاريخ ${noticeDate}`,
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

    return respond({ deductionItems, generatedEmail, finalNet: 1000, sessionId, model: MODEL });
  } catch (error: any) {
    console.error("hr-ai-deduction", error);
    return respond({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
