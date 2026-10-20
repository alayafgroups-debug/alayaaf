import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowRight, CheckCircle2, Plus, RefreshCw, Trash2, Wallet, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { fetchAllRows } from "@/lib/fetchAll";
import { hrRequestErrorText } from "@/lib/hrErrors";
import { employeeErrorText } from "@/components/hr/employeeErrors";
import { isApprovedStatus, isRejectedStatus } from "@/lib/hrStatus";
import { advanceStartMonth, allocateAdvanceRepayments, isCancelledPayrollStatus, parseApprovedAdvance, type AdvanceRecord } from "@/lib/advances";
import { isEmployeeActive } from "@/lib/employeeStatus";
import { addDays, monthRange, riyadhMonth, riyadhToday } from "@/lib/hrDates";
import { canManagePerm, readUserSession } from "@/lib/authSession";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useI18n } from "@/i18n";

/**
 * الحركات المالية للموظف (تُفتح بالضغط على اسمه في قائمة الموظفين): البدلات والاقتطاعات والسلف والجزاءات في صفحة واحدة.
 * - البدلات: بنود employees.allowances نفسها التي في ملف الموظف، ويقرؤها مسير الرواتب لكل شهر يقع ضمن فترتها (بالشهر كاملًا).
 *   تعديلها يتطلب إدارة الموظفين والرواتب، ولا يعدّل أحد بنود نفسه (قاعدة البيانات تفرض ذلك).
 * - الاقتطاعات: للعرض فقط (بنود «البدل المخصوم» في ملف الموظف). البند المخصوم ينقص الراتب الإجمالي المحفوظ للموظف،
 *   وعليه يُحسب أجر الساعة الإضافية ومستحقات نهاية الخدمة، فلا يُضاف من هنا حتى يُعدَّل ذلك في حساب الرواتب.
 * - السلف: كصفحة سلف الموظفين تمامًا: تُسجَّل معلقة ويعتمدها مسؤول رواتب آخر (decide_advance)، ويُخصم قسطها من شهر البداية.
 * - الجزاءات: تُسجَّل معلقة ويعتمدها مسؤول جزاءات آخر (HR-12)، ويخصمها مسير الرواتب بحد المادة 72.
 */
type Tab = "allowances" | "deductions" | "advances" | "penalties";
type RawAllowance = Record<string, unknown>;
/** بند من employees.allowances: index موضعه في المصفوفة كاملة، وrawJson نصه كما هو لمطابقة البنود القديمة بلا معرّف */
type AllowanceRow = { index: number; id: string; hasId: boolean; rawJson: string; type: string; amount: number; from: string; to: string; deduction: boolean };
type Employee = {
  id: string;
  empId: string;
  name: string;
  department: string;
  directorate: string;
  jobTitle: string;
  directManager: string;
  workSchedule: string;
  status: string;
  baseSalary: number;
  totalSalary: number;
  allowances: RawAllowance[];
};
type Advance = {
  id: string;
  amount: number;
  installment: number;
  startMonth: string;
  status: string;
  notes: string;
  createdById: string;
  createdBy: string;
  decidedBy: string;
  decisionNote: string;
  createdAt: string;
  repaid: number;
  remaining: number;
};
type Penalty = {
  id: string;
  type: string;
  reason: string;
  amount: number;
  date: string;
  status: string;
  createdById: string;
  createdBy: string;
  decidedBy: string;
  decisionNote: string;
};
type ItemDraft = { type: string; amount: string; from: string; to: string };
type AdvanceDraft = { amount: string; installment: string; startMonth: string; notes: string };
type PenaltyDraft = { type: string; amount: string; date: string; reason: string };

const TABS: { key: Tab; label: string }[] = [
  { key: "allowances", label: "البدلات" },
  { key: "deductions", label: "الاقتطاعات" },
  { key: "advances", label: "السلف" },
  { key: "penalties", label: "الجزاءات" },
];
const ALLOWANCE_TYPES = ["بدل السكن", "بدل النقل", "بدل الأطفال", "بدل الطعام", "بدل الهاتف", "بدل اللباس", "أخرى"];
const DEDUCTION_EFFECT = "مخصوم";
const ADDITION_EFFECT = "مضاف";
// رواتب الشهر المقفلة: لا تتغير بعد إضافة بند
const LOCKED_PAYROLL_STATUSES = ["معتمد", "مرحّل", "مدفوع", "موقوف الصرف"];
const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const nextMonth = (month: string) => {
  const [year, mon] = month.split("-").map(Number);
  return mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
};
const monthsBetween = (from: string, to: string) => {
  const months: string[] = [];
  for (let month = from; month <= to && months.length < 240; month = nextMonth(month)) months.push(month);
  return months;
};
const missingRpc = (error: unknown) => ["PGRST202", "42883"].includes(String((error as { code?: string } | null)?.code ?? ""));
const isPendingStatus = (status: string) => !isApprovedStatus(status) && !isRejectedStatus(status);
const text = (value: unknown) => String(value ?? "").trim();

const toAllowanceRows = (items: RawAllowance[]): AllowanceRow[] =>
  items.map((item, index) => ({
    index,
    id: text(item.id),
    hasId: Boolean(text(item.id)),
    rawJson: JSON.stringify(item),
    type: text(item.type),
    amount: round2(Number(item.amount ?? item.value ?? 0) || 0),
    from: text(item.from).slice(0, 10),
    to: text(item.to).slice(0, 10),
    deduction: text(item.effect) === DEDUCTION_EFFECT,
  }));

/**
 * موضع البند نفسه في القائمة المقروءة لحظة الحفظ: يطابق نصه كاملًا (ومعرّفه إن كان له).
 * إن تغيّر البند بعد فتح الصفحة (عُدّل من ملف الموظف مثلًا) يُرفض الحفظ بدل تعديل بند آخر أو نسخة أحدث منه.
 */
const findItemIndex = (items: RawAllowance[], row: AllowanceRow): number | "changed" => {
  const same = (item: RawAllowance | undefined) => Boolean(item) && JSON.stringify(item) === row.rawJson && (!row.hasId || text(item?.id) === row.id);
  if (same(items[row.index])) return row.index;
  const index = items.findIndex((item) => same(item));
  if (index >= 0) return index;
  return row.hasId && items.some((item) => text(item.id) === row.id) ? "changed" : -1;
};

const newItemId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}-${Math.round(Math.random() * 1e6)}`);

/** صفحة جديدة لكل موظف (key): الانتقال بين صفحتي موظفين لا يُبقي بيانات الأول ولا عملياته الجارية */
export default function HREmployeeFinance() {
  const { id = "" } = useParams();
  return <EmployeeFinancePage key={id} id={id} />;
}

function EmployeeFinancePage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { t, direction, formatNumber } = useI18n();
  const { permissions } = useRolePermissions();
  // تعديل البدلات يتطلب الصلاحيتين معًا (كما تفرض قاعدة البيانات على ملف الموظف)
  const canEditPay = canManagePerm(permissions, "hr.payroll", "module.hr") && canManagePerm(permissions, "hr.employees", "module.hr");
  const canAdvances = canManagePerm(permissions, "hr.payroll.advances", "hr.payroll", "module.hr");
  const canPenalties = canManagePerm(permissions, "hr.penalties", "module.hr");
  const session = readUserSession() as { empId?: unknown; name?: unknown } | null;
  const ownEmpId = text(session?.empId);
  const ownName = text(session?.name);

  const [tab, setTab] = useState<Tab>("allowances");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [advanceError, setAdvanceError] = useState("");
  const [penaltyError, setPenaltyError] = useState("");
  const [allowanceTypes, setAllowanceTypes] = useState<string[]>(ALLOWANCE_TYPES);
  const [penaltyTypes, setPenaltyTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [advanceDraft, setAdvanceDraft] = useState<AdvanceDraft | null>(null);
  const [penaltyDraft, setPenaltyDraft] = useState<PenaltyDraft | null>(null);
  // من سجّل السلفة أو الجزاء لا يعتمده (إلا مدير النظام): تُخفى أزرار القرار عنه
  const [myUid, setMyUid] = useState("");
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const loadSeq = useRef(0);

  const money = (value: number) => `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("ر.س")}`;
  // التواريخ ميلادية كما تُدخل (YYYY-MM-DD) حتى لا تختلط بالهجري في الواجهة العربية
  const dateText = (value: string) => value || "—";
  const isOwn = Boolean(employee && ownEmpId && employee.empId === ownEmpId && (!ownName || employee.name === ownName));
  const canDecideOn = (createdById: string) => sessionReady && !(createdById && createdById === myUid && !isMainAdmin);
  const listSeparator = direction === "rtl" ? "، " : ", ";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: sessionData }, adminResult] = await Promise.all([
        supabase.auth.getSession(),
        supabase.rpc("is_main_system_admin"),
      ]);
      if (cancelled) return;
      setMyUid(text(sessionData.session?.user?.id));
      setIsMainAdmin(!adminResult.error && adminResult.data === true);
      setSessionReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // keepError: إعادة التحميل بعد عملية فشلت تُبقي رسالة الخطأ ظاهرة
  const load = async (keepError = false) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    if (!keepError) setError("");
    try {
      const { data: row, error: employeeError } = await supabase.from("employees").select("*").eq("id", id).maybeSingle();
      if (employeeError) throw employeeError;
      if (seq !== loadSeq.current) return;
      if (!row) {
        setEmployee(null);
        setError(t("الموظف غير موجود أو لا تملك صلاحية عرضه"));
        return;
      }
      const record = row as Record<string, unknown>;
      const loaded: Employee = {
        id: text(record.id),
        empId: text(record.emp_id),
        name: text(record.name) || text(record.first_name),
        department: text(record.department),
        directorate: text(record.directorate),
        jobTitle: text(record.job_title),
        directManager: text(record.direct_manager),
        workSchedule: text(record.work_schedule),
        status: text(record.status),
        baseSalary: Number(record.base_salary) || 0,
        totalSalary: Number(record.total_salary) || 0,
        allowances: Array.isArray(record.allowances) ? (record.allowances as RawAllowance[]).filter((item) => item && typeof item === "object") : [],
      };

      const [advanceResult, penaltyResult, configResult, decisionResult, payrollResult] = await Promise.all([
        supabase.from("hr_advances").select("*").eq("employee_id", loaded.id),
        supabase.from("penalties").select("*").eq("employee_id", loaded.id).order("date", { ascending: false }),
        supabase.from("hr_config_items").select("config_type, name_ar, status").eq("config_type", "allowance"),
        supabase.from("penalty_decisions").select("name_ar, status"),
        // أقساط السلف المخصومة في كشوف رواتبه (عدا الملغاة): المسدَّد من كل سلفة بالدالة نفسها في مسير الرواتب
        loaded.empId
          ? fetchAllRows<Record<string, unknown>>((from, to) => supabase.from("payroll").select("id, emp_id, month, status, advance_deduction").eq("emp_id", loaded.empId).gt("advance_deduction", 0).order("month").order("id").range(from, to))
            .then((data) => ({ data, error: null as unknown }), (payrollError: unknown) => ({ data: [] as Record<string, unknown>[], error: payrollError }))
          : Promise.resolve({ data: [] as Record<string, unknown>[], error: null as unknown }),
      ]);
      if (seq !== loadSeq.current) return;

      if (advanceResult.error) {
        setAdvances([]);
        setAdvanceError(hrRequestErrorText(advanceResult.error, t("تعذر تحميل السلف")));
      } else {
        const deductionsByMonth = new Map<string, number>();
        (payrollResult.data ?? []).forEach((payrollRow) => {
          if (isCancelledPayrollStatus(payrollRow.status)) return;
          const month = String(payrollRow.month ?? "").slice(0, 7);
          deductionsByMonth.set(month, round2((deductionsByMonth.get(month) ?? 0) + (Number(payrollRow.advance_deduction) || 0)));
        });
        const advanceRows = (advanceResult.data ?? []) as Record<string, unknown>[];
        const records = advanceRows.map((advanceRow) => parseApprovedAdvance(advanceRow)).filter((item): item is AdvanceRecord => Boolean(item));
        const repaidById = allocateAdvanceRepayments(records, deductionsByMonth);
        setAdvances(advanceRows.map((advanceRow) => {
          const status = text(advanceRow.status) || "معلق";
          const amount = round2(Number(advanceRow.amount ?? advanceRow.remaining_amount) || 0);
          const repaid = isApprovedStatus(status) ? round2(repaidById.get(text(advanceRow.id)) ?? 0) : 0;
          return {
            id: text(advanceRow.id),
            amount,
            installment: round2(Number(advanceRow.monthly_installment) || 0),
            startMonth: advanceStartMonth(advanceRow),
            status,
            notes: text(advanceRow.notes ?? advanceRow.reason),
            createdById: text(advanceRow.created_by),
            createdBy: text(advanceRow.created_by_name),
            decidedBy: text(advanceRow.decided_by_name),
            decisionNote: text(advanceRow.decision_note),
            createdAt: text(advanceRow.created_at),
            repaid,
            remaining: isRejectedStatus(status) ? 0 : round2(Math.max(0, amount - repaid)),
          };
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setAdvanceError(payrollResult.error ? t("تعذر قراءة الأقساط المخصومة من الرواتب؛ المتبقي تقريبي") : "");
      }

      if (penaltyResult.error) {
        setPenalties([]);
        setPenaltyError(hrRequestErrorText(penaltyResult.error, t("تعذر تحميل الجزاءات")));
      } else {
        setPenalties(((penaltyResult.data ?? []) as Record<string, unknown>[]).map((penaltyRow) => ({
          id: text(penaltyRow.id),
          type: text(penaltyRow.penalty_type),
          reason: text(penaltyRow.reason),
          amount: round2(Number(penaltyRow.amount) || 0),
          date: text(penaltyRow.date).slice(0, 10),
          status: text(penaltyRow.status) || "معلق",
          createdById: text(penaltyRow.created_by),
          createdBy: text(penaltyRow.created_by_name),
          decidedBy: text(penaltyRow.decided_by_name),
          decisionNote: text(penaltyRow.decision_note),
        })));
        setPenaltyError("");
      }

      // أنواع البدلات من «الإعدادات المالية» إن وُجدت، مع الأنواع الأساسية في ملف الموظف
      if (!configResult.error) {
        const names = ((configResult.data ?? []) as Record<string, unknown>[])
          .filter((item) => !text(item.status) || text(item.status) === "فعال")
          .map((item) => text(item.name_ar)).filter(Boolean);
        setAllowanceTypes([...new Set([...ALLOWANCE_TYPES, ...names])]);
      }
      if (!decisionResult.error) {
        setPenaltyTypes([...new Set(((decisionResult.data ?? []) as Record<string, unknown>[])
          .filter((item) => !text(item.status) || text(item.status) === "فعال")
          .map((item) => text(item.name_ar)).filter(Boolean))]);
      }
      setEmployee(loaded);
    } catch (loadError) {
      if (seq !== loadSeq.current) return;
      setError(employeeErrorText(loadError, t("تعذر تحميل بيانات الموظف")));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allowanceRows = useMemo(() => toAllowanceRows(employee?.allowances ?? []), [employee]);
  // للعرض؛ العمليات تحسب اليوم والشهر لحظة التنفيذ (صفحة مفتوحة عبر بداية شهر جديد)
  const today = riyadhToday();
  const currentMonthEnd = monthRange(riyadhMonth()).to;
  const itemState = (row: AllowanceRow) => {
    if (row.to && row.to < today) return { label: "منتهي", className: "bg-slate-100 text-slate-600" };
    if (row.from && row.from > today) return { label: "لم يبدأ", className: "bg-sky-50 text-sky-700" };
    return { label: "ساري", className: "bg-emerald-50 text-emerald-700" };
  };
  const wage = employee ? (employee.totalSalary > 0 ? employee.totalSalary : employee.baseSalary) : 0;

  /** تنفيذ عملية: النتيجة الناجحة رسالة، وأي فشل (ومنه «لم يتغير شيء») خطأ */
  const run = async (action: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage(await action());
      await load();
    } catch (actionError) {
      // رموز قاعدة البيانات (PENALTY_... وADVANCE_...) تُترجم لرسائلها، والرسائل الجاهزة تُعرض كما هي
      setError(hrRequestErrorText(actionError, t("تعذر الحفظ")));
      // البيانات ربما تغيّرت (قرار صدر من غيرك مثلًا): تُحدَّث الصفحة ولا يُمسح الخطأ
      await load(true).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  // ─── البدلات: تُقرأ البنود من قاعدة البيانات لحظة الحفظ فلا يُمحى تعديل حدث بعد فتح الصفحة ───
  const writeAllowances = async (change: (items: RawAllowance[]) => RawAllowance[] | null | "changed") => {
    const { data: fresh, error: readError } = await supabase.from("employees").select("allowances").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!fresh) throw new Error(t("الموظف غير موجود أو لا تملك صلاحية عرضه"));
    const stored = fresh.allowances;
    if (stored !== null && stored !== undefined && !Array.isArray(stored)) {
      throw new Error(t("بنود البدلات في ملف الموظف بصيغة غير متوقعة؛ عدّلها من ملف الموظف"));
    }
    const next = change(Array.isArray(stored) ? (stored as RawAllowance[]) : []);
    if (next === "changed") throw new Error(t("تغيّر البند بعد فتح الصفحة؛ حدّث الصفحة"));
    if (!next) throw new Error(t("لم يُعثر على البند؛ حدّث الصفحة"));
    const { data: saved, error: saveError } = await supabase.from("employees").update({ allowances: next }).eq("id", id).select("id");
    if (saveError) throw new Error(t(employeeErrorText(saveError)));
    if (!(saved ?? []).length) throw new Error(t("لم يُحفظ شيء: لا تملك صلاحية تعديل رواتب هذا الموظف"));
  };

  // أشهر الفترة التي رواتبها معتمدة أو مرحّلة للموظف: البند لا يغيّرها
  const lockedMonthsIn = async (fromMonth: string, toMonth: string) => {
    if (!employee?.empId) return [] as string[];
    const { data, error: lockError } = await supabase.from("payroll").select("month, status, accounting_status").eq("emp_id", employee.empId).gte("month", fromMonth).lte("month", toMonth);
    if (lockError) throw lockError;
    return [...new Set(((data ?? []) as Record<string, unknown>[])
      .filter((payrollRow) => LOCKED_PAYROLL_STATUSES.includes(text(payrollRow.status)) || text(payrollRow.accounting_status) === "posted")
      .map((payrollRow) => text(payrollRow.month).slice(0, 7)))].sort();
  };

  const saveAllowance = () => run(async () => {
    if (!itemDraft) return "";
    const amount = round2(Number(itemDraft.amount));
    const type = itemDraft.type.trim();
    if (!type) throw new Error(t("اختر نوع البدل"));
    if (!(amount > 0)) throw new Error(t("أدخل مبلغًا أكبر من صفر"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(itemDraft.from)) throw new Error(t("حدد تاريخ بداية البدل"));
    if (itemDraft.to && itemDraft.from > itemDraft.to) throw new Error(t("تاريخ البداية يجب أن يسبق تاريخ النهاية"));
    const fromMonth = itemDraft.from.slice(0, 7);
    const toMonth = itemDraft.to ? itemDraft.to.slice(0, 7) : "9999-12";
    const locked = await lockedMonthsIn(fromMonth, toMonth);
    if (itemDraft.to && monthsBetween(fromMonth, toMonth).every((month) => locked.includes(month))) {
      throw new Error(t("كل أشهر الفترة رواتبها معتمدة أو مرحّلة؛ لن يُصرف البدل فيها. اختر فترة تبدأ في شهر مفتوح"));
    }
    if (locked.length && !window.confirm(`${t("رواتب هذه الأشهر معتمدة أو مرحّلة، ولن يُصرف البدل فيها")}: ${locked.join(listSeparator)}. ${t("حفظ البدل للأشهر الباقية؟")}`)) return "";
    await writeAllowances((items) => [...items, {
      id: newItemId(),
      type,
      amount,
      from: itemDraft.from,
      to: itemDraft.to,
      effect: ADDITION_EFFECT,
    }]);
    setItemDraft(null);
    return locked.length
      ? `${t("أُضيف البدل")}${listSeparator}${t("ولن يُصرف في الأشهر المعتمدة رواتبها")}: ${locked.join(listSeparator)}`
      : t("أُضيف البدل");
  });

  const stopItem = (row: AllowanceRow) => {
    // مسير الرواتب يحسب البند بالشهر كاملًا: يُصرف هذا الشهر ويتوقف من الشهر القادم
    if (!window.confirm(t("إيقاف البدل بعد هذا الشهر؟ يُصرف في راتب هذا الشهر كاملًا ويتوقف من الشهر القادم، وتبقى الأشهر السابقة كما هي"))) return;
    void run(async () => {
      const monthEnd = monthRange(riyadhMonth()).to;
      if ((row.to && row.to <= monthEnd) || (row.from && row.from > monthEnd)) throw new Error(t("البند ينتهي هذا الشهر أو قبله، أو لم يبدأ بعد؛ لا يُوقف"));
      await writeAllowances((items) => {
        const index = findItemIndex(items, row);
        if (index === "changed") return "changed";
        if (index < 0) return null;
        return items.map((item, position) => (position === index ? { ...item, to: monthEnd } : item));
      });
      return t("يتوقف البدل بعد هذا الشهر");
    });
  };

  const removeItem = (row: AllowanceRow) => {
    if (!window.confirm(t("حذف البند نهائيًا؟ يتغير حساب كل الأشهر التي لم تُعتمد رواتبها. لإيقافه من الشهر القادم فقط استخدم «إيقاف»"))) return;
    void run(async () => {
      await writeAllowances((items) => {
        const index = findItemIndex(items, row);
        if (index === "changed") return "changed";
        if (index < 0) return null;
        return items.filter((_, position) => position !== index);
      });
      return t("حُذف البند");
    });
  };

  // ─── السلف ───
  const advanceAmount = Number(advanceDraft?.amount);
  const advanceInstallment = Number(advanceDraft?.installment);
  const advanceMonths = advanceAmount > 0 && advanceInstallment > 0 ? Math.ceil(round2(advanceAmount / advanceInstallment)) : 0;
  const overTenPercent = Boolean(advanceDraft && wage > 0 && advanceInstallment > wage * 0.1);

  const saveAdvance = () => run(async () => {
    if (!advanceDraft || !employee) return "";
    const amount = round2(Number(advanceDraft.amount));
    const installment = round2(Number(advanceDraft.installment));
    if (!(amount > 0)) throw new Error(t("أدخل مبلغ السلفة"));
    if (!(installment > 0) || installment > amount) throw new Error(t("القسط الشهري يجب أن يكون أكبر من صفر ولا يتجاوز مبلغ السلفة"));
    if (!/^\d{4}-\d{2}$/.test(advanceDraft.startMonth) || advanceDraft.startMonth < riyadhMonth()) throw new Error(t("شهر بداية الخصم يجب ألا يسبق الشهر الحالي"));
    const { error: insertError } = await supabase.from("hr_advances").insert({
      employee_id: employee.id,
      emp_name: employee.name,
      amount,
      remaining_amount: amount,
      monthly_installment: installment,
      start_month: advanceDraft.startMonth,
      request_date: today,
      status: "معلق",
      notes: advanceDraft.notes.trim() || null,
    });
    if (insertError) throw insertError;
    setAdvanceDraft(null);
    return t("سُجّلت السلفة بانتظار اعتماد مسؤول رواتب آخر");
  });

  const decideAdvance = (advance: Advance, decision: "معتمد" | "مرفوض") => {
    if (decision === "مرفوض" && !decisionNote.trim()) { setError(t("اكتب سبب الرفض في خانة ملاحظة القرار")); setMessage(""); return; }
    void run(async () => {
      const { data, error: rpcError } = await supabase.rpc("decide_advance", { p_id: advance.id, p_decision: decision, p_note: decisionNote.trim() || null });
      if (rpcError) {
        if (missingRpc(rpcError)) throw new Error(t("اعتماد السلف يتطلب تحديث قاعدة البيانات (HR-7)؛ لم يُعتمد شيء"));
        throw rpcError;
      }
      if (!(Number((data as { updated?: number } | null)?.updated) || 0)) throw new Error(t("لم يتغير شيء: صدر قرار في السلفة مسبقًا"));
      setDecisionNote("");
      return t(decision === "معتمد" ? "اعتُمدت السلفة؛ يُخصم قسطها من شهر البداية" : "رُفضت السلفة");
    });
  };

  const removeAdvance = (advance: Advance) => {
    if (!window.confirm(t("حذف السلفة المعلقة؟"))) return;
    void run(async () => {
      const { data, error: deleteError } = await supabase.from("hr_advances").delete().eq("id", advance.id).eq("status", "معلق").select("id");
      if (deleteError) throw deleteError;
      if (!(data ?? []).length) throw new Error(t("لم يُحذف شيء: لا تملك صلاحية الحذف أو صدر قرار في السلفة"));
      return t("حُذفت السلفة");
    });
  };

  // ─── الجزاءات ───
  const fiveDaysWage = round2((wage / 30) * 5);
  const penaltyOverFiveDays = Boolean(penaltyDraft && fiveDaysWage > 0 && Number(penaltyDraft.amount) > fiveDaysWage);

  const savePenalty = () => run(async () => {
    if (!penaltyDraft || !employee) return "";
    const amount = round2(Number(penaltyDraft.amount));
    if (!(amount > 0)) throw new Error(t("أدخل مبلغًا أكبر من صفر"));
    if (!penaltyDraft.date || penaltyDraft.date > today) throw new Error(t("تاريخ الجزاء اليوم أو قبله"));
    if (!penaltyDraft.reason.trim()) throw new Error(t("اكتب المخالفة (سبب الجزاء)"));
    const { error: insertError } = await supabase.from("penalties").insert({
      employee_id: employee.id,
      emp_name: employee.name,
      penalty_type: penaltyDraft.type.trim() || null,
      amount,
      reason: penaltyDraft.reason.trim(),
      date: penaltyDraft.date,
      status: "معلق",
    });
    if (insertError) throw insertError;
    setPenaltyDraft(null);
    return t("سُجّل الجزاء بانتظار اعتماد مسؤول جزاءات آخر");
  });

  const decidePenalty = (penalty: Penalty, decision: "معتمد" | "مرفوض") => {
    if (decision === "مرفوض" && !decisionNote.trim()) { setError(t("اكتب سبب الرفض في خانة ملاحظة القرار")); setMessage(""); return; }
    // المادة 71: مهلة الاتهام بالمخالفة وتوقيع الجزاء 30 يومًا
    if (decision === "معتمد" && penalty.date && penalty.date < addDays(today, -30)
        && !window.confirm(t("تاريخ المخالفة قبل أكثر من 30 يومًا: راجع المادة 71 من نظام العمل (مهلة الاتهام وتوقيع الجزاء) قبل الاعتماد. اعتماد الجزاء؟"))) return;
    void run(async () => {
      const { data, error: updateError } = await supabase.from("penalties")
        .update({ status: decision, decision_note: decisionNote.trim() || null })
        .eq("id", penalty.id)
        .select("id, status");
      if (updateError) throw updateError;
      if (!(data ?? []).length) throw new Error(t("لم يتغير شيء: لا تملك صلاحية القرار في الجزاءات"));
      setDecisionNote("");
      return t(decision === "معتمد" ? "اعتُمد الجزاء؛ يُخصم في مسير الرواتب بحد المادة 72" : "رُفض الجزاء");
    });
  };

  const removePenalty = (penalty: Penalty) => {
    if (!window.confirm(t(isApprovedStatus(penalty.status) ? "حذف جزاء معتمد؟ يحذفه مدير النظام فقط، ويُرفض إن كانت رواتب شهره أو ما بعده معتمدة أو مرحّلة" : "حذف الجزاء؟"))) return;
    void run(async () => {
      const { data, error: deleteError } = await supabase.from("penalties").delete().eq("id", penalty.id).select("id");
      if (deleteError) throw deleteError;
      if (!(data ?? []).length) throw new Error(t("لم يُحذف شيء: لا تملك صلاحية حذف الجزاءات"));
      return t("حُذف الجزاء");
    });
  };

  const statusBadge = (status: string) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isApprovedStatus(status) ? "bg-emerald-50 text-emerald-700" : isRejectedStatus(status) ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
      {t(isApprovedStatus(status) ? "معتمد" : isRejectedStatus(status) ? "مرفوض" : "بانتظار الاعتماد")}
    </span>
  );
  const fieldClass = "w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none";
  const labelClass = "space-y-1 text-xs font-medium text-slate-600";

  const renderItems = (deduction: boolean) => {
    const rows = allowanceRows.filter((row) => row.deduction === deduction);
    // الاقتطاعات للعرض فقط (انظر أعلى الملف)
    const canEdit = !deduction && canEditPay && !isOwn;
    return (
      <div className="space-y-3">
        {deduction ? (
          <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">
            {t("للعرض فقط: هذه بنود «البدل المخصوم» المسجلة في ملف الموظف، ويخصمها مسير الرواتب من راتب كل شهر يقع ضمن فترتها. إضافة اقتطاع من هذه الصفحة تحتاج تعديلًا في حساب الرواتب، لأن البند المخصوم ينقص «الراتب الإجمالي» الذي يُحسب عليه أجر الساعة الإضافية ومستحقات نهاية الخدمة.")}
          </p>
        ) : (
          <p className="text-xs text-slate-500">{t("البدل يُضاف لراتب كل شهر يقع ضمن فترته، بالشهر كاملًا (بلا نهاية = مستمر). هو نفسه بدلات ملف الموظف.")}</p>
        )}
        {canEdit && !itemDraft && (
          <button
            type="button"
            data-readonly-exempt
            onClick={() => setItemDraft({ type: "", amount: "", from: today, to: "" })}
            className="flex items-center gap-1 rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#003d6b]"
          >
            <Plus className="h-4 w-4" />{t("إضافة بدل")}
          </button>
        )}
        {canEdit && itemDraft && (
          <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className={labelClass}>
              <span className="block">{t("نوع البدل")}</span>
              <input list="allowance-types" value={itemDraft.type} onChange={(event) => setItemDraft({ ...itemDraft, type: event.target.value })} className={fieldClass} />
              <datalist id="allowance-types">{allowanceTypes.map((type) => <option key={type} value={type} />)}</datalist>
            </label>
            <label className={labelClass}>
              <span className="block">{t("المبلغ الشهري")}</span>
              <input type="number" min="0" step="0.01" value={itemDraft.amount} onChange={(event) => setItemDraft({ ...itemDraft, amount: event.target.value })} className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className="block">{t("من")}</span>
              <input type="date" value={itemDraft.from} onChange={(event) => setItemDraft({ ...itemDraft, from: event.target.value })} className={fieldClass} />
            </label>
            <label className={labelClass}>
              <span className="block">{t("إلى (اختياري)")}</span>
              <input type="date" value={itemDraft.to} onChange={(event) => setItemDraft({ ...itemDraft, to: event.target.value })} className={fieldClass} />
            </label>
            <div className="flex items-end gap-2">
              <button type="button" data-readonly-exempt disabled={busy} onClick={() => void saveAllowance()} className="rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{t("حفظ")}</button>
              <button type="button" data-readonly-exempt disabled={busy} onClick={() => setItemDraft(null)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">{t("إلغاء")}</button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-[#075f94] text-white">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t(deduction ? "نوع الاقتطاع" : "نوع البدل")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المبلغ الشهري")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("من")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("إلى")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("الحالة")}</th>
                {canEdit && <th className="px-3 py-2 text-center font-medium">{t("الإجراءات")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5} className="py-6 text-center text-gray-400">{t(deduction ? "لا توجد اقتطاعات" : "لا توجد بدلات")}</td></tr>
              ) : rows.map((row) => {
                const state = itemState(row);
                return (
                  <tr key={`${row.index}-${row.id}`} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 font-medium">{row.type ? t(row.type) : "—"}</td>
                    <td className={`px-3 py-2 ${deduction ? "text-rose-700" : "text-emerald-700"}`}>{deduction ? "−" : "+"}{money(row.amount)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{dateText(row.from)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{row.to ? dateText(row.to) : t("مستمر")}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state.className}`}>{t(state.label)}</span></td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          {(!row.from || row.from <= today) && (!row.to || row.to > currentMonthEnd) && (
                            <button type="button" data-readonly-exempt disabled={busy} onClick={() => stopItem(row)} className="rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50">{t("إيقاف بعد هذا الشهر")}</button>
                          )}
                          <button type="button" data-readonly-exempt disabled={busy} onClick={() => removeItem(row)} className="text-rose-600 hover:text-rose-800 disabled:opacity-50" title={t("حذف")}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!deduction && !canEditPay && <p className="text-xs text-slate-500">{t("تعديل البدلات يتطلب صلاحية إدارة الموظفين والرواتب")}</p>}
      </div>
    );
  };

  const renderAdvances = () => {
    const canAdd = canAdvances && !isOwn && Boolean(employee && isEmployeeActive(employee.status));
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{t("السلفة تُسجَّل معلقة، ويعتمدها مسؤول رواتب آخر (لا من سجّلها ولا صاحبها)، ثم يُخصم قسطها من الراتب ابتداءً من شهر البداية حتى السداد. المتبقي يُحسب من الأقساط المخصومة فعلًا في كشوف الرواتب.")}</p>
        {advanceError && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{t(advanceError)}</p>}
        {canAdd && !advanceDraft && (
          <button type="button" data-readonly-exempt onClick={() => setAdvanceDraft({ amount: "", installment: "", startMonth: nextMonth(riyadhMonth()), notes: "" })} className="flex items-center gap-1 rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#003d6b]">
            <Plus className="h-4 w-4" />{t("إضافة سلفة")}
          </button>
        )}
        {canAdd && advanceDraft && (
          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className={labelClass}><span className="block">{t("مبلغ السلفة")}</span><input type="number" min="0" step="0.01" value={advanceDraft.amount} onChange={(event) => setAdvanceDraft({ ...advanceDraft, amount: event.target.value })} className={fieldClass} /></label>
              <label className={labelClass}><span className="block">{t("القسط الشهري")}</span><input type="number" min="0" step="0.01" value={advanceDraft.installment} onChange={(event) => setAdvanceDraft({ ...advanceDraft, installment: event.target.value })} className={fieldClass} /></label>
              <label className={labelClass}><span className="block">{t("شهر بداية الخصم")}</span><input type="month" min={riyadhMonth()} value={advanceDraft.startMonth} onChange={(event) => setAdvanceDraft({ ...advanceDraft, startMonth: event.target.value })} className={fieldClass} /></label>
              <label className={labelClass}><span className="block">{t("ملاحظات")}</span><input value={advanceDraft.notes} onChange={(event) => setAdvanceDraft({ ...advanceDraft, notes: event.target.value })} className={fieldClass} /></label>
              <div className="flex items-end gap-2">
                <button type="button" data-readonly-exempt disabled={busy} onClick={() => void saveAdvance()} className="rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{t("حفظ")}</button>
                <button type="button" data-readonly-exempt disabled={busy} onClick={() => setAdvanceDraft(null)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">{t("إلغاء")}</button>
              </div>
            </div>
            {advanceMonths > 0 && <p className="text-xs text-slate-600">{t("عدد الأشهر التقريبي")}: {formatNumber(advanceMonths)}</p>}
            {overTenPercent && <p className="text-xs font-semibold text-amber-700">{t("القسط أكثر من 10% من أجر الموظف: المادة 92 تشترط موافقته الكتابية")}</p>}
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-[#075f94] text-white">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("المبلغ")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("القسط الشهري")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("شهر البداية")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المسدد")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المتبقي")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("الحالة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("سجّلها")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("القرار")}</th>
                <th className="px-3 py-2 text-center font-medium">{t("الإجراءات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {advances.length === 0 ? (
                <tr><td colSpan={9} className="py-6 text-center text-gray-400">{t("لا توجد سلف")}</td></tr>
              ) : advances.map((advance) => {
                const pending = isPendingStatus(advance.status);
                return (
                  <tr key={advance.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-2 font-medium">{money(advance.amount)}</td>
                    <td className="px-3 py-2">{money(advance.installment)}</td>
                    <td className="px-3 py-2">{advance.startMonth || "—"}</td>
                    <td className="px-3 py-2">{isApprovedStatus(advance.status) ? money(advance.repaid) : "—"}</td>
                    <td className="px-3 py-2 font-semibold text-[#004e89]">{isRejectedStatus(advance.status) ? "—" : money(advance.remaining)}</td>
                    <td className="px-3 py-2">{statusBadge(advance.status)}</td>
                    <td className="px-3 py-2">{advance.createdBy || "—"}</td>
                    <td className="px-3 py-2">{advance.decidedBy ? `${advance.decidedBy}${advance.decisionNote ? ` — ${advance.decisionNote}` : ""}` : "—"}</td>
                    <td className="px-3 py-2">
                      {pending && canAdvances && !isOwn ? (
                        <div className="flex items-center justify-center gap-2">
                          {canDecideOn(advance.createdById) && (
                            <>
                              <button type="button" data-readonly-exempt disabled={busy} onClick={() => decideAdvance(advance, "معتمد")} className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50" title={t("اعتماد")}><CheckCircle2 className="h-4 w-4" /></button>
                              <button type="button" data-readonly-exempt disabled={busy} onClick={() => decideAdvance(advance, "مرفوض")} className="text-rose-600 hover:text-rose-800 disabled:opacity-50" title={t("رفض")}><XCircle className="h-4 w-4" /></button>
                            </>
                          )}
                          <button type="button" data-readonly-exempt disabled={busy} onClick={() => removeAdvance(advance)} className="text-gray-500 hover:text-rose-700 disabled:opacity-50" title={t("حذف")}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ) : <span className="block text-center text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => navigate("/hr/payroll/advances")} className="text-xs text-blue-700 hover:underline">{t("كل سلف الموظفين")}</button>
      </div>
    );
  };

  const renderPenalties = () => {
    const canAdd = canPenalties && !isOwn && Boolean(employee && isEmployeeActive(employee.status));
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">{t("الجزاء يُسجَّل معلقًا، ويعتمده مسؤول جزاءات آخر (لا من سجّله ولا صاحبه)، ثم يُخصم في مسير الرواتب من شهر تاريخه: بحد أقصى أجر 5 أيام في الشهر (المادة 72)، والباقي يُرحَّل للأشهر التالية.")}</p>
        {penaltyError && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{t(penaltyError)}</p>}
        {canAdd && !penaltyDraft && (
          <button type="button" data-readonly-exempt onClick={() => setPenaltyDraft({ type: penaltyTypes[0] ?? "", amount: "", date: today, reason: "" })} className="flex items-center gap-1 rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#003d6b]">
            <Plus className="h-4 w-4" />{t("إضافة جزاء")}
          </button>
        )}
        {canAdd && penaltyDraft && (
          <div className="space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className={labelClass}>
                <span className="block">{t("نوع الجزاء")}</span>
                <input list="penalty-types" value={penaltyDraft.type} onChange={(event) => setPenaltyDraft({ ...penaltyDraft, type: event.target.value })} className={fieldClass} />
                <datalist id="penalty-types">{penaltyTypes.map((type) => <option key={type} value={type} />)}</datalist>
              </label>
              <label className={labelClass}><span className="block">{t("المبلغ")}</span><input type="number" min="0" step="0.01" value={penaltyDraft.amount} onChange={(event) => setPenaltyDraft({ ...penaltyDraft, amount: event.target.value })} className={fieldClass} /></label>
              <label className={labelClass}><span className="block">{t("تاريخ المخالفة")}</span><input type="date" max={today} value={penaltyDraft.date} onChange={(event) => setPenaltyDraft({ ...penaltyDraft, date: event.target.value })} className={fieldClass} /></label>
              <label className={labelClass}><span className="block">{t("المخالفة (السبب)")}</span><input value={penaltyDraft.reason} onChange={(event) => setPenaltyDraft({ ...penaltyDraft, reason: event.target.value })} className={fieldClass} /></label>
              <div className="flex items-end gap-2">
                <button type="button" data-readonly-exempt disabled={busy} onClick={() => void savePenalty()} className="rounded-md bg-[#004e89] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{t("حفظ")}</button>
                <button type="button" data-readonly-exempt disabled={busy} onClick={() => setPenaltyDraft(null)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">{t("إلغاء")}</button>
              </div>
            </div>
            {penaltyOverFiveDays && <p className="text-xs font-semibold text-amber-700">{t("المبلغ أكثر من أجر 5 أيام")} ({money(fiveDaysWage)}): {t("يُخصم على أكثر من شهر (المادة 72)")}</p>}
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-[#075f94] text-white">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("التاريخ")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("نوع الجزاء")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المخالفة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المبلغ")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("الحالة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("سجّله")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("القرار")}</th>
                <th className="px-3 py-2 text-center font-medium">{t("الإجراءات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {penalties.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-gray-400">{t("لا توجد جزاءات")}</td></tr>
              ) : penalties.map((penalty) => {
                const pending = isPendingStatus(penalty.status);
                const approved = isApprovedStatus(penalty.status);
                return (
                  <tr key={penalty.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-3 py-2">{dateText(penalty.date)}</td>
                    <td className="px-3 py-2">{penalty.type ? t(penalty.type) : "—"}</td>
                    <td className="max-w-56 px-3 py-2 text-gray-700">{penalty.reason || "—"}</td>
                    <td className="px-3 py-2 font-medium text-rose-700">{money(penalty.amount)}</td>
                    <td className="px-3 py-2">{statusBadge(penalty.status)}</td>
                    <td className="px-3 py-2">{penalty.createdBy || "—"}</td>
                    <td className="px-3 py-2">{penalty.decidedBy ? `${penalty.decidedBy}${penalty.decisionNote ? ` — ${penalty.decisionNote}` : ""}` : "—"}</td>
                    <td className="px-3 py-2">
                      {canPenalties && !isOwn ? (
                        <div className="flex items-center justify-center gap-2">
                          {pending && canDecideOn(penalty.createdById) && (
                            <>
                              <button type="button" data-readonly-exempt disabled={busy} onClick={() => decidePenalty(penalty, "معتمد")} className="text-emerald-600 hover:text-emerald-800 disabled:opacity-50" title={t("اعتماد")}><CheckCircle2 className="h-4 w-4" /></button>
                              <button type="button" data-readonly-exempt disabled={busy} onClick={() => decidePenalty(penalty, "مرفوض")} className="text-rose-600 hover:text-rose-800 disabled:opacity-50" title={t("رفض")}><XCircle className="h-4 w-4" /></button>
                            </>
                          )}
                          {(!approved || isMainAdmin) && (
                            <button type="button" data-readonly-exempt disabled={busy} onClick={() => removePenalty(penalty)} className="text-gray-500 hover:text-rose-700 disabled:opacity-50" title={t("حذف")}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      ) : <span className="block text-center text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => navigate("/hr/penalties/archive")} className="text-xs text-blue-700 hover:underline">{t("كل الجزاءات")}</button>
      </div>
    );
  };

  const counts: Record<Tab, number> = {
    allowances: allowanceRows.filter((row) => !row.deduction).length,
    deductions: allowanceRows.filter((row) => row.deduction).length,
    advances: advances.length,
    penalties: penalties.length,
  };
  const pendingInTab = tab === "advances"
    ? advances.some((advance) => isPendingStatus(advance.status))
    : tab === "penalties" && penalties.some((penalty) => isPendingStatus(penalty.status));

  return (
    <Layout>
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 md:p-6" dir={direction}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/hr/employees"))}
              className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
              title={t("رجوع")}
            >
              <ArrowRight className={`h-4 w-4 ${direction === "ltr" ? "rotate-180" : ""}`} />
            </button>
            <h1 className="flex items-center gap-2 text-xl font-bold text-[#004e89]"><Wallet className="h-5 w-5" />{t("الحركات المالية للموظف")}</h1>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{t("تحديث")}
          </button>
        </div>

        {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{t(error)}</p>}
        {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

        {loading && !employee && <p className="py-10 text-center text-gray-400">{t("جاري التحميل...")}</p>}

        {employee && (
          <>
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="block text-xs text-gray-500">{t("الاسم")}</span><strong>{employee.name || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("الرقم الوظيفي")}</span><strong>{employee.empId || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("الإدارة")}</span><strong>{employee.directorate || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("القسم")}</span><strong>{employee.department || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("المسمى الوظيفي")}</span><strong>{employee.jobTitle || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("المدير المباشر")}</span><strong>{employee.directManager || "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("جدول الدوام")}</span><strong>{employee.workSchedule ? t(employee.workSchedule) : "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("الحالة")}</span><strong>{employee.status ? t(employee.status) : "—"}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("الراتب الأساسي")}</span><strong className="text-[#004e89]">{money(employee.baseSalary)}</strong></div>
              <div><span className="block text-xs text-gray-500">{t("الراتب الإجمالي")}</span><strong className="text-[#004e89]">{money(employee.totalSalary)}</strong></div>
            </div>

            {isOwn && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("هذا ملفك أنت: لا تعدّل بدلاتك ولا تسجّل أو تعتمد سلفة أو جزاءً لنفسك؛ يتولاها مسؤول آخر")}</p>}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 pt-3">
                <div className="flex flex-wrap gap-1">
                  {TABS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      data-readonly-exempt
                      onClick={() => { setTab(item.key); setItemDraft(null); setDecisionNote(""); setError(""); setMessage(""); }}
                      className={`rounded-t-md px-4 py-2 text-sm font-semibold ${tab === item.key ? "bg-[#004e89] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      {t(item.label)} ({formatNumber(counts[item.key])})
                    </button>
                  ))}
                </div>
                {pendingInTab && (
                  <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
                    {t("ملاحظة القرار")}
                    <input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder={t("مطلوبة عند الرفض")} className="w-56 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none" />
                  </label>
                )}
              </div>
              <div className="p-4">
                {tab === "allowances" && renderItems(false)}
                {tab === "deductions" && renderItems(true)}
                {tab === "advances" && renderAdvances()}
                {tab === "penalties" && renderPenalties()}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
