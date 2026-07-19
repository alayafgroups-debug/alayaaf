import { useEffect, useMemo, useState } from "react";
import { Calendar, FileSpreadsheet, Loader2, Printer, Search, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { exportReportExcel, printReport, ReportColumn } from "@/lib/reportExport";
import { ReportFilter, ReportSchema } from "./reportSchemas";

type Employee = {
  id: string;
  emp_id: string | null;
  name: string;
  job_title: string | null;
  department: string | null;
  directorate: string | null;
  branch: string | null;
  work_location: string | null;
  hire_date: string | null;
  bank_account: string | null;
  social_insurance: string | null;
};

type ReportRecord = Record<string, unknown>;

type EmployeeReportRow = Employee & {
  recordCount: number;
  details: string;
};

const SOURCE_CONFIG: Record<string, { table: string; dateField?: string }> = {
  leaves: { table: "leave_requests", dateField: "start_date" },
  payroll_expenses: { table: "payroll", dateField: "paid_date" },
  disbursement_reports: { table: "payroll", dateField: "paid_date" },
  attendance_departure: { table: "attendance", dateField: "date" },
  end_of_service: { table: "hr_terminations", dateField: "termination_date" },
  advances_reports: { table: "hr_advances", dateField: "request_date" },
  overtime_reports: { table: "overtime_records", dateField: "date" },
  social_insurance: { table: "insurance_records", dateField: "start_date" },
};

const EMPLOYEE_REPORTS = new Set([
  "financial_data",
  "personal_details",
  "bank_accounts",
  "new_employees",
  "leave_balances",
]);

const valueText = (value: unknown) => (value === null || value === undefined || value === "" ? "-" : String(value));

function recordEmployeeKey(record: ReportRecord) {
  return valueText(record.employee_id) !== "-" ? String(record.employee_id) : String(record.emp_id ?? "");
}

function recordDetail(schemaId: string, record: ReportRecord) {
  switch (schemaId) {
    case "leaves":
      return `${valueText(record.leave_type)} — ${valueText(record.days)} يوم`;
    case "penalties_warnings":
      return `${valueText(record.subject)} — ${valueText(record.status)}`;
    case "payroll_expenses":
    case "disbursement_reports":
      return `${valueText(record.month)} — صافي ${valueText(record.net_salary)} ر.س`;
    case "attendance_departure":
      return `${valueText(record.date)} — ${valueText(record.status)}`;
    case "end_of_service":
      return `${valueText(record.termination_date)} — ${valueText(record.end_reason ?? record.reason)}`;
    case "advances_reports":
      return `${valueText(record.amount)} ر.س — ${valueText(record.status)}`;
    case "overtime_reports":
      return `${valueText(record.hours)} ساعة — ${valueText(record.amount)} ر.س`;
    case "social_insurance":
      return `${valueText(record.insurance_type)} — ${valueText(record.status)}`;
    default:
      return valueText(record.status);
  }
}

export default function DynamicReport({ schema }: { schema: ReportSchema }) {
  const [selectionMode, setSelectionMode] = useState<"all" | "custom">("all");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(schema.filters.filter((filter) => filter.type === "select" && filter.options?.length).map((filter) => [filter.id, filter.options![0]])),
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");
      try {
        const employeesRequest = supabase
          .from("employees")
          .select("id, emp_id, name, job_title, department, directorate, branch, work_location, hire_date, bank_account, social_insurance")
          .order("name");

        let reportRecords: ReportRecord[] = [];
        if (schema.id === "penalties_warnings") {
          const [investigations, warnings] = await Promise.all([
            supabase.from("penalty_investigations").select("*"),
            supabase.from("penalty_warnings").select("*"),
          ]);
          if (investigations.error) throw investigations.error;
          if (warnings.error) throw warnings.error;
          reportRecords = [
            ...(investigations.data ?? []).map((row) => ({ ...row, record_kind: "مساءلة" })),
            ...(warnings.data ?? []).map((row) => ({ ...row, record_kind: "إنذار" })),
          ];
        } else if (SOURCE_CONFIG[schema.id]) {
          const source = SOURCE_CONFIG[schema.id];
          const result = await supabase.from(source.table).select("*");
          if (result.error) throw result.error;
          reportRecords = result.data ?? [];
        }

        const employeesResult = await employeesRequest;
        if (employeesResult.error) throw employeesResult.error;
        if (!active) return;
        setEmployees((employeesResult.data ?? []) as Employee[]);
        setRecords(reportRecords);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "تعذر تحميل بيانات التقرير");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => {
      active = false;
    };
  }, [schema.id]);

  const filterOptions = useMemo(() => {
    const unique = (field: keyof Employee) =>
      Array.from(new Set(employees.map((employee) => employee[field]).filter(Boolean) as string[]));
    return {
      branch: unique("branch"),
      management: unique("directorate"),
      department: unique("department"),
      work_location: unique("work_location"),
    };
  }, [employees]);

  const rows = useMemo<EmployeeReportRow[]>(() => {
    let relevantRecords = records;
    const reportType = filterValues.report_type;
    if (schema.id === "penalties_warnings" && reportType) {
      const wantedKind = reportType.includes("المساءلات") ? "مساءلة" : reportType.includes("الإنذارات") ? "إنذار" : "";
      if (wantedKind) relevantRecords = relevantRecords.filter((record) => record.record_kind === wantedKind);
    }

    const source = SOURCE_CONFIG[schema.id];
    if (source?.dateField) {
      if (filterValues.from_date) {
        relevantRecords = relevantRecords.filter((record) => String(record[source.dateField!] ?? "") >= filterValues.from_date);
      }
      if (filterValues.to_date) {
        relevantRecords = relevantRecords.filter((record) => String(record[source.dateField!] ?? "") <= filterValues.to_date);
      }
    }

    if (schema.id === "leaves" && filterValues.leave_type && filterValues.leave_type !== "الكل") {
      relevantRecords = relevantRecords.filter((record) => String(record.leave_type ?? "").includes(filterValues.leave_type));
    }

    const recordsByEmployee = new Map<string, ReportRecord[]>();
    relevantRecords.forEach((record) => {
      const key = recordEmployeeKey(record);
      if (!key) return;
      recordsByEmployee.set(key, [...(recordsByEmployee.get(key) ?? []), record]);
    });

    let baseEmployees = employees;
    if (!EMPLOYEE_REPORTS.has(schema.id)) {
      baseEmployees = employees.filter((employee) =>
        recordsByEmployee.has(employee.id) || (!!employee.emp_id && recordsByEmployee.has(employee.emp_id)),
      );
    }
    if (schema.id === "bank_accounts") baseEmployees = baseEmployees.filter((employee) => !!employee.bank_account);
    if (schema.id === "social_insurance" && records.length === 0) {
      baseEmployees = employees.filter((employee) => !!employee.social_insurance);
    }
    if (schema.id === "new_employees") {
      const days = Number.parseInt(filterValues.new_period || "60", 10);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - days);
      baseEmployees = baseEmployees.filter((employee) => employee.hire_date && new Date(employee.hire_date) >= threshold);
    }

    const employeeRows = baseEmployees.map((employee) => {
      const matches = recordsByEmployee.get(employee.id) ?? recordsByEmployee.get(employee.emp_id ?? "") ?? [];
      let details = matches.slice(0, 2).map((record) => recordDetail(schema.id, record)).join(" | ");
      if (EMPLOYEE_REPORTS.has(schema.id)) {
        if (schema.id === "financial_data") details = `الراتب والبيانات المالية للموظف`;
        if (schema.id === "personal_details") details = "البيانات الشخصية والوظيفية";
        if (schema.id === "bank_accounts") details = `الحساب: ${valueText(employee.bank_account)}`;
        if (schema.id === "new_employees") details = `تاريخ التعيين: ${valueText(employee.hire_date)}`;
        if (schema.id === "leave_balances") details = "رصيد الإجازات حسب العقد والطلبات";
      }
      return { ...employee, recordCount: matches.length || 1, details };
    });

    const employeeIds = new Set(employees.flatMap((employee) => [employee.id, employee.emp_id ?? ""]));
    relevantRecords.forEach((record, index) => {
      const key = recordEmployeeKey(record);
      if (!key || employeeIds.has(key)) return;
      const empName = valueText(record.emp_name);
      employeeRows.push({
        id: `record-${schema.id}-${key}-${index}`,
        emp_id: String(record.emp_id ?? ""),
        name: empName === "-" ? "موظف غير معروف" : empName,
        job_title: null,
        department: (record.department as string) ?? null,
        directorate: null,
        branch: null,
        work_location: null,
        hire_date: null,
        bank_account: null,
        social_insurance: null,
        recordCount: recordsByEmployee.get(key)?.length ?? 1,
        details: recordDetail(schema.id, record),
      });
    });

    return employeeRows.filter((row) => {
      if (filterValues.branch && filterValues.branch !== "الكل" && row.branch !== filterValues.branch) return false;
      if (filterValues.management && filterValues.management !== "الكل" && row.directorate !== filterValues.management) return false;
      if (filterValues.department && filterValues.department !== "الكل" && row.department !== filterValues.department) return false;
      if (filterValues.work_location && filterValues.work_location !== "الكل" && row.work_location !== filterValues.work_location) return false;
      const term = search.trim().toLowerCase();
      return !term || [row.name, row.emp_id, row.job_title, row.department, row.details].some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [employees, records, filterValues, schema.id, search]);

  useEffect(() => setPage(1), [search, filterValues, pageSize, schema.id]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues((previous) => ({ ...previous, [id]: value }));
  };

  const reportColumns: ReportColumn[] = [
    { key: "empId", label: "الرقم الوظيفي", width: 16 },
    { key: "name", label: schema.tableColumns[0] || "اسم الموظف", width: 26 },
    { key: "jobTitle", label: schema.tableColumns[1] || "المسمى الوظيفي", width: 22 },
    { key: "department", label: schema.tableColumns[2] || "القسم", width: 20 },
    { key: "directorate", label: schema.tableColumns[3] || "الإدارة", width: 20 },
    { key: "branch", label: schema.tableColumns[4] || "الفرع", width: 18 },
    { key: "recordCount", label: "عدد السجلات", width: 14 },
    { key: "details", label: "تفاصيل التقرير", width: 38 },
  ];

  const exportedRows = (selectionMode === "custom" ? rows.filter((row) => selectedIds.has(row.id)) : rows).map((row) => ({
    empId: row.emp_id || "-",
    name: row.name,
    jobTitle: row.job_title || "-",
    department: row.department || "-",
    directorate: row.directorate || "-",
    branch: row.branch || "-",
    recordCount: row.recordCount,
    details: row.details || "-",
  }));

  const reportSubtitle = `تقرير مفلتر حسب البيانات المحددة — ${exportedRows.length} موظف`;

  const handlePrint = () => printReport({
    title: schema.title,
    subtitle: reportSubtitle,
    columns: reportColumns,
    rows: exportedRows,
    fileName: schema.id,
    landscape: true,
    summary: [{ label: "إجمالي الموظفين", value: exportedRows.length }],
  });

  const handleExcel = () => exportReportExcel({
    title: schema.title,
    subtitle: reportSubtitle,
    columns: reportColumns,
    rows: exportedRows,
    fileName: schema.title,
  });

  const renderFilter = (filter: ReportFilter) => {
    if (filter.type === "select") {
      const dynamicOptions = filterOptions[filter.id as keyof typeof filterOptions];
      const options = dynamicOptions ? ["الكل", ...dynamicOptions] : filter.options ?? [];
      return (
        <select value={filterValues[filter.id] || options[0] || ""} onChange={(event) => handleFilterChange(filter.id, event.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10">
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    if (filter.type === "date") {
      return (
        <div className="relative">
          <input type="date" value={filterValues[filter.id] || ""} onChange={(event) => handleFilterChange(filter.id, event.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-[#004e89] outline-none px-3 py-2.5 h-10 pr-10" />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      );
    }
    return null;
  };

  const toggleRow = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800">{schema.title}</h2>
        <div className="flex gap-2">
          <button onClick={handlePrint} disabled={exportedRows.length === 0} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm disabled:opacity-50 flex items-center gap-2"><Printer className="h-4 w-4" />طباعة / PDF</button>
          <button onClick={handleExcel} disabled={exportedRows.length === 0} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50 flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />تصدير Excel</button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4">
          {schema.filters.map((filter) => (
            <div key={filter.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">{filter.required && <span className="text-red-500">*</span>}{filter.label}</label>
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button onClick={() => setSelectionMode("all")} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm", selectionMode === "all" ? "bg-[#004e89] text-white" : "bg-white border border-[#004e89] text-[#004e89]")}><Users className="w-4 h-4" />جميع الموظفين</button>
          <button onClick={() => setSelectionMode("custom")} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm", selectionMode === "custom" ? "bg-[#004e89] text-white" : "bg-white border border-[#004e89] text-[#004e89]")}><UserCheck className="w-4 h-4" />اختيار الموظفين</button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>عرض</span>
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="border border-gray-300 rounded px-2 py-1 bg-white"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
              <span>من السجلات</span>
            </div>
            <div className="relative"><Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="بحث" className="pl-3 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-[#004e89]" /></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white font-medium"><tr><th className="px-4 py-3 w-12 text-center">{selectionMode === "custom" && <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id))} onChange={() => setSelectedIds(new Set(pageRows.every((row) => selectedIds.has(row.id)) ? [] : pageRows.map((row) => row.id)))} />}</th><th className="px-4 py-3">الرقم الوظيفي</th>{schema.tableColumns.map((column) => <th key={column} className="px-4 py-3 border-r border-white/10">{column}</th>)}<th className="px-4 py-3">عدد السجلات</th><th className="px-4 py-3">تفاصيل التقرير</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="py-14 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#004e89]" /><p className="mt-2 text-gray-500">جاري جلب بيانات الموظفين...</p></td></tr> : error ? <tr><td colSpan={9} className="py-12 text-center text-red-600">{error}</td></tr> : pageRows.length === 0 ? <tr><td colSpan={9} className="py-12 text-center text-gray-500">لا يوجد موظفون لديهم بيانات في هذا التقرير</td></tr> : pageRows.map((row) => <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100"><td className="px-4 py-3 text-center">{selectionMode === "custom" && <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} />}</td><td className="px-4 py-3 text-gray-600">{row.emp_id || "-"}</td><td className="px-4 py-3 font-medium text-gray-800">{row.name}</td><td className="px-4 py-3 text-gray-600">{row.job_title || "-"}</td><td className="px-4 py-3 text-gray-600">{row.department || "-"}</td><td className="px-4 py-3 text-gray-600">{row.directorate || "-"}</td><td className="px-4 py-3 text-gray-600">{row.branch || "-"}</td><td className="px-4 py-3 text-center font-semibold">{row.recordCount}</td><td className="px-4 py-3 text-gray-600 min-w-56">{row.details || "-"}</td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
            <div>{rows.length ? `إظهار ${(safePage - 1) * pageSize + 1} إلى ${Math.min(safePage * pageSize, rows.length)} من أصل ${rows.length} موظف` : "0 موظف"}</div>
            <div className="flex gap-1"><button disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="px-3 py-1.5 rounded border border-gray-300 bg-white disabled:opacity-50">السابق</button><span className="px-3 py-1.5 rounded bg-[#004e89] text-white">{safePage}</span><button disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="px-3 py-1.5 rounded border border-gray-300 bg-white disabled:opacity-50">التالي</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
