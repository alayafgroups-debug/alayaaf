import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type PayrollRow = {
  id: string;
  empName: string;
  department: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
};

const now = new Date();
const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export default function HRPayrollTransfer() {
  const [period, setPeriod] = useState(defaultPeriod);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const load = async (p: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll")
      .select("id, emp_name, department, basic_salary, allowances, deductions, net_salary, status")
      .eq("month", p)
      .order("emp_name");
    setLoading(false);
    if (error) {
      toast({ title: "تعذر تحميل كشف الرواتب", description: error.message, variant: "destructive" });
      return;
    }
    setRows(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        empName: String(r.emp_name ?? "-"),
        department: String(r.department ?? "-"),
        basic: Number(r.basic_salary ?? 0),
        allowances: Number(r.allowances ?? 0),
        deductions: Number(r.deductions ?? 0),
        net: Number(r.net_salary ?? 0),
        status: String(r.status ?? "معلق"),
      }))
    );
  };

  useEffect(() => {
    load(period);
  }, [period]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          basic: acc.basic + r.basic,
          allowances: acc.allowances + r.allowances,
          deductions: acc.deductions + r.deductions,
          net: acc.net + r.net,
        }),
        { basic: 0, allowances: 0, deductions: 0, net: 0 }
      ),
    [rows]
  );

  const transferable = rows.filter((r) => r.status !== "مرحّل" && r.status !== "موقوف");
  const alreadyTransferred = rows.filter((r) => r.status === "مرحّل").length;

  const handleTransfer = async () => {
    if (transferable.length === 0) {
      toast({ title: "لا يوجد ما يمكن ترحيله", description: "جميع سجلات هذه الفترة مُرحّلة أو موقوفة", variant: "destructive" });
      return;
    }
    setTransferring(true);
    const { error } = await supabase
      .from("payroll")
      .update({ status: "مرحّل" })
      .eq("month", period)
      .not("status", "in", "(مرحّل,موقوف)");
    setTransferring(false);
    if (error) {
      toast({ title: "تعذر الترحيل", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الترحيل", description: `تم ترحيل ${transferable.length} سجل راتب للفترة ${period} إلى النظام المحاسبي` });
    load(period);
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-bold text-gray-800">ترحيل حساب الراتب إلى النظام المحاسبي</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">الفترة</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 border border-gray-300 rounded-md px-3 text-sm" />
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3 bg-[#004e89]/5 rounded-xl p-4">
              <div className="w-12 h-12 bg-[#004e89]/10 rounded-full flex items-center justify-center text-[#004e89] shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                ترحيل استحقاقات واستقطاعات رواتب الفترة المحددة إلى النظام المحاسبي. بعد الترحيل تتحول حالة السجل إلى «مرحّل» ولا يُرحّل مرة أخرى.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="إجمالي الأساسي" value={totals.basic} />
              <SummaryCard label="إجمالي البدلات" value={totals.allowances} />
              <SummaryCard label="إجمالي الاستقطاعات" value={totals.deductions} tone="red" />
              <SummaryCard label="صافي الرواتب" value={totals.net} tone="green" />
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="py-3 px-4">الموظف</th>
                    <th className="py-3 px-4">القسم</th>
                    <th className="py-3 px-4">الأساسي</th>
                    <th className="py-3 px-4">البدلات</th>
                    <th className="py-3 px-4">الاستقطاعات</th>
                    <th className="py-3 px-4">الصافي</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">لا يوجد كشف رواتب لهذه الفترة</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-medium">{r.empName}</td>
                      <td className="py-2.5 px-4">{r.department}</td>
                      <td className="py-2.5 px-4">{r.basic.toFixed(2)}</td>
                      <td className="py-2.5 px-4">{r.allowances.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-red-600">{r.deductions.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-700">{r.net.toFixed(2)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "مرحّل" ? "bg-emerald-100 text-emerald-700" : r.status === "موقوف" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {alreadyTransferred} سجل مُرحّل مسبقاً • {transferable.length} جاهز للترحيل
              </div>
              <Button onClick={handleTransfer} disabled={transferring || transferable.length === 0} className="bg-[#004e89] hover:bg-[#003865] text-white h-11 px-8 rounded-lg">
                {transferring ? "جاري الترحيل..." : "البدء في الترحيل"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-700" : "text-gray-900";
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</div>
    </div>
  );
}
