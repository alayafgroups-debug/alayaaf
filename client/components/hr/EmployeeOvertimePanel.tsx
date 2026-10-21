import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { fetchAllRows } from "@/lib/fetchAll";
import { hrRequestErrorText } from "@/lib/hrErrors";
import { isApprovedStatus, isRejectedStatus } from "@/lib/hrStatus";
import { useI18n } from "@/i18n";

/**
 * الساعات الإضافية للموظف (HR-14، كتبويب «عدد الساعات الإضافية» في سمارت): كل سجلاته في overtime_records
 * مع الإجمالي لكل شهر. المعتمد فقط يدخل كشف الراتب. التسجيل والحذف من صفحتي «حساب الدوام» و«الساعات الإضافية».
 */
type OvertimeRow = {
  id: string;
  date: string;
  periodFrom: string;
  month: string;
  hours: number;
  amount: number;
  status: string;
  notes: string;
  createdBy: string;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const text = (value: unknown) => String(value ?? "").trim();

export default function EmployeeOvertimePanel({ employeeId, onCountChange }: {
  employeeId: string;
  onCountChange?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const { t, formatNumber } = useI18n();
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setMonth(""); setNoAccess(false);
    void (async () => {
      try {
        // قراءة الإضافي لمسؤولي الحضور أو الرواتب أو التأمينات أو التقارير (كقاعدة البيانات)؛ غيرهم يرى رسالة لا قائمة فارغة
        const { data: allowed, error: accessError } = await supabase.rpc("hr_area_allowed", { p_areas: ["hr.attendance", "hr.payroll", "hr.insurance", "hr.reports"], p_manage: false });
        if (!active) return;
        if (!accessError && allowed !== true) { setNoAccess(true); setRows([]); return; }
        const data = await fetchAllRows<Record<string, unknown>>((from, to) => supabase
          .from("overtime_records")
          .select("*")
          .eq("employee_id", employeeId)
          .order("date", { ascending: false })
          .order("id")
          .range(from, to));
        if (!active) return;
        const list = data.map((row) => {
          const date = text(row.date).slice(0, 10);
          return {
            id: text(row.id),
            date,
            periodFrom: text(row.period_from).slice(0, 10),
            month: date.slice(0, 7),
            hours: Number(row.hours) || 0,
            amount: round2(Number(row.amount) || 0),
            status: text(row.status) || "معلق",
            notes: text(row.notes),
            createdBy: text(row.created_by_name),
          };
        });
        setRows(list);
        onCountChange?.(list.length);
      } catch (loadError) {
        if (!active) return;
        setRows([]);
        setError(hrRequestErrorText(loadError, t("تعذر تحميل الساعات الإضافية")));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const money = (value: number) => `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("ر.س")}`;
  const hoursText = (value: number) => formatNumber(round2(value), { maximumFractionDigits: 2 });
  const statusOf = (status: string) => (isApprovedStatus(status) ? "approved" : isRejectedStatus(status) ? "rejected" : "pending");

  const months = useMemo(() => [...new Set(rows.map((row) => row.month).filter(Boolean))].sort().reverse(), [rows]);
  const visible = useMemo(() => (month ? rows.filter((row) => row.month === month) : rows), [rows, month]);
  // الإجمالي لكل شهر: المعتمد (يدخل الراتب) والمعلق
  const byMonth = useMemo(() => {
    const map = new Map<string, { approvedHours: number; approvedAmount: number; pendingHours: number }>();
    rows.forEach((row) => {
      const kind = statusOf(row.status);
      if (kind === "rejected") return;
      const item = map.get(row.month) ?? { approvedHours: 0, approvedAmount: 0, pendingHours: 0 };
      if (kind === "approved") { item.approvedHours += row.hours; item.approvedAmount = round2(item.approvedAmount + row.amount); }
      else item.pendingHours += row.hours;
      map.set(row.month, item);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => visible.reduce((sum, row) => {
    const kind = statusOf(row.status);
    if (kind === "approved") { sum.approvedHours += row.hours; sum.approvedAmount = round2(sum.approvedAmount + row.amount); }
    else if (kind === "pending") sum.pendingHours += row.hours;
    return sum;
  }, { approvedHours: 0, approvedAmount: 0, pendingHours: 0 }), [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (status: string) => {
    const kind = statusOf(status);
    const style = kind === "approved" ? "bg-emerald-50 text-emerald-700" : kind === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
    return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${style}`}>{t(kind === "approved" ? "معتمد" : kind === "rejected" ? "مرفوض" : "معلق")}</span>;
  };

  if (loading) return <p className="py-6 text-center text-gray-400">{t("جاري التحميل...")}</p>;
  if (noAccess) return <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t("عرض الساعات الإضافية يتطلب صلاحية الحضور أو الرواتب أو التأمينات أو التقارير")}</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{t("الساعات الإضافية المسجلة للموظف. المعتمد منها فقط يدخل كشف الراتب. تُسجَّل من «حساب الدوام» وتُحذف من صفحة «الساعات الإضافية»")}</p>
      {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-semibold text-slate-600">
          <span className="block">{t("الشهر")}</span>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">
            <option value="">{t("كل الأشهر")}</option>
            {months.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-emerald-50 p-2"><span className="block text-xs text-emerald-700">{t("إجمالي الساعات المعتمدة")}</span><strong className="text-emerald-800">{hoursText(totals.approvedHours)}</strong></div>
          <div className="rounded-md bg-sky-50 p-2"><span className="block text-xs text-sky-700">{t("إجمالي مبلغ الإضافي المعتمد")}</span><strong className="text-sky-800">{money(totals.approvedAmount)}</strong></div>
          <div className="rounded-md bg-amber-50 p-2"><span className="block text-xs text-amber-700">{t("ساعات معلقة (لا تدخل الراتب)")}</span><strong className="text-amber-800">{hoursText(totals.pendingHours)}</strong></div>
        </div>
      </div>

      {!month && byMonth.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("الشهر")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("الساعات المعتمدة")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("المبلغ المعتمد")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("ساعات معلقة")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {byMonth.map(([key, item]) => (
                <tr key={key} className="cursor-pointer hover:bg-gray-50/60" onClick={() => setMonth(key)}>
                  <td className="px-3 py-2 font-semibold text-[#004e89]">{key}</td>
                  <td className="px-3 py-2">{hoursText(item.approvedHours)}</td>
                  <td className="px-3 py-2">{money(item.approvedAmount)}</td>
                  <td className="px-3 py-2">{item.pendingHours > 0 ? hoursText(item.pendingHours) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-[#075f94] text-white">
            <tr>
              <th className="px-3 py-2 text-start font-medium">{t("التاريخ")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("الساعات")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("المبلغ")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("الحالة")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("سجّلها")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("ملاحظات")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">{t("لا توجد ساعات إضافية")}</td></tr>
            ) : visible.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2">{row.periodFrom && row.periodFrom < row.date ? `${row.periodFrom} — ${row.date}` : row.date}</td>
                <td className="px-3 py-2 font-semibold">{hoursText(row.hours)}</td>
                <td className="px-3 py-2">{money(row.amount)}</td>
                <td className="px-3 py-2">{badge(row.status)}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.createdBy || "—"}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => navigate("/hr/attendance/overtime")} className="text-xs text-blue-700 hover:underline">{t("صفحة الساعات الإضافية")}</button>
    </div>
  );
}
