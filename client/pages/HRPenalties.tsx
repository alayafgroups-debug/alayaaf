import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Search, FileText, AlertTriangle, ShieldCheck, Archive, Loader2, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type RecentRow = {
  id: string;
  empName: string;
  kind: string;
  subject: string;
  date: string;
  status: string;
};

const quickLinks = [
  { to: "/hr/penalties/investigations", label: "المساءلات", desc: "إنشاء وإرسال مساءلة للموظف", icon: FileText },
  { to: "/hr/penalties/warnings", label: "الإنذارات", desc: "إصدار إنذار رسمي", icon: AlertTriangle },
  { to: "/hr/penalties/archive", label: "أرشيف الجزاءات", desc: "سجل الجزاءات المطبّقة", icon: Archive },
  { to: "/hr/penalties/decisions", label: "القرارات النهائية", desc: "قائمة أنواع القرارات", icon: ShieldCheck },
];

export default function HRPenalties() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ investigations: 0, warnings: 0, penalties: 0, types: 0 });
  const [recent, setRecent] = useState<RecentRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [inv, warn, pen, types] = await Promise.all([
          supabase.from("penalty_investigations").select("*", { count: "exact" }).order("sent_at", { ascending: false }).limit(20),
          supabase.from("penalty_warnings").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(20),
          supabase.from("penalties").select("id", { count: "exact", head: true }),
          supabase.from("penalty_types").select("id", { count: "exact", head: true }),
        ]);

        setCounts({
          investigations: inv.count ?? 0,
          warnings: warn.count ?? 0,
          penalties: pen.count ?? 0,
          types: types.count ?? 0,
        });

        const invRows: RecentRow[] = (inv.data ?? []).map((r: any) => ({
          id: String(r.id),
          empName: String(r.emp_name ?? ""),
          kind: "مساءلة",
          subject: String(r.subject ?? r.penalty_type_name ?? ""),
          date: String(r.investigation_date ?? r.sent_at ?? "").slice(0, 10),
          status: String(r.status ?? "مرسلة"),
        }));
        const warnRows: RecentRow[] = (warn.data ?? []).map((r: any) => ({
          id: String(r.id),
          empName: String(r.emp_name ?? ""),
          kind: "إنذار",
          subject: String(r.subject ?? r.reason ?? ""),
          date: String(r.warning_date ?? r.created_at ?? "").slice(0, 10),
          status: String(r.status ?? "صادر"),
        }));
        setRecent(
          [...invRows, ...warnRows]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 15),
        );
      } catch (e) {
        toast({ title: "تعذّر تحميل البيانات", description: e instanceof Error ? e.message : "خطأ", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const k = search.trim();
    if (!k) return recent;
    return recent.filter((r) => [r.empName, r.kind, r.subject, r.status].some((v) => v.includes(k)));
  }, [recent, search]);

  const stats = [
    { label: "المساءلات", value: counts.investigations, icon: FileText, color: "bg-blue-50 text-blue-600" },
    { label: "الإنذارات", value: counts.warnings, icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
    { label: "الجزاءات المطبّقة", value: counts.penalties, icon: Archive, color: "bg-red-50 text-red-600" },
    { label: "أنواع المخالفات", value: counts.types, icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المساءلات والإنذارات</h1>
          <p className="mt-1 text-sm text-gray-500">نظرة عامة على مساءلات وإنذارات وجزاءات الموظفين</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((st) => (
            <div key={st.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${st.color}`}>
                <st.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{loading ? "…" : st.value}</div>
                <div className="text-xs text-gray-500">{st.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-[#004e89] hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <q.icon className="h-6 w-6 text-[#004e89]" />
                <ChevronLeft className="h-4 w-4 text-gray-300 group-hover:text-[#004e89]" />
              </div>
              <div className="mt-3 font-bold text-gray-800">{q.label}</div>
              <div className="text-xs text-gray-500 mt-1">{q.desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-800">أحدث المساءلات والإنذارات</h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-3 pr-9 h-10" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[720px]">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-medium">النوع</th>
                  <th className="py-3 px-4 font-medium">اسم الموظف</th>
                  <th className="py-3 px-4 font-medium">الموضوع</th>
                  <th className="py-3 px-4 font-medium">التاريخ</th>
                  <th className="py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#004e89]" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      لا توجد مساءلات أو إنذارات بعد
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.kind + r.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span
                          className={
                            "px-2 py-0.5 rounded-full text-xs " +
                            (r.kind === "إنذار" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")
                          }
                        >
                          {r.kind}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{r.empName || "—"}</td>
                      <td className="py-3 px-4 text-gray-600">{r.subject || "—"}</td>
                      <td className="py-3 px-4 text-gray-500">{r.date || "—"}</td>
                      <td className="py-3 px-4 text-gray-600">{r.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
