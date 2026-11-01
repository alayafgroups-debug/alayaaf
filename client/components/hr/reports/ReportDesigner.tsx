import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileSpreadsheet, Loader2, Printer, RotateCcw, Search, UserCheck, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { fetchAllRows } from "@/lib/fetchAll";
import { exportReportExcel, latinDigits, printReport, type ReportCell, type ReportColumn } from "@/lib/reportExport";
import { loadOrgEnglishNames } from "@/lib/orgNames";
import { isEmployeeActive } from "@/lib/employeeStatus";
import { isSaudiNationality } from "@/lib/hrStatus";
import { riyadhToday } from "@/lib/hrDates";
import { UNSPECIFIED_PAYMENT_METHOD } from "@/lib/salaryPaymentMethods";
import { computeTotalSalary, mapRowToForm, type EmpFormData } from "@/pages/EmployeeForm";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

/*
 * مصمم التقارير (HR-26): تختار الموارد البشرية أعمدة التقرير من ملف الموظف (البيانات الشخصية والوظيفية والراتب والبدلات
 * والبنك والتأمينات) وترتيبها، وتصفّي الموظفين أو تختارهم، ثم تطبع أو تحمّل Excel بالثيم الأصفر (شكل كشف سمارت)
 * مع سطر «الإجمالي» للأعمدة المالية. الراتب والبدلات كما في ملف الموظف اليوم (البدل الساري اليوم فقط).
 * اختيار الأعمدة والعنوان يُحفظان على هذا الجهاز.
 */

type Translate = (value: string) => string;
type FieldContext = { t: Translate; orgName: (value: string) => string; today: string };

type FieldDef = {
  key: string;
  label: string;
  /** لاحقة تُترجم وتُضاف بين قوسين بعد الاسم (مثل «مخصوم») */
  suffix?: string;
  group: string;
  width: number;
  money?: boolean;
  value: (employee: EmpFormData, context: FieldContext) => string | number;
};

const GROUPS = ["البيانات الأساسية", "الوظيفة", "الراتب والبدلات", "البنك والتأمينات"];

const text = (value: string) => value.trim();
const translated = (value: string, t: Translate) => (value.trim() ? t(value.trim()) : "");

/** البدلات السارية اليوم (كحساب إجمالي الراتب في ملف الموظف) */
const activeAllowances = (employee: EmpFormData, today: string) =>
  employee.allowances.filter((item) => (!item.from || item.from <= today) && (!item.to || item.to >= today));
const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const addedAllowances = (employee: EmpFormData, today: string) =>
  round2(activeAllowances(employee, today).filter((item) => item.effect !== "مخصوم").reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
const deductedAllowances = (employee: EmpFormData, today: string) =>
  round2(activeAllowances(employee, today).filter((item) => item.effect === "مخصوم").reduce((sum, item) => sum + (Number(item.amount) || 0), 0));

const BASE_FIELDS: FieldDef[] = [
  // البيانات الأساسية
  { key: "empId", label: "الرقم الوظيفي", group: "البيانات الأساسية", width: 14, value: (e) => text(e.empId) },
  { key: "name", label: "الاسم", group: "البيانات الأساسية", width: 30, value: (e) => text(e.name) },
  { key: "englishName", label: "الاسم بالإنجليزية", group: "البيانات الأساسية", width: 28, value: (e) => text(e.firstName) },
  { key: "nationality", label: "الجنسية", group: "البيانات الأساسية", width: 18, value: (e, c) => translated(e.nationality, c.t) },
  { key: "nationalId", label: "رقم الهوية / الإقامة", group: "البيانات الأساسية", width: 18, value: (e) => text(e.nationalId) },
  { key: "idExpiryDate", label: "تاريخ انتهاء الهوية", group: "البيانات الأساسية", width: 16, value: (e) => text(e.idExpiryDate) },
  { key: "passportNumber", label: "رقم الجواز", group: "البيانات الأساسية", width: 16, value: (e) => text(e.passportNumber) },
  { key: "birthDate", label: "تاريخ الميلاد", group: "البيانات الأساسية", width: 14, value: (e) => text(e.birthDate) },
  { key: "gender", label: "الجنس", group: "البيانات الأساسية", width: 10, value: (e, c) => translated(e.gender, c.t) },
  { key: "maritalStatus", label: "الحالة الاجتماعية", group: "البيانات الأساسية", width: 14, value: (e, c) => translated(e.maritalStatus, c.t) },
  { key: "phone", label: "رقم الجوال", group: "البيانات الأساسية", width: 16, value: (e) => text(e.phone) },
  { key: "email", label: "البريد الإلكتروني", group: "البيانات الأساسية", width: 26, value: (e) => text(e.email) },
  // الوظيفة
  { key: "jobTitle", label: "المسمى الوظيفي", group: "الوظيفة", width: 22, value: (e, c) => c.orgName(e.jobTitle) },
  { key: "department", label: "القسم", group: "الوظيفة", width: 20, value: (e, c) => c.orgName(e.department) },
  { key: "directorate", label: "الإدارة", group: "الوظيفة", width: 20, value: (e, c) => c.orgName(e.directorate) },
  { key: "branch", label: "الفرع", group: "الوظيفة", width: 18, value: (e, c) => c.orgName(e.branch) },
  { key: "workLocation", label: "مكان العمل", group: "الوظيفة", width: 18, value: (e, c) => c.orgName(e.workLocation) },
  { key: "employmentType", label: "نوع التوظيف", group: "الوظيفة", width: 13, value: (e, c) => translated(e.employmentType, c.t) },
  { key: "hireDate", label: "تاريخ التعيين", group: "الوظيفة", width: 14, value: (e) => text(e.hireDate) },
  { key: "contractEndDate", label: "تاريخ انتهاء العقد", group: "الوظيفة", width: 15, value: (e) => text(e.contractEndDate) },
  { key: "workSchedule", label: "جدول الدوام", group: "الوظيفة", width: 20, value: (e, c) => translated(e.workSchedule, c.t) },
  { key: "directManager", label: "المدير المباشر", group: "الوظيفة", width: 20, value: (e) => text(e.directManager) },
  { key: "status", label: "الحالة", group: "الوظيفة", width: 11, value: (e, c) => translated(e.status, c.t) },
  // الراتب والبدلات
  { key: "baseSalary", label: "الراتب الأساسي", group: "الراتب والبدلات", width: 15, money: true, value: (e) => round2(e.baseSalary) },
  { key: "allowancesTotal", label: "مجموع البدلات", group: "الراتب والبدلات", width: 15, money: true, value: (e, c) => addedAllowances(e, c.today) },
  { key: "deductedAllowances", label: "بدلات مخصومة", group: "الراتب والبدلات", width: 14, money: true, value: (e, c) => deductedAllowances(e, c.today) },
  { key: "totalSalary", label: "إجمالي الراتب", group: "الراتب والبدلات", width: 16, money: true, value: (e, c) => computeTotalSalary(e.baseSalary, e.allowances, c.today) },
  // البنك والتأمينات
  { key: "salaryPaymentMethod", label: "طريقة صرف الراتب", group: "البنك والتأمينات", width: 15, value: (e, c) => c.t(e.salaryPaymentMethod || UNSPECIFIED_PAYMENT_METHOD) },
  { key: "bankName", label: "اسم البنك", group: "البنك والتأمينات", width: 18, value: (e, c) => translated(e.bankName, c.t) },
  { key: "bankAccount", label: "رقم الحساب", group: "البنك والتأمينات", width: 22, value: (e) => text(e.bankAccount) },
  { key: "iban", label: "الآيبان", group: "البنك والتأمينات", width: 28, value: (e) => text(e.iban) },
  { key: "socialInsurance", label: "التأمينات الاجتماعية", group: "البنك والتأمينات", width: 14, value: (e, c) => (e.socialInsurance === "نعم" ? c.t("مشمول") : e.socialInsurance === "لا" ? c.t("غير مشمول") : c.t("غير محدد")) },
  { key: "socialInsuranceType", label: "نوع التأمين", group: "البنك والتأمينات", width: 20, value: (e, c) => translated(e.socialInsuranceType, c.t) },
  { key: "socialInsuranceStartDate", label: "تاريخ الاشتراك في التأمينات", group: "البنك والتأمينات", width: 16, value: (e) => text(e.socialInsuranceStartDate) },
];

/**
 * عمود لكل نوع بدل (كما سُمّي في ملفات الموظفين): مجموع ما يسري منه اليوم.
 * البدل المخصوم في عمود مستقل «النوع (مخصوم)» حتى لا يظهر صفرًا في عمود المضاف.
 */
const allowanceField = (type: string, deducted: boolean): FieldDef => ({
  key: `${deducted ? "allowance-deducted:" : "allowance:"}${type}`,
  label: type,
  suffix: deducted ? "مخصوم" : undefined,
  group: "الراتب والبدلات",
  width: 14,
  money: true,
  value: (e, c) => round2(activeAllowances(e, c.today)
    .filter((item) => item.type.trim() === type && (item.effect === "مخصوم") === deducted)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)),
});

const DEFAULT_COLUMNS = ["empId", "name", "department", "baseSalary", "allowancesTotal", "totalSalary"];
const STORAGE_KEY = "alayaaf.hrReportDesigner.v1";
type StatusFilter = "active" | "inactive" | "all";
type SortKey = "empId" | "name" | "department";

const loadSaved = (): { columns: string[]; title: string } | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { columns?: unknown; title?: unknown } | null;
    if (!saved || !Array.isArray(saved.columns)) return null;
    return { columns: saved.columns.map(String).filter(Boolean), title: typeof saved.title === "string" ? saved.title : "" };
  } catch {
    return null;
  }
};

export default function ReportDesigner() {
  const { t, locale, direction, formatNumber } = useI18n();
  const [employees, setEmployees] = useState<EmpFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => loadSaved()?.columns ?? DEFAULT_COLUMNS);
  const [title, setTitle] = useState(() => loadSaved()?.title ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [branch, setBranch] = useState("");
  const [directorate, setDirectorate] = useState("");
  const [department, setDepartment] = useState("");
  const [nationality, setNationality] = useState<"" | "saudi" | "non-saudi">("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("empId");
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orgEnglish, setOrgEnglish] = useState<Map<string, string>>(() => new Map());
  const today = riyadhToday();

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
          supabase.from("employees").select("*").order("emp_id").order("id").range(from, to));
        if (active) setEmployees(rows.map(mapRowToForm));
      } catch {
        if (active) setError("تعذر تحميل بيانات الموظفين");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (locale !== "en") return;
    let active = true;
    loadOrgEnglishNames().then((names) => { if (active) setOrgEnglish(names); }).catch(() => undefined);
    return () => { active = false; };
  }, [locale]);

  // يُحفظ اختيار الأعمدة والعنوان على هذا الجهاز
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns: selectedColumns, title }));
    } catch {
      // التخزين غير متاح: يعمل المصمم بلا حفظ
    }
  }, [selectedColumns, title]);

  const orgName = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    return locale === "en" ? orgEnglish.get(raw) || t(raw) : raw;
  };
  const context: FieldContext = { t, orgName, today };

  // أنواع البدلات الموجودة في ملفات الموظفين: عمود لكل نوع مضاف، وعمود لكل نوع مخصوم
  const fields = useMemo(() => {
    const typesOf = (deducted: boolean) => [...new Set(employees.flatMap((employee) => employee.allowances
      .filter((item) => (item.effect === "مخصوم") === deducted)
      .map((item) => item.type.trim())
      .filter(Boolean)))].sort((a, b) => a.localeCompare(b, "ar"));
    const allowanceFields = [...typesOf(false).map((type) => allowanceField(type, false)), ...typesOf(true).map((type) => allowanceField(type, true))];
    const position = BASE_FIELDS.findIndex((field) => field.key === "allowancesTotal");
    return [...BASE_FIELDS.slice(0, position), ...allowanceFields, ...BASE_FIELDS.slice(position)];
  }, [employees]);
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  // عمود محفوظ لنوع بدل لم يعد موجودًا لا يُعرض (ويبقى في الاختيار إن عاد)
  const columns = selectedColumns.map((key) => fieldByKey.get(key)).filter((field): field is FieldDef => !!field);
  const fieldLabel = (field: FieldDef) => (field.suffix ? `${t(field.label)} (${t(field.suffix)})` : t(field.label));

  const unique = (pick: (employee: EmpFormData) => string) =>
    [...new Set(employees.map((employee) => pick(employee).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
  const branchOptions = useMemo(() => unique((employee) => employee.branch), [employees]); // eslint-disable-line react-hooks/exhaustive-deps
  const directorateOptions = useMemo(() => unique((employee) => employee.directorate), [employees]); // eslint-disable-line react-hooks/exhaustive-deps
  const departmentOptions = useMemo(() => unique((employee) => employee.department), [employees]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = employees.filter((employee) => {
      const active = isEmployeeActive(employee.status);
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;
      if (branch && employee.branch.trim() !== branch) return false;
      if (directorate && employee.directorate.trim() !== directorate) return false;
      if (department && employee.department.trim() !== department) return false;
      if (nationality === "saudi" && !isSaudiNationality(employee.nationality)) return false;
      if (nationality === "non-saudi" && (isSaudiNationality(employee.nationality) || !employee.nationality.trim())) return false;
      if (paymentMethod && (employee.salaryPaymentMethod || UNSPECIFIED_PAYMENT_METHOD) !== paymentMethod) return false;
      if (term && ![employee.name, employee.firstName, employee.empId, employee.nationalId, employee.phone].some((value) => value.toLowerCase().includes(term))) return false;
      return true;
    });
    const byEmpId = (a: EmpFormData, b: EmpFormData) => a.empId.localeCompare(b.empId, "en", { numeric: true });
    return list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "ar") || byEmpId(a, b);
      if (sortKey === "department") return a.department.localeCompare(b.department, "ar") || byEmpId(a, b);
      return byEmpId(a, b);
    });
  }, [employees, statusFilter, branch, directorate, department, nationality, paymentMethod, search, sortKey]);

  // في «اختيار الموظفين»: المحددون من النتائج فقط
  const reportEmployees = selectionMode === "custom" ? filtered.filter((employee) => selectedIds.has(employee.id)) : filtered;
  const reportRows = reportEmployees.map((employee) => Object.fromEntries(columns.map((field) => [field.key, field.value(employee, context)])) as Record<string, string | number>);
  const moneyColumns = columns.filter((field) => field.money);
  const totals = Object.fromEntries(moneyColumns.map((field) => [field.key, round2(reportRows.reduce((sum, row) => sum + Number(row[field.key] ?? 0), 0))]));
  const reportTitle = title.trim() || t("تقرير الموظفين");

  const toggleColumn = (key: string) => setSelectedColumns((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  // التحريك بين الأعمدة الظاهرة فقط (المحفوظ لنوع بدل لم يعد موجودًا لا يعطّل الزر)
  const moveColumn = (key: string, step: -1 | 1) => setSelectedColumns((current) => {
    const visible = current.filter((item) => fieldByKey.has(item));
    const position = visible.indexOf(key);
    const neighbour = visible[position + step];
    if (position < 0 || !neighbour) return current;
    const next = [...current];
    const from = next.indexOf(key);
    const to = next.indexOf(neighbour);
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
  const toggleEmployee = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const allFilteredSelected = filtered.length > 0 && filtered.every((employee) => selectedIds.has(employee.id));

  const filterSubtitle = () => {
    const parts = [
      statusFilter === "active" ? t("الموظفون الفعالون") : statusFilter === "inactive" ? t("الموظفون غير الفعالين") : t("كل الموظفين"),
      branch ? `${t("الفرع")}: ${orgName(branch)}` : "",
      directorate ? `${t("الإدارة")}: ${orgName(directorate)}` : "",
      department ? `${t("القسم")}: ${orgName(department)}` : "",
      nationality ? `${t("الجنسية")}: ${t(nationality === "saudi" ? "سعودي" : "غير سعودي")}` : "",
      paymentMethod ? `${t("طريقة صرف الراتب")}: ${t(paymentMethod)}` : "",
    ];
    return parts.filter(Boolean).join(" — ");
  };

  const exportOptions = () => {
    const reportColumns: ReportColumn[] = columns.map((field) => ({ key: field.key, label: fieldLabel(field), width: field.width, money: field.money }));
    const rows: Record<string, ReportCell>[] = reportRows.map((row) => Object.fromEntries(columns.map((field) => {
      const value = row[field.key];
      return [field.key, field.money ? Number(value ?? 0) : String(value ?? "").trim() || "-"];
    })));
    const widthSum = columns.reduce((sum, field) => sum + field.width, 6);
    return {
      title: reportTitle,
      subtitle: filterSubtitle(),
      columns: reportColumns,
      rows,
      fileName: reportTitle,
      landscape: widthSum > 120,
      totals: moneyColumns.length ? totals : undefined,
      summary: [{ label: t("عدد الموظفين"), value: rows.length }],
      theme: "statement" as const,
    };
  };
  const canExport = !loading && !error && columns.length > 0 && reportRows.length > 0;

  const selectClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#004e89]";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white" dir={direction}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
        <div className="min-w-64 flex-1">
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t("عنوان التقرير")}</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("تقرير الموظفين")} className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#004e89]" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (!printReport(exportOptions())) toast({ title: t("تعذر فتح نافذة الطباعة؛ اسمح بالنوافذ المنبثقة"), variant: "destructive" }); }} disabled={!canExport} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"><Printer className="h-4 w-4" />{t("طباعة / PDF")}</button>
          <button onClick={() => exportReportExcel(exportOptions())} disabled={!canExport} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />{t("تصدير Excel")}</button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {/* الأعمدة: الاختيار من ملف الموظف، ثم الترتيب */}
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">{t("اختر أعمدة التقرير")}</h3>
              <button onClick={() => setSelectedColumns(DEFAULT_COLUMNS)} className="flex items-center gap-1 text-xs text-[#004e89] hover:underline"><RotateCcw className="h-3.5 w-3.5" />{t("الأعمدة الافتراضية")}</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {GROUPS.map((group) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-bold text-gray-500">{t(group)}</p>
                  <div className="space-y-1">
                    {fields.filter((field) => field.group === group).map((field) => (
                      <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-gray-700 hover:bg-gray-50">
                        <input type="checkbox" checked={selectedColumns.includes(field.key)} onChange={() => toggleColumn(field.key)} />
                        <span>{fieldLabel(field)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-800">{t("ترتيب الأعمدة")} ({formatNumber(columns.length)})</h3>
            {columns.length === 0 ? <p className="text-sm text-gray-400">{t("اختر عمودًا واحدًا على الأقل")}</p> : (
              <ol className="space-y-1">
                {columns.map((field, index) => (
                  <li key={field.key} className="flex items-center gap-1 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-sm">
                    <span className="w-6 text-xs text-gray-400">{index + 1}</span>
                    <span className="flex-1 truncate">{fieldLabel(field)}</span>
                    <button onClick={() => moveColumn(field.key, -1)} disabled={index === 0} title={t("تحريك لأعلى")} aria-label={t("تحريك لأعلى")} className="rounded p-1 hover:bg-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveColumn(field.key, 1)} disabled={index === columns.length - 1} title={t("تحريك لأسفل")} aria-label={t("تحريك لأسفل")} className="rounded p-1 hover:bg-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button onClick={() => toggleColumn(field.key)} title={t("إزالة")} aria-label={t("إزالة")} className="rounded p-1 text-red-600 hover:bg-white"><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* التصفية */}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("الحالة")}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={selectClass}>
              <option value="active">{t("الموظفون الفعالون")}</option>
              <option value="inactive">{t("الموظفون غير الفعالين")}</option>
              <option value="all">{t("كل الموظفين")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("الفرع")}</span>
            <select value={branch} onChange={(event) => setBranch(event.target.value)} className={selectClass}>
              <option value="">{t("الكل")}</option>
              {branchOptions.map((option) => <option key={option} value={option}>{orgName(option)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("الإدارة")}</span>
            <select value={directorate} onChange={(event) => setDirectorate(event.target.value)} className={selectClass}>
              <option value="">{t("الكل")}</option>
              {directorateOptions.map((option) => <option key={option} value={option}>{orgName(option)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("القسم")}</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className={selectClass}>
              <option value="">{t("الكل")}</option>
              {departmentOptions.map((option) => <option key={option} value={option}>{orgName(option)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("الجنسية")}</span>
            <select value={nationality} onChange={(event) => setNationality(event.target.value as "" | "saudi" | "non-saudi")} className={selectClass}>
              <option value="">{t("الكل")}</option>
              <option value="saudi">{t("سعودي")}</option>
              <option value="non-saudi">{t("غير سعودي")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("طريقة صرف الراتب")}</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={selectClass}>
              <option value="">{t("الكل")}</option>
              {["نقدي", "مدد", "تحويل بنكي", "شيك", UNSPECIFIED_PAYMENT_METHOD].map((option) => <option key={option} value={option}>{t(option)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600"><span>{t("الترتيب")}</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className={selectClass}>
              <option value="empId">{t("الرقم الوظيفي")}</option>
              <option value="name">{t("الاسم")}</option>
              <option value="department">{t("القسم")}</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 start-3" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("بحث بالاسم أو الرقم...")} className="w-72 rounded-lg border border-gray-300 py-1.5 text-sm ps-9 pe-3 focus:border-[#004e89] focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSelectionMode("all")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm", selectionMode === "all" ? "bg-[#004e89] text-white" : "border border-[#004e89] bg-white text-[#004e89]")}><Users className="h-4 w-4" />{t("جميع الموظفين")}</button>
            <button onClick={() => setSelectionMode("custom")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm", selectionMode === "custom" ? "bg-[#004e89] text-white" : "border border-[#004e89] bg-white text-[#004e89]")}><UserCheck className="h-4 w-4" />{t("اختيار الموظفين")}</button>
          </div>
        </div>

        {/* المعاينة بالثيم الأصفر */}
        <div className="rounded-xl border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">{reportTitle}</span>
            <span>{t("عدد الموظفين")}: {formatNumber(reportRows.length)}{selectionMode === "custom" ? ` / ${formatNumber(filtered.length)}` : ""}</span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {loading ? (
              <div className="py-14 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#004e89]" /><p className="mt-2 text-gray-500">{t("جاري جلب بيانات الموظفين...")}</p></div>
            ) : error ? (
              <p className="py-12 text-center text-red-600">{t(error)}</p>
            ) : columns.length === 0 ? (
              <p className="py-12 text-center text-gray-500">{t("اختر عمودًا واحدًا على الأقل")}</p>
            ) : (
              <table className="min-w-full border-collapse text-sm font-bold">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {selectionMode === "custom" && (
                      <th className="border border-black bg-[#ffff00] px-2 py-2">
                        <input type="checkbox" checked={allFilteredSelected} onChange={() => setSelectedIds((current) => {
                          // يضيف نتائج الفلتر الحالي أو يزيلها فقط، ولا يمس المحددين خارج الفلتر
                          const next = new Set(current);
                          filtered.forEach((employee) => (allFilteredSelected ? next.delete(employee.id) : next.add(employee.id)));
                          return next;
                        })} title={t("تحديد الكل")} aria-label={t("تحديد الكل")} />
                      </th>
                    )}
                    <th className="border border-black bg-[#ffff00] px-2 py-2">{locale === "en" ? "#" : "م"}</th>
                    {columns.map((field) => <th key={field.key} className="whitespace-nowrap border border-black bg-[#ffff00] px-3 py-2 text-center">{fieldLabel(field)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={columns.length + 2} className="border border-black py-10 text-center text-gray-500">{t("لا يوجد موظفون مطابقون للفلاتر")}</td></tr>
                  ) : (() => {
                    // الترقيم كالطباعة وExcel: للمشمولين في التقرير فقط
                    let serial = 0;
                    return (selectionMode === "custom" ? filtered : reportEmployees).map((employee) => {
                    const included = selectionMode === "all" || selectedIds.has(employee.id);
                    const number = included ? ++serial : 0;
                    return (
                      <tr key={employee.id} className={cn(!included && "text-gray-400")}>
                        {selectionMode === "custom" && (
                          <td className="border border-black px-2 py-1.5 text-center"><input type="checkbox" checked={selectedIds.has(employee.id)} onChange={() => toggleEmployee(employee.id)} aria-label={`${t("تحديد")} ${employee.name}`} /></td>
                        )}
                        <td className="border border-black px-2 py-1.5 text-center">{number || "—"}</td>
                        {columns.map((field) => {
                          const value = field.value(employee, context);
                          return <td key={field.key} className="whitespace-nowrap border border-black px-3 py-1.5 text-center">{field.money ? formatNumber(Number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : latinDigits(String(value || "—"))}</td>;
                        })}
                      </tr>
                    );
                    });
                  })()}
                  {moneyColumns.length > 0 && reportRows.length > 0 && (() => {
                    const firstMoney = columns.findIndex((field) => field.money);
                    const span = firstMoney + 1 + (selectionMode === "custom" ? 1 : 0);
                    return (
                      <tr className="bg-[#ffff00]">
                        <td colSpan={span} className="border border-black px-3 py-2 text-center">{t("الإجمالي")}</td>
                        {columns.slice(firstMoney).map((field) => <td key={field.key} className="whitespace-nowrap border border-black px-3 py-2 text-center">{field.money ? formatNumber(totals[field.key] ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}</td>)}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">{t("الراتب والبدلات من ملف الموظف كما هي اليوم (البدل الساري اليوم فقط)؛ لأرقام شهر محدد استعمل كشف الرواتب.")}</p>
      </div>
    </div>
  );
}
