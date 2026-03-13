import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type TermRow = {
  id: string; jobId: string; name: string; department: string; reason: string;
  terminationDate: string; reward: string; leaveValue: string; total: string; status: string;
};

type Employee = { id: string; employee_id: string; name: string; department: string; base_salary: number; hire_date: string };

export default function HRTerminationEmployees() {
  const [items, setItems] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selEmp, setSelEmp] = useState("");
  const [reason, setReason] = useState("");
  const [termDate, setTermDate] = useState("");
  const [reward, setReward] = useState("0");
  const [leaveVal, setLeaveVal] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("hr_terminations").select("*").order("created_at", { ascending: false });
      if (data) setItems(data.map((r: any) => ({
        id: String(r.id), jobId: r.job_id ?? "", name: r.emp_name ?? "",
        department: r.department ?? "", reason: r.reason ?? "",
        terminationDate: r.termination_date ?? "", reward: String(r.reward ?? "0.00"),
        leaveValue: String(r.leave_value ?? "0.00"), total: String(r.total ?? "0.00"),
        status: r.status ?? "معلق",
      })));
    } catch { setItems([]); } finally { setLoading(false); }
  };

  const loadEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, employee_id, name, department, base_salary, hire_date").eq("status", "نشط");
    if (data) setEmployees(data as Employee[]);
  };

  useEffect(() => { loadData(); loadEmployees(); }, []);

  const handleSave = async () => {
    const emp = employees.find((e) => e.id === selEmp);
    if (!emp || !reason || !termDate) { toast({ title: "خطأ", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const totalVal = (Number(reward) + Number(leaveVal)).toFixed(2);
      await supabase.from("hr_terminations").insert([{
        emp_id: emp.id, job_id: emp.employee_id, emp_name: emp.name,
        department: emp.department, reason, termination_date: termDate,
        reward: Number(reward), leave_value: Number(leaveVal), total: Number(totalVal),
        notes, status: "معلق",
      }]);
      toast({ title: "تم حفظ إنهاء الخدمة" });
      setShowAdd(false); loadData();
    } catch { toast({ title: "خطأ", variant: "destructive" }); } finally { setSaving(false); }
  };

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.jobId.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">إنهاء خدمة الموظفين</h1>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-[#004e89] hover:bg-[#003865]"><Plus className="h-4 w-4 ml-2" /> إنهاء خدمة</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader><DialogTitle>إنهاء خدمة موظف</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>الموظف *</Label>
                  <select value={selEmp} onChange={(e) => setSelEmp(e.target.value)} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
                    <option value="">اختر الموظف</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name} - {e.employee_id}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>سبب إنهاء الخدمة *</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="space-y-2"><Label>تاريخ إنهاء الخدمة *</Label><Input type="date" value={termDate} onChange={(e) => setTermDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>مكافأة نهاية الخدمة</Label><Input type="number" value={reward} onChange={(e) => setReward(e.target.value)} /></div>
                <div className="space-y-2"><Label>قيمة الإجازات المتبقية</Label><Input type="number" value={leaveVal} onChange={(e) => setLeaveVal(e.target.value)} /></div>
                <div className="space-y-2"><Label>الإجمالي</Label><Input readOnly className="bg-gray-100" value={(Number(reward) + Number(leaveVal)).toFixed(2)} /></div>
                <div className="col-span-2 space-y-2"><Label>ملاحظات</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865]">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[1200px]">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium">الرقم الوظيفي</th>
                  <th className="py-3 px-4 font-medium">الاسم</th>
                  <th className="py-3 px-4 font-medium">الإدارة</th>
                  <th className="py-3 px-4 font-medium">سبب إنهاء الخدمة</th>
                  <th className="py-3 px-4 font-medium">تاريخ الإنهاء</th>
                  <th className="py-3 px-4 font-medium">المكافأة</th>
                  <th className="py-3 px-4 font-medium">الإجازات</th>
                  <th className="py-3 px-4 font-medium">الإجمالي</th>
                  <th className="py-3 px-4 font-medium text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{row.jobId}</td>
                    <td className="py-3 px-4 font-medium">{row.name}</td>
                    <td className="py-3 px-4">{row.department}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{row.reason}</td>
                    <td className="py-3 px-4">{row.terminationDate}</td>
                    <td className="py-3 px-4">{row.reward}</td>
                    <td className="py-3 px-4">{row.leaveValue}</td>
                    <td className="py-3 px-4">{row.total}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === "موافق عليه" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"}`}>{row.status}</span>
                    </td>
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
