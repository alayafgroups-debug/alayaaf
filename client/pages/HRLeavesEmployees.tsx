import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, FileText, Printer, Eye, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type LeaveRequest = {
  id: string;
  employeeId: string;
  empName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  notes: string;
  createdAt: string;
};

const mapRow = (r: Record<string, unknown>): LeaveRequest => ({
  id: String(r.id ?? ""),
  employeeId: String(r.employee_id ?? ""),
  empName: String(r.emp_name ?? ""),
  leaveType: String(r.leave_type ?? ""),
  startDate: String(r.start_date ?? ""),
  endDate: String(r.end_date ?? ""),
  days: Number(r.days ?? 0),
  status: String(r.status ?? "معلقة"),
  notes: String(r.notes ?? ""),
  createdAt: String(r.created_at ?? ""),
});

const STATUS_COLORS: Record<string, string> = {
  "معلقة": "bg-yellow-100 text-yellow-700",
  "معتمدة": "bg-emerald-100 text-emerald-700",
  "مرفوضة": "bg-red-100 text-red-700",
};

export default function HRLeavesEmployees() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("leave_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setLeaves(data.map(mapRow));
      } catch { /* no-op */ } finally { setLoading(false); }
    };
    load();
  }, [refreshKey]);

  const handleApprove = async (leave: LeaveRequest) => {
    await supabase.from("leave_requests").update({ status: "معتمدة" }).eq("id", leave.id);
    setLeaves((prev) => prev.map((l) => l.id === leave.id ? { ...l, status: "معتمدة" } : l));
    toast({ title: "تمت الموافقة على الطلب" });
  };

  const handleReject = async (leave: LeaveRequest) => {
    await supabase.from("leave_requests").update({ status: "مرفوضة" }).eq("id", leave.id);
    setLeaves((prev) => prev.map((l) => l.id === leave.id ? { ...l, status: "مرفوضة" } : l));
    toast({ title: "تم رفض الطلب" });
  };

  if (showForm) {
    return <LeaveForm onBack={() => setShowForm(false)} onSaved={() => { setShowForm(false); setRefreshKey((k) => k + 1); }} />;
  }

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">طلبات الإجازات</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#004e89] rounded-lg text-sm font-medium hover:bg-gray-100 transition">
                <Plus className="h-4 w-4" /> طلب إجازة جديد
              </button>
              <button className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 font-medium">#</th>
                  <th className="py-3 px-3 font-medium">الموظف</th>
                  <th className="py-3 px-3 font-medium">نوع الإجازة</th>
                  <th className="py-3 px-3 font-medium">تاريخ البداية</th>
                  <th className="py-3 px-3 font-medium">تاريخ النهاية</th>
                  <th className="py-3 px-3 font-medium">المدة (أيام)</th>
                  <th className="py-3 px-3 font-medium">الحالة</th>
                  <th className="py-3 px-3 font-medium">ملاحظات</th>
                  <th className="py-3 px-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
                ) : leaves.length === 0 ? (
                  <tr><td colSpan={9} className="py-8 text-center text-gray-400">لا توجد طلبات إجازة</td></tr>
                ) : (
                  leaves.map((leave, i) => (
                    <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3">{i + 1}</td>
                      <td className="py-3 px-3 font-medium text-gray-900">{leave.empName}</td>
                      <td className="py-3 px-3">{leave.leaveType}</td>
                      <td className="py-3 px-3">{leave.startDate}</td>
                      <td className="py-3 px-3">{leave.endDate}</td>
                      <td className="py-3 px-3">{leave.days}</td>
                      <td className="py-3 px-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[leave.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 max-w-[200px] truncate">{leave.notes || "—"}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 justify-center">
                          {leave.status === "معلقة" && (
                            <>
                              <button onClick={() => handleApprove(leave)} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">موافقة</button>
                              <button onClick={() => handleReject(leave)} className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">رفض</button>
                            </>
                          )}
                          <button className="text-gray-400 hover:text-[#004e89]">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">يعرض {leaves.length} سجل</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function LeaveForm({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [empName, setEmpName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("إجازة سنوية");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const loadEmps = async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("status", "نشط");
      if (data) setEmployees(data.map((e) => ({ id: String(e.id), name: String(e.name) })));
    };
    loadEmps();
  }, []);

  const days = startDate && endDate ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1) : 0;

  const handleSave = async () => {
    if (!empName || !startDate || !endDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await supabase.from("leave_requests").insert([{
        employee_id: employeeId || null,
        emp_name: empName,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days,
        status: "معلقة",
        notes,
      }]);
      toast({ title: "تم تقديم الطلب", description: `طلب إجازة ${empName} تم تسجيله` });
      onSaved();
    } catch {
      toast({ title: "خطأ", description: "فشل في حفظ الطلب", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div dir="rtl" className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">طلب إجازة جديد</h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"><X className="h-4 w-4" /> إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#004e89] text-white text-sm font-medium hover:bg-[#003d6e] disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ"}</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الموظف *</label>
            <select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); const emp = employees.find((em) => em.id === e.target.value); if (emp) setEmpName(emp.name); }} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="">اختر الموظف</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الإجازة *</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
              <option>إجازة سنوية</option><option>إجازة مرضية</option><option>إجازة طارئة</option><option>إجازة بدون راتب</option><option>إجازة زواج</option><option>إجازة وفاة</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية *</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          {days > 0 && <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 font-medium">عدد الأيام: {days} يوم</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" /></div>
        </div>
      </div>
    </Layout>
  );
}
