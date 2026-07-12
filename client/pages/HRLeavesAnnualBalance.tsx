import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type BalanceRow = {
  id: string;
  empId: string;
  name: string;
  jobTitle: string;
  branch: string;
  department: string;
  administration: string;
  workLocation: string;
  hireDate: string;
  contractEndDate: string;
  annualEntitlement: number;
  prevYearBalance: number;
  endOfYearBalance: number;
  usedCurrentYear: number;
  remainingBalance: number;
  currentBalance: number;
  lastReturnDate: string;
};

function computeYearFraction(hireDateStr: string): number {
  if (!hireDateStr) return 1;
  const hire = new Date(hireDateStr);
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  if (hire <= yearStart) return 1;
  if (hire > now) return 0;
  const totalMs = now.getTime() - yearStart.getTime();
  const workedMs = now.getTime() - hire.getTime();
  return workedMs / totalMs;
}

export default function HRLeavesAnnualBalance() {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("الكل");
  const [deptFilter, setDeptFilter] = useState("الكل");
  const [locationFilter, setLocationFilter] = useState("الكل");
  const [adminFilter, setAdminFilter] = useState("الكل");
  const [workTimeFilter, setWorkTimeFilter] = useState("الكل");
  const [humanFilter, setHumanFilter] = useState("الكل");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [empsResult, leavesResult, leaveTypesResult] = await Promise.all([
          supabase
            .from("employees")
            .select("id, emp_id, name, job_title, branch, department, directorate, work_location, work_time, hire_date, contract_end_date, employment_type, status")
            .in("status", ["نشط", "فعال"])
            .order("name"),
          supabase
            .from("leave_requests")
            .select("emp_id, days, status, leave_type, start_date, end_date, created_at")
            .in("status", ["موافق", "معتمدة", "approved"]),
          supabase.from("leave_types").select("id, name, max_days"),
        ]);

        if (empsResult.error) throw empsResult.error;
        if (leavesResult.error) throw leavesResult.error;

        const employees = empsResult.data ?? [];
        const allLeaves = leavesResult.data ?? [];
        const leaveTypes = leaveTypesResult.data ?? [];

        // Determine annual leave entitlement days from leave_types (يجوز أن يكون اسم مختلف)
        const annualType = leaveTypes.find(
          (lt: any) =>
            String(lt.name ?? "").includes("سنوية") ||
            String(lt.name ?? "").toLowerCase().includes("annual")
        );
        const defaultAnnualDays: number = Number(annualType?.max_days ?? 21);

        const currentYear = new Date().getFullYear();

        // Build per-employee aggregated leave usage this year
        const usedThisYearMap: Record<string, number> = {};
        const lastReturnMap: Record<string, string> = {};

        allLeaves.forEach((l: any) => {
          const key = String(l.emp_id ?? "");
          if (!key) return;
          const isAnnual = String(l.leave_type ?? "").includes("سنوية") || String(l.leave_type ?? "") === "إجازة سنوية";
          const leaveYear = l.start_date ? new Date(l.start_date).getFullYear() : null;
          if (isAnnual && leaveYear === currentYear) {
            usedThisYearMap[key] = (usedThisYearMap[key] ?? 0) + Number(l.days ?? 0);
          }
          if (l.end_date && isAnnual) {
            const existing = lastReturnMap[key];
            if (!existing || l.end_date > existing) lastReturnMap[key] = String(l.end_date);
          }
        });

        const computed: BalanceRow[] = employees.map((e: any) => {
          const empId = String(e.emp_id ?? e.id ?? "");
          const hireDate = String(e.hire_date ?? "");

          // Prorated entitlement if hired this year
          const fraction = computeYearFraction(hireDate);
          const annualEntitlement = Math.round(defaultAnnualDays * fraction * 100) / 100;

          const prevYearBalance = 0; // future: query previous-year carryover
          const endOfYearBalance = annualEntitlement + prevYearBalance;

          const usedCurrentYear = usedThisYearMap[empId] ?? 0;
          const remainingBalance = endOfYearBalance - usedCurrentYear;

          // currentBalance = prorated up to today
          const monthsWorkedThisYear = Math.min(12, (new Date().getMonth() + 1));
          const currentBalance = Math.round(((defaultAnnualDays / 12) * monthsWorkedThisYear + prevYearBalance - usedCurrentYear) * 100) / 100;

          const lastReturnRaw = lastReturnMap[empId];
          let lastReturnDate = "-";
          if (lastReturnRaw) {
            const returnDate = new Date(lastReturnRaw);
            returnDate.setDate(returnDate.getDate() + 1);
            lastReturnDate = returnDate.toISOString().slice(0, 10);
          }

          return {
            id: String(e.id),
            empId,
            name: String(e.name ?? ""),
            jobTitle: String(e.job_title ?? ""),
            branch: String(e.branch ?? ""),
            department: String(e.department ?? ""),
            administration: String(e.directorate ?? e.department ?? ""),
            workLocation: String(e.work_location ?? ""),
            hireDate,
            contractEndDate: String(e.contract_end_date ?? ""),
            annualEntitlement,
            prevYearBalance,
            endOfYearBalance,
            usedCurrentYear,
            remainingBalance,
            currentBalance,
            lastReturnDate,
          };
        });

        setRows(computed);
      } catch (error) {
        toast({
          title: "تعذر تحميل أرصدة الإجازات",
          description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const options = useMemo(() => {
    const uniq = (vals: string[]) => ["الكل", ...Array.from(new Set(vals.filter(Boolean)))];
    return {
      branches: uniq(rows.map((r) => r.branch)),
      departments: uniq(rows.map((r) => r.department)),
      locations: uniq(rows.map((r) => r.workLocation)),
      admins: uniq(rows.map((r) => r.administration)),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return rows.filter((r) => {
      if (keyword && !r.name.includes(keyword) && !r.empId.includes(keyword)) return false;
      if (branchFilter !== "الكل" && r.branch !== branchFilter) return false;
      if (deptFilter !== "الكل" && r.department !== deptFilter) return false;
      if (locationFilter !== "الكل" && r.workLocation !== locationFilter) return false;
      if (adminFilter !== "الكل" && r.administration !== adminFilter) return false;
      return true;
    });
  }, [rows, search, branchFilter, deptFilter, locationFilter, adminFilter]);

  const exportCSV = () => {
    const headers = ["الرقم الوظيفي", "الاسم", "الرصيد السنوي", "رصيد سنوات سابقة", "حتى نهاية السنة الحالية", "رصيد متبقي من الإجازات", "رصيد اللحظة الحالية", "آخر عودة من أذن إجازة", "تاريخ التعاقد", "تاريخ الهيودة من أذن"].join(",");
    const csvRows = filtered.map((r) =>
      [r.empId, r.name, r.annualEntitlement.toFixed(2), r.prevYearBalance.toFixed(2), r.endOfYearBalance.toFixed(2), r.remainingBalance.toFixed(2), r.currentBalance.toFixed(2), r.lastReturnDate, r.hireDate, r.contractEndDate].join(",")
    );
    const blob = new Blob([headers + "\n" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `أرصدة_الإجازات_السنوية_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="w-full p-4 space-y-4" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900">أرصدة الإجازات</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>تاريخ التقرير: {new Date().toLocaleDateString("ar-SA")}</span>
            <button onClick={exportCSV} title="تصدير CSV" className="flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm">
              <Download className="h-4 w-4" /> تصدير
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap gap-2 items-end">
          <FilterSelect label="الفرع" value={branchFilter} onChange={setBranchFilter} options={options.branches} />
          <FilterSelect label="الإدارة" value={adminFilter} onChange={setAdminFilter} options={options.admins} />
          <FilterSelect label="القسم" value={deptFilter} onChange={setDeptFilter} options={options.departments} />
          <FilterSelect label="مكان العمل" value={locationFilter} onChange={setLocationFilter} options={options.locations} />
          <FilterSelect label="وقت العمل" value={workTimeFilter} onChange={setWorkTimeFilter} options={["الكل", "صباحي", "مسائي", "دوام كامل"]} />
          <FilterSelect label="الموارد البشرية" value={humanFilter} onChange={setHumanFilter} options={["الكل"]} />
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 h-9 text-sm" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-sm text-gray-600">
            <span>العدد {filtered.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center whitespace-nowrap">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-3 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-3 font-medium text-right">الاسم</th>
                  <th className="py-3 px-3 font-medium">الرصيد السنوي</th>
                  <th className="py-3 px-3 font-medium">رصيد متبقي من السنوات السابقة</th>
                  <th className="py-3 px-3 font-medium">الرصيد الكلية حتى نهاية السنة الحالية التعاقدية</th>
                  <th className="py-3 px-3 font-medium">رصيد متبقي من أذن السنة الحالية</th>
                  <th className="py-3 px-3 font-medium text-[#a5d8ff]">الرصيد الكلية حتى اللحظة الحالية المتاح</th>
                  <th className="py-3 px-3 font-medium">آخر عودة من أذن إجازة</th>
                  <th className="py-3 px-3 font-medium">تاريخ التعاقد</th>
                  <th className="py-3 px-3 font-medium">تاريخ الهيودة من أذن إجازة</th>
                  <th className="py-3 px-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={11} className="py-10 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="py-10 text-center text-gray-500">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3">{row.empId || "—"}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{row.name}</td>
                    <td className="py-2.5 px-3">{row.annualEntitlement.toFixed(2)}</td>
                    <td className="py-2.5 px-3">{row.prevYearBalance.toFixed(2)}</td>
                    <td className="py-2.5 px-3">{row.endOfYearBalance.toFixed(2)}</td>
                    <td className="py-2.5 px-3">{row.remainingBalance.toFixed(2)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#004e89]">{row.currentBalance.toFixed(2)}</td>
                    <td className="py-2.5 px-3">{row.lastReturnDate}</td>
                    <td className="py-2.5 px-3">{row.hireDate || "—"}</td>
                    <td className="py-2.5 px-3">{row.contractEndDate || "—"}</td>
                    <td className="py-2.5 px-3">
                      <button className="text-[#004e89] hover:underline text-xs">...</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 text-right">
            عرض 1 إلى {filtered.length} من أصل {rows.length} سجل
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[110px]">
      <span className="text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border border-gray-300 rounded-md px-2 bg-white text-sm outline-none focus:ring-1 focus:ring-[#004e89]"
      >
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
    </div>
  );
}
