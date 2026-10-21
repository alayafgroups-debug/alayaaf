import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { ArrowRight, Eye, FileText, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { addDays, riyadhToday, serviceYears } from "@/lib/hrDates";
import { ACTIVE_EMPLOYEE_STATUSES, isApprovedStatus, isPendingStatus } from "@/lib/hrStatus";
import { hrRequestErrorText } from "@/lib/hrErrors";
import { fetchAllRows } from "@/lib/fetchAll";
import { advanceSkipsById, allocateAdvanceRepayments, isCancelledPayrollStatus, isMissingColumnError, isMissingTableError, parseApprovedAdvance, terminationAdvanceCredits, withTerminationCredit, type AdvanceRecord } from "@/lib/advances";

type Employee = {
  id: string;
  empId: string;
  name: string;
  department: string;
  baseSalary: number;
  totalSalary: number;
  hireDate: string;
  contractEndDate: string;
  jobTitle: string;
};

type TermRow = {
  id: string;
  jobId: string;
  name: string;
  department: string;
  reason: string;
  terminationDate: string;
  reward: number;
  leaveValue: number;
  otherEntitlements: number;
  otherDeductions: number;
  advancesDeduction: number;
  total: number;
  status: string;
  hireDate: string;
  notes: string;
};

type TermReason = { reason: string; deprivesReward: boolean };

// تُستخدم فقط إن كان جدول termination_reasons فارغًا أو تعذّر تحميله
const TERM_REASONS: TermReason[] = [
  "استقالة", "انتهاء العقد", "إنهاء من قِبل صاحب العمل", "تقاعد", "وفاة", "أخرى",
].map((reason) => ({ reason, deprivesReward: false }));

// نفس قاعدة صفحة أسباب إنهاء الخدمة: "يؤدي إلى حرمان..." مقابل "لا يؤدي إلى حرمان..."
const reasonDeprivesReward = (effect: unknown) => {
  const text = String(effect ?? "");
  return text.includes("حرمان") && !text.includes("لا ");
};

// الاستقالة وفق المادة 81 (إخلال صاحب العمل) تستحق المكافأة كاملة، فلا تُعامل كاستقالة في نسبة المادة 85
const mentionsArticle81 = (reason: string) => /(^|[^0-9٠-٩])(81|٨١)([^0-9٠-٩]|$)/.test(reason);
const isResignationReason = (reason: string) => reason.includes("استقالة") && !mentionsArticle81(reason);

// سجل إنهاء الخدمة يمنع سجلًا ثانيًا ما دام معلقًا أو معتمدًا؛ المرفوض والملغى لا يمنع
const isOpenTermination = (status: unknown) =>
  isPendingStatus(status) || isApprovedStatus(status) || String(status ?? "").trim() === "موافق عليه";

const CONTRACT_TYPES = ["دائم", "مؤقت", "موسمي", "جزئي"];

// إعدادات إنهاء الخدمة الرئيسية (تُحفظ من صفحة إعدادات إنهاء الخدمة بنفس المفتاح والقيم الافتراضية)
const TERMINATION_SETTINGS_KEY = "termination_main_settings";
const TERMINATION_SETTINGS_DEFAULT = {
  autoApprove: "no",
  approver1: "",
  approver2: "",
  approver3: "",
  // الأجر الإجمالي افتراضيًا (الأجر الفعلي في المادة 84، وهو الحساب السابق) ما لم تُختر الإعدادات غيره
  gratuityBase: "total",
  calcLessThanYear: "no",
  rate5andBelow: "half",
  rateAbove5: "full",
  calcDayOfEnd: "no",
};
type TerminationSettings = typeof TERMINATION_SETTINGS_DEFAULT;

/** setting_value قد يكون كائنًا أو نص JSON؛ يُدمج فوق القيم الافتراضية، وأي قيمة تالفة تعود للافتراضي */
const parseTerminationSettings = (value: unknown): TerminationSettings => {
  try {
    const raw = typeof value === "string" ? JSON.parse(value) : value;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...TERMINATION_SETTINGS_DEFAULT, ...(raw as Partial<TerminationSettings>) };
  } catch {
    // نص غير صالح: الافتراضي
  }
  return TERMINATION_SETTINGS_DEFAULT;
};

/** نهاية مدة الخدمة: يُضاف يوم الإنهاء نفسه إن كان الإعداد يحتسبه ضمن المدة */
const serviceEndDate = (terminationDate: string, settings: TerminationSettings) =>
  settings.calcDayOfEnd === "yes" && /^\d{4}-\d{2}-\d{2}$/.test(terminationDate) ? addDays(terminationDate, 1) : terminationDate;

/** أشهر الأجر عن كل سنة: نصف شهر أو شهر كامل */
const monthsPerYear = (rate: string) => (rate === "full" ? 1 : 0.5);
const rateLabel = (rate: string) => (rate === "full" ? "راتب شهر لكل سنة" : "نصف راتب لكل سنة");

function calcServiceDuration(hireDateStr: string, endDateStr: string, t: (s: string) => string): string {
  if (!hireDateStr || !endDateStr) return "";
  const hire = new Date(hireDateStr);
  const end = new Date(endDateStr);
  if (end < hire) return "";
  let years = end.getFullYear() - hire.getFullYear();
  let months = end.getMonth() - hire.getMonth();
  let days = end.getDate() - hire.getDate();
  if (days < 0) { months -= 1; days += 30; }
  if (months < 0) { years -= 1; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${t("سنة")}`);
  if (months > 0) parts.push(`${months} ${t("أشهر")}`);
  if (days > 0) parts.push(`${days} ${t("يوم")}`);
  return parts.join(" ");
}

/** الأجر الفعلي (الإجمالي)، وإن لم يوجد فالأساسي — أساس قيمة الإجازات */
const totalWage = (employee: { totalSalary: number; baseSalary: number }) =>
  employee.totalSalary > 0 ? employee.totalSalary : employee.baseSalary;

/** أجر المكافأة حسب إعداد «مكافأة إنهاء الخدمة تحتسب من»: الأساسي، أو الإجمالي (وإن لم يوجد فالأساسي) */
const rewardWage = (employee: { totalSalary: number; baseSalary: number }, settings: TerminationSettings) => {
  const useTotal = settings.gratuityBase === "total" && employee.totalSalary > 0;
  return { wage: useTotal ? employee.totalSalary : employee.baseSalary, label: useTotal ? "الراتب الإجمالي" : "الراتب الأساسي" };
};

/** نسبة المكافأة عند الاستقالة (المادة 85): أقل من سنتين لا شيء، 2–5 الثلث، 5–10 الثلثان، 10 فأكثر كاملة */
function resignationFactor(years: number): number {
  if (years < 2) return 0;
  if (years < 5) return 1 / 3;
  if (years < 10) return 2 / 3;
  return 1;
}

/** مكافأة نهاية الخدمة (المادة 84) حسب الإعدادات: معدل الخمس الأولى ومعدل ما بعدها، وبالنسبة لأجزاء السنة.
 * endDateStr هو نهاية مدة الخدمة (بعد احتساب يوم الإنهاء إن لزم). نسبة الاستقالة تُطبَّق بعد ذلك. */
function calcGratuity(wage: number, hireDateStr: string, endDateStr: string, resignation: boolean, settings: TerminationSettings): number {
  if (!hireDateStr || !endDateStr || wage <= 0) return 0;
  const years = serviceYears(hireDateStr, endDateStr);
  if (years <= 0) return 0;
  if (settings.calcLessThanYear === "no" && years < 1) return 0;
  const firstRate = monthsPerYear(settings.rate5andBelow);
  const laterRate = monthsPerYear(settings.rateAbove5);
  const full = years <= 5 ? wage * firstRate * years : wage * firstRate * 5 + wage * laterRate * (years - 5);
  const gratuity = resignation ? full * resignationFactor(years) : full;
  return Math.round(gratuity * 100) / 100;
}

function rewardRuleText(years: number, resignation: boolean, deprived: boolean, settings: TerminationSettings, wageLabel: string, t: (s: string) => string): string {
  if (deprived) return t("السبب المختار يحرم الموظف من المكافأة حسب إعداد أسباب إنهاء الخدمة");
  if (settings.calcLessThanYear === "no" && years < 1) return t("خدمة أقل من سنة: لا مكافأة حسب إعدادات إنهاء الخدمة");
  if (!resignation) {
    return `${t("مكافأة كاملة حسب إعدادات إنهاء الخدمة")} — ${t("الخمس سنوات الأولى")}: ${t(rateLabel(settings.rate5andBelow))} — ${t("ما بعد الخمس سنوات")}: ${t(rateLabel(settings.rateAbove5))} — ${t("أساس الاحتساب")}: ${t(wageLabel)}`;
  }
  if (years < 2) return t("استقالة قبل إكمال سنتين: لا مكافأة");
  if (years < 5) return t("استقالة بعد سنتين وقبل خمس سنوات: ثلث المكافأة");
  if (years < 10) return t("استقالة بعد خمس سنوات وقبل عشر: ثلثا المكافأة");
  return t("استقالة بعد عشر سنوات فأكثر: المكافأة كاملة");
}

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * السلف المتبقية على الموظف (HR-13، «إجمالي استقطاع السلف» كما في سمارت): مبلغ كل سلفة معتمدة
 * ناقص ما خُصم منها فعلًا في كشوف الرواتب (بالتوزيع نفسه الذي يستخدمه مسير الرواتب)، مع تأجيل الأقساط.
 */
async function outstandingAdvances(employeeId: string, empCode: string): Promise<number | null> {
  // استقطاع السلف يسجّله من يدير الرواتب (قاعدة البيانات تفرض ذلك)، وهو يقرأ السلف والرواتب معًا؛
  // null = لا صلاحية: يبقى الاستقطاع صفرًا
  const { data: allowed, error: accessError } = await supabase.rpc("hr_area_allowed", { p_areas: ["hr.payroll"], p_manage: true });
  if (accessError) throw accessError;
  if (allowed !== true) return null;
  const { data: advanceRows, error: advanceError } = await supabase.from("hr_advances").select("*").eq("employee_id", employeeId);
  if (advanceError) throw advanceError;
  const rows = (advanceRows ?? []) as Record<string, unknown>[];
  if (!rows.length) return 0;
  const ids = rows.map((row) => String(row.id ?? "")).filter(Boolean);
  const skipResult = await supabase.from("hr_advance_skips").select("id, advance_id, month").in("advance_id", ids);
  if (skipResult.error && !isMissingTableError(skipResult.error)) throw skipResult.error;
  const skipsById = advanceSkipsById(skipResult.error ? [] : ((skipResult.data ?? []) as Record<string, unknown>[]));
  const records = rows.map((row) => parseApprovedAdvance(row, skipsById.get(String(row.id ?? "")))).filter((item): item is AdvanceRecord => Boolean(item));
  if (!records.length) return 0;
  const payrollRows = empCode
    ? await fetchAllRows<Record<string, unknown>>((from, to) => supabase.from("payroll").select("id, emp_id, month, status, advance_deduction").eq("emp_id", empCode).gt("advance_deduction", 0).order("month").order("id").range(from, to))
    : [];
  const deductionsByMonth = new Map<string, number>();
  payrollRows.forEach((row) => {
    if (isCancelledPayrollStatus(row.status)) return;
    const month = String(row.month ?? "").slice(0, 7);
    deductionsByMonth.set(month, round2((deductionsByMonth.get(month) ?? 0) + (Number(row.advance_deduction) || 0)));
  });
  // استقطاع سلف في إنهاء خدمة سابق غير مرفوض (إن وُجد) سداد لها أيضًا
  let credit = 0;
  try {
    credit = terminationAdvanceCredits(await fetchAllRows<Record<string, unknown>>((from, to) => supabase.from("hr_terminations").select("*").eq("emp_id", employeeId).gt("advances_deduction", 0).order("id").range(from, to))).get(employeeId) ?? 0;
  } catch (terminationError) {
    if (!isMissingColumnError(terminationError)) throw terminationError;
  }
  const repaid = allocateAdvanceRepayments(records, withTerminationCredit(deductionsByMonth, credit));
  return round2(records.reduce((sum, record) => sum + Math.max(0, record.amount - (repaid.get(record.id) ?? 0)), 0));
}

function calcLeaveValue(totalSalary: number, leaveRemaining: number): number {
  if (!totalSalary || leaveRemaining <= 0) return 0;
  const daily = totalSalary / 30;
  return Math.round(daily * leaveRemaining * 100) / 100;
}

const emptyForm = () => ({
  employeeId: "",
  contractType: "",
  endReason: "",
  terminationDate: riyadhToday(),
  hireDate: "",
  leaveRemaining: "0",
  leaveValue: "0",
  otherEntitlements: "0",
  otherDeductions: "0",
  advancesDeduction: "0",
  total: "0",
  notes: "",
});

export default function HRTerminationEmployees() {
  const { t, direction } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [reasons, setReasons] = useState<TermReason[]>(TERM_REASONS);
  const [terminationSettings, setTerminationSettings] = useState<TerminationSettings>(TERMINATION_SETTINGS_DEFAULT);
  // الحفظ ينتظر تحميل الإعدادات حتى لا تُحسب المكافأة بالقيم الافتراضية قبل وصولها
  const [settingsReady, setSettingsReady] = useState(false);
  // السلف المتبقية على الموظف المختار (تُملأ في «إجمالي استقطاع السلف» ويمكن تعديلها)
  const [advancesInfo, setAdvancesInfo] = useState<{ employeeId: string; loading: boolean; outstanding: number | null; error: string; noAccess?: boolean }>({ employeeId: "", loading: false, outstanding: null, error: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [empsResult, termsResult, reasonsResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, emp_id, name, department, base_salary, total_salary, hire_date, contract_end_date, job_title")
          .in("status", ACTIVE_EMPLOYEE_STATUSES)
          .order("name"),
        supabase.from("hr_terminations").select("*").order("created_at", { ascending: false }),
        supabase.from("termination_reasons").select("*").order("id"),
      ]);

      if (empsResult.error) throw empsResult.error;
      if (termsResult.error) throw termsResult.error;

      const loadedReasons = ((reasonsResult.data as Record<string, unknown>[] | null) ?? [])
        .map((row) => ({ reason: String(row.reason ?? "").trim(), deprivesReward: reasonDeprivesReward(row.effect) }))
        .filter((row) => row.reason);
      setReasons(!reasonsResult.error && loadedReasons.length ? loadedReasons : TERM_REASONS);

      const loadedEmployees: Employee[] = (empsResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        empId: String(row.emp_id ?? row.id),
        name: String(row.name ?? ""),
        department: String(row.department ?? ""),
        baseSalary: Number(row.base_salary ?? 0),
        totalSalary: Number(row.total_salary ?? 0),
        hireDate: String(row.hire_date ?? ""),
        contractEndDate: String(row.contract_end_date ?? ""),
        jobTitle: String(row.job_title ?? ""),
      }));
      setEmployees(loadedEmployees);
      const employeeByUuid = new Map(loadedEmployees.map((employee) => [employee.id, employee]));

      setItems(
        (termsResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          // emp_id = UUID الموظف، والرقم الوظيفي للعرض في job_id؛ نطابق بالـ UUID أولًا ثم الرقم
          jobId: String(row.job_id ?? "") || employeeByUuid.get(String(row.emp_id ?? ""))?.empId || String(row.emp_id ?? ""),
          name: String(row.emp_name ?? ""),
          department: String(row.department ?? ""),
          reason: String(row.end_reason ?? row.reason ?? ""),
          terminationDate: String(row.termination_date ?? ""),
          reward: Number(row.reward ?? 0),
          leaveValue: Number(row.leave_value ?? 0),
          otherEntitlements: Number(row.other_entitlements ?? 0),
          otherDeductions: Number(row.other_deductions ?? 0),
          advancesDeduction: Number(row.advances_deduction ?? 0),
          total: Number(row.total ?? 0),
          status: String(row.status ?? "معلق"),
          hireDate: String(row.hire_date ?? ""),
          notes: String(row.notes ?? ""),
        }))
      );
    } catch (error) {
      toast({
        title: t("تعذر تحميل البيانات"),
        description: t(hrRequestErrorText(error)),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // تعذّر التحميل أو عدم وجود الإعداد: تبقى القيم الافتراضية دون رسالة
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("hr_settings").select("setting_value").eq("setting_key", TERMINATION_SETTINGS_KEY).limit(1);
        const row = (data as { setting_value?: unknown }[] | null)?.[0];
        if (!active) return;
        if (!error && row && row.setting_value !== null && row.setting_value !== undefined) {
          setTerminationSettings(parseTerminationSettings(row.setting_value));
        }
      } catch {
        // الافتراضي
      } finally {
        if (active) setSettingsReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const selectedEmployee = employees.find((emp) => emp.id === form.employeeId);
  const selectedReason = reasons.find((item) => item.reason === form.endReason);
  const isResignation = isResignationReason(form.endReason);
  const deprived = Boolean(selectedReason?.deprivesReward);
  const serviceEnd = serviceEndDate(form.terminationDate, terminationSettings);
  const yearsOfService = selectedEmployee ? serviceYears(selectedEmployee.hireDate, serviceEnd) : 0;
  const gratuityWage = selectedEmployee ? rewardWage(selectedEmployee, terminationSettings) : null;

  // Auto-compute fields when employee or date changes
  const computedReward = useMemo(() => {
    if (!selectedEmployee || deprived) return 0;
    return calcGratuity(rewardWage(selectedEmployee, terminationSettings).wage, selectedEmployee.hireDate, serviceEnd, isResignation, terminationSettings);
  }, [selectedEmployee, serviceEnd, isResignation, deprived, terminationSettings]);

  const computedLeaveValue = useMemo(() => {
    if (!selectedEmployee) return 0;
    return calcLeaveValue(totalWage(selectedEmployee), Number(form.leaveRemaining));
  }, [selectedEmployee, form.leaveRemaining]);

  const computedTotal = useMemo(() => {
    return (
      computedReward +
      computedLeaveValue +
      Number(form.otherEntitlements) -
      Number(form.otherDeductions) -
      (Number(form.advancesDeduction) || 0)
    );
  }, [computedReward, computedLeaveValue, form.otherEntitlements, form.otherDeductions, form.advancesDeduction]);

  // عند اختيار الموظف: السلف المتبقية عليه تُملأ في «إجمالي استقطاع السلف»
  useEffect(() => {
    const employee = employees.find((item) => item.id === form.employeeId);
    if (!employee) { setAdvancesInfo({ employeeId: "", loading: false, outstanding: null, error: "" }); return; }
    let active = true;
    setAdvancesInfo({ employeeId: employee.id, loading: true, outstanding: null, error: "" });
    outstandingAdvances(employee.id, employee.empId)
      .then((outstanding) => {
        if (!active) return;
        if (outstanding === null) {
          setAdvancesInfo({ employeeId: employee.id, loading: false, outstanding: null, error: "", noAccess: true });
          setForm((current) => (current.employeeId === employee.id ? { ...current, advancesDeduction: "0" } : current));
          return;
        }
        setAdvancesInfo({ employeeId: employee.id, loading: false, outstanding, error: "" });
        setForm((current) => (current.employeeId === employee.id ? { ...current, advancesDeduction: outstanding.toFixed(2) } : current));
      })
      .catch((advanceError: unknown) => {
        if (!active) return;
        setAdvancesInfo({ employeeId: employee.id, loading: false, outstanding: null, error: hrRequestErrorText(advanceError, t("تعذر قراءة السلف")) });
      });
    return () => { active = false; };
  }, [form.employeeId, employees]); // eslint-disable-line react-hooks/exhaustive-deps

  const serviceDuration = useMemo(() => {
    if (!selectedEmployee) return "";
    return calcServiceDuration(selectedEmployee.hireDate, serviceEnd, t);
  }, [selectedEmployee, serviceEnd, t]);

  const handleEmployeeChange = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    setForm((current) => ({
      ...current,
      employeeId,
      hireDate: emp?.hireDate ?? "",
      advancesDeduction: "0",
    }));
  };

  const validateForm = () => {
    if (!selectedEmployee || !form.endReason || !form.terminationDate) {
      toast({ title: t("أكمل الحقول المطلوبة"), description: t("الموظف وسبب إنهاء الخدمة والتاريخ مطلوبة"), variant: "destructive" });
      return false;
    }
    if (selectedEmployee.hireDate && form.terminationDate < selectedEmployee.hireDate) {
      toast({ title: t("تاريخ غير صحيح"), description: t("تاريخ إنهاء الخدمة قبل تاريخ التعيين"), variant: "destructive" });
      return false;
    }
    if (advancesInfo.loading) {
      toast({ title: t("انتظر"), description: t("جارٍ حساب السلف المتبقية على الموظف"), variant: "destructive" });
      return false;
    }
    const advancesDeduction = Number(form.advancesDeduction) || 0;
    if (advancesDeduction < 0 || (advancesInfo.outstanding !== null && advancesDeduction > advancesInfo.outstanding + 0.005)) {
      toast({ title: t("استقطاع السلف غير صحيح"), description: `${t("لا يتجاوز السلف المتبقية على الموظف")}: ${(advancesInfo.outstanding ?? 0).toFixed(2)}`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedEmployee) return;
    setSaving(true);
    try {
      // منع إنهاء خدمة ثانٍ لنفس الموظف ما دام لديه سجل معلق أو معتمد.
      // emp_id يحمل UUID الموظف (الرقم الوظيفي قد يتكرر بين موظفين فلا يُطابق به)
      const existing = await supabase.from("hr_terminations").select("id, status").eq("emp_id", selectedEmployee.id);
      if (existing.error) throw existing.error;
      const openRecord = (existing.data ?? []).find((row: { status?: unknown }) => isOpenTermination(row.status));
      if (openRecord) {
        toast({
          title: t("يوجد إنهاء خدمة سابق"),
          description: `${t("لدى")} ${selectedEmployee.name} ${t("سجل إنهاء خدمة معلق أو معتمد؛ لا يمكن إنشاء سجل ثانٍ")}`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("hr_terminations").insert({
        emp_id: selectedEmployee.id,
        job_id: selectedEmployee.empId,
        emp_name: selectedEmployee.name,
        department: selectedEmployee.department,
        reason: form.endReason,
        end_reason: form.endReason,
        contract_type: form.contractType,
        termination_date: form.terminationDate,
        hire_date: selectedEmployee.hireDate,
        service_duration: serviceDuration,
        reward: computedReward,
        leave_remaining: Number(form.leaveRemaining),
        leave_value: computedLeaveValue,
        other_entitlements: Number(form.otherEntitlements),
        other_deductions: Number(form.otherDeductions),
        // HR-13: يُرسل فقط إن وُجد (قبل تحديث قاعدة البيانات لا يوجد العمود)
        ...((Number(form.advancesDeduction) || 0) > 0 ? { advances_deduction: round2(Number(form.advancesDeduction)) } : {}),
        total: computedTotal,
        notes: form.notes,
        status: "معلق",
      });
      if (error) throw error;
      toast({ title: t("تم حفظ إنهاء الخدمة"), description: `${t("تم تسجيل إنهاء خدمة")} ${selectedEmployee.name}` });
      setForm(emptyForm());
      setShowForm(false);
      setPreviewOpen(false);
      await loadData();
    } catch (error) {
      const duplicate = (error as { code?: string } | null)?.code === "23505";
      toast({
        title: t("تعذر الحفظ"),
        description: duplicate ? t("يوجد إنهاء خدمة مسجل لهذا الموظف") : t(hrRequestErrorText(error)),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) => item.name.includes(search) || item.jobId.includes(search));
  }, [items, search]);

  return (
    <Layout>
      <div className="w-full p-4 space-y-5" dir={direction}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{t("إنهاء خدمة الموظفين")}</h1>
          <Button onClick={() => { setForm(emptyForm()); setShowForm((v) => !v); }} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
            {showForm ? <X className="h-4 w-4 ml-2" /> : <Plus className="h-4 w-4 ml-2" />}
            {showForm ? t("إغلاق") : t("إنهاء خدمة")}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="font-bold text-gray-900">{t("إنهاء خدمة الموظف")}</h2>
              {gratuityWage && (
                <span className="text-sm text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full">
                  {t(gratuityWage.label)}: SAR {gratuityWage.wage.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label={t("الموظف")} required>
                  <select
                    value={form.employeeId}
                    onChange={(event) => handleEmployeeChange(event.target.value)}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">{t("اختر الموظف")}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - {employee.empId}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t("نوع العقد")}>
                  <select
                    value={form.contractType}
                    onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">{t("اختر نوع العقد")}</option>
                    {CONTRACT_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
                  </select>
                </Field>

                <Field label={t("سبب إنهاء الخدمة")} required>
                  <select
                    value={form.endReason}
                    onChange={(event) => setForm((current) => ({ ...current, endReason: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                  >
                    <option value="">{t("اختر السبب")}</option>
                    {reasons.map((item) => <option key={item.reason} value={item.reason}>{t(item.reason)}</option>)}
                  </select>
                </Field>

                <Field label={t("تاريخ التعيين")}>
                  <Input type="date" value={form.hireDate || selectedEmployee?.hireDate || ""} readOnly className="bg-gray-50" />
                </Field>

                <Field label={t("تاريخ إنهاء الخدمة")} required>
                  <Input type="date" value={form.terminationDate} onChange={(event) => setForm((current) => ({ ...current, terminationDate: event.target.value }))} />
                  {serviceDuration && (
                    <p className="text-xs text-gray-500 mt-1">{t("المدة")}: {serviceDuration}</p>
                  )}
                </Field>

                <Field label={t("مكافأة نهاية الخدمة")}>
                  <Input type="number" value={computedReward.toFixed(2)} readOnly className="bg-gray-50 font-medium" placeholder={t("تُحسب تلقائياً")} />
                  {selectedEmployee && form.endReason && (
                    <p className="text-xs text-gray-500 mt-1">{rewardRuleText(yearsOfService, isResignation, deprived, terminationSettings, gratuityWage?.label ?? "الراتب الأساسي", t)}</p>
                  )}
                </Field>

                <Field label={t("رصيد الإجازات السنوية المتبقية")}>
                  <Input type="number" value={form.leaveRemaining} onChange={(event) => setForm((current) => ({ ...current, leaveRemaining: event.target.value }))} min="0" step="0.25" />
                  <p className="text-xs text-gray-400 mt-0.5">{t("يوم")}</p>
                </Field>

                <Field label={t("قيمة الإجازات")}>
                  <Input value={computedLeaveValue.toFixed(2)} readOnly className="bg-gray-50 font-medium" />
                  <p className="text-xs text-gray-400 mt-0.5">{t("= الأجر الإجمالي ÷ 30 × أيام الإجازة")}</p>
                </Field>

                <Field label={t("مستحقات أخرى")}>
                  <Input type="number" value={form.otherEntitlements} onChange={(event) => setForm((current) => ({ ...current, otherEntitlements: event.target.value }))} min="0" step="0.01" />
                </Field>

                <Field label={t("استقطاعات أخرى")}>
                  <Input type="number" value={form.otherDeductions} onChange={(event) => setForm((current) => ({ ...current, otherDeductions: event.target.value }))} min="0" step="0.01" />
                </Field>

                <Field label={t("إجمالي استقطاع السلف")}>
                  <Input type="number" value={form.advancesDeduction} onChange={(event) => setForm((current) => ({ ...current, advancesDeduction: event.target.value }))} min="0" step="0.01" disabled={advancesInfo.loading || Boolean(advancesInfo.noAccess)} />
                  <p className="text-xs text-gray-500 mt-1">
                    {advancesInfo.loading
                      ? t("جارٍ حساب السلف المتبقية…")
                      : advancesInfo.error
                        ? `${t("تعذر قراءة السلف؛ أدخل المبلغ يدويًا")} (${t(advancesInfo.error)})`
                        : advancesInfo.noAccess
                          ? t("استقطاع السلف يسجّله من يدير الرواتب؛ يبقى صفرًا")
                          : advancesInfo.outstanding !== null
                            ? `${t("السلف المتبقية على الموظف")}: ${advancesInfo.outstanding.toFixed(2)} SAR`
                            : ""}
                  </p>
                </Field>

                <Field label={t("الإجمالي")}>
                  <div className="flex items-center gap-3">
                    <Input value={computedTotal.toFixed(2)} readOnly className="bg-gray-50 font-bold text-[#004e89]" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{t("= المكافأة + قيمة الإجازات + المستحقات − الاستقطاعات − السلف")}</span>
                  </div>
                </Field>

                <div className="md:col-span-2">
                  <Field label={t("ملاحظات")}>
                    <textarea
                      value={form.notes}
                      onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      className="w-full resize-y rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004e89]"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label={t("المرفق")}>
                    <div aria-disabled="true" className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                      <FileText className="h-4 w-4" />
                      <span>{t("إرفاق الملفات غير متاح حاليًا")}</span>
                    </div>
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <Button variant="outline" onClick={() => setPreviewOpen(true)}>{t("معاينة")}</Button>
                <Button onClick={handleSave} disabled={saving || !settingsReady} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {saving ? t("جاري الحفظ...") : t("حفظ")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100 p-4">
            <h2 className="font-bold text-gray-900">{t("سجل إنهاءات الخدمة")} ({filtered.length})</h2>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("بحث بالاسم أو الرقم الوظيفي")} className="pr-9" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4">{t("الرقم الوظيفي")}</th>
                  <th className="py-3 px-4">{t("الاسم")}</th>
                  <th className="py-3 px-4">{t("الإدارة")}</th>
                  <th className="py-3 px-4">{t("سبب الإنهاء")}</th>
                  <th className="py-3 px-4">{t("تاريخ الإنهاء")}</th>
                  <th className="py-3 px-4">{t("مكافأة نهاية الخدمة")}</th>
                  <th className="py-3 px-4">{t("قيمة الإجازات")}</th>
                  <th className="py-3 px-4">{t("استقطاع السلف")}</th>
                  <th className="py-3 px-4">{t("الإجمالي")}</th>
                  <th className="py-3 px-4 text-center">{t("الحالة")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="py-10 text-center text-gray-400">{t("جاري التحميل...")}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="py-10 text-center text-gray-500"><FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />{t("لا توجد بيانات")}</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{row.jobId || "—"}</td>
                    <td className="py-3 px-4 font-medium">{row.name}</td>
                    <td className="py-3 px-4">{row.department || "—"}</td>
                    <td className="py-3 px-4">{t(row.reason) || "—"}</td>
                    <td className="py-3 px-4">{row.terminationDate || "—"}</td>
                    <td className="py-3 px-4">{row.reward.toFixed(2)}</td>
                    <td className="py-3 px-4">{row.leaveValue.toFixed(2)}</td>
                    <td className="py-3 px-4">{row.advancesDeduction ? row.advancesDeduction.toFixed(2) : "—"}</td>
                    <td className="py-3 px-4 font-semibold text-[#004e89]">{row.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.status === "موافق عليه" ? "bg-emerald-100 text-emerald-800" :
                        row.status === "مرفوض" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>{t(row.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir={direction}>
            <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h3 className="text-xl font-bold text-gray-900">{t("معاينة إنهاء الخدمة")}</h3>
                <button type="button" onClick={() => setPreviewOpen(false)} className="text-gray-500 hover:text-gray-900" title={t("إغلاق")} aria-label={t("إغلاق")}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <h4 className="text-center text-2xl font-bold text-[#004e89]">{t("إنهاء خدمة الموظف")}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <PreviewItem label={t("الموظف")} value={selectedEmployee?.name || "—"} />
                  <PreviewItem label={t("الرقم الوظيفي")} value={selectedEmployee?.empId || "—"} />
                  <PreviewItem label={t("الإدارة")} value={selectedEmployee?.department || "—"} />
                  <PreviewItem label={t("نوع العقد")} value={form.contractType ? t(form.contractType) : "—"} />
                  <PreviewItem label={t("سبب الإنهاء")} value={form.endReason ? t(form.endReason) : "—"} />
                  <PreviewItem label={t("تاريخ التعيين")} value={selectedEmployee?.hireDate || "—"} />
                  <PreviewItem label={t("تاريخ إنهاء الخدمة")} value={form.terminationDate} />
                  <PreviewItem label={t("مدة الخدمة")} value={serviceDuration || "—"} />
                  <PreviewItem label={t("مكافأة نهاية الخدمة")} value={`${computedReward.toFixed(2)} SAR`} />
                  <PreviewItem label={t("قيمة الإجازات")} value={`${computedLeaveValue.toFixed(2)} SAR`} />
                  <PreviewItem label={t("مستحقات أخرى")} value={`${Number(form.otherEntitlements).toFixed(2)} SAR`} />
                  <PreviewItem label={t("استقطاعات أخرى")} value={`${Number(form.otherDeductions).toFixed(2)} SAR`} />
                  <PreviewItem label={t("إجمالي استقطاع السلف")} value={`${(Number(form.advancesDeduction) || 0).toFixed(2)} SAR`} />
                  <PreviewItem label={t("الإجمالي")} value={`${computedTotal.toFixed(2)} SAR`} />
                </div>
                {form.notes && <p className="text-sm text-gray-600 border-t pt-3"><span className="font-medium">{t("ملاحظات")}:</span> {form.notes}</p>}
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>{t("رجوع")}</Button>
                <Button onClick={handleSave} disabled={saving || !settingsReady} className="bg-[#004e89] hover:bg-[#003d6d] text-white">
                  {saving ? t("جاري الحفظ...") : t("حفظ")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
    </label>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs text-gray-500 mb-0.5">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
