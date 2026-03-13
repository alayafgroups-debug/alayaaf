import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

type LogEntry = {
  id: string;
  user_name: string;
  created_at: string;
  module: string;
  module_label: string;
  operation: string;
  details: string;
};

const MODULE_COLORS: Record<string, string> = {
  attendance: "bg-blue-100 text-blue-700",
  employees: "bg-emerald-100 text-emerald-700",
  payroll: "bg-rose-100 text-rose-700",
  leaves: "bg-amber-100 text-amber-700",
  settings: "bg-purple-100 text-purple-700",
};

export default function HRUserLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("user_logs").select("*").order("created_at", { ascending: false }).limit(100);
        if (data) setLogs(data.map((r: any) => ({
          id: String(r.id), user_name: r.user_name ?? "", created_at: r.created_at ?? "",
          module: r.module ?? "", module_label: r.module_label ?? r.module ?? "",
          operation: r.operation ?? "", details: r.details ?? "",
        })));
      } catch { setLogs([]); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (moduleFilter && l.module !== moduleFilter) return false;
    if (search && !l.user_name.includes(search) && !l.operation.includes(search)) return false;
    return true;
  });

  const modules = [...new Set(logs.map((l) => l.module).filter(Boolean))];

  const handleExport = () => {
    const headers = ["المستخدم", "التاريخ", "الموديول", "العملية", "التفاصيل"];
    const rows = filtered.map((l) => [l.user_name, l.created_at, l.module_label, l.operation, l.details]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "user_logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-full space-y-4 p-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">سجلات المستخدمين</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} title="تصدير" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><Download className="h-4 w-4" /></button>
            <button onClick={() => window.print()} title="طباعة" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"><Printer className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap bg-white border rounded-xl px-4 py-3 shadow-sm">
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white outline-none">
            <option value="">كل الموديولات</option>
            {modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="بحث باسم المستخدم أو العملية..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 border rounded-lg text-sm outline-none" />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} سجل</span>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#004e89] text-white">
                  <th className="px-4 py-3 text-right font-medium">المستخدم</th>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">الموديول</th>
                  <th className="px-4 py-3 text-right font-medium">العملية</th>
                  <th className="px-4 py-3 text-right font-medium">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-400">لا توجد سجلات</td></tr>
                ) : filtered.map((log, i) => (
                  <tr key={log.id} className={cn("border-b hover:bg-blue-50/30", i % 2 === 0 ? "bg-white" : "bg-gray-50/40")}>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{log.user_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{log.created_at}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", MODULE_COLORS[log.module] ?? "bg-gray-100 text-gray-600")}>{log.module_label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{log.operation}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
