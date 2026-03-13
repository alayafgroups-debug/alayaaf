import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Schedule = { id: string; name: string; employees: number; shifts: number; hours: string; type: string };

export default function HRAttendanceSchedules() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formShifts, setFormShifts] = useState("1");
  const [formHours, setFormHours] = useState("09:00:00");
  const [formType, setFormType] = useState("جدول عمل ثابت");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("attendance_schedules").select("*").order("id");
      if (data) setItems(data.map((r: any) => ({
        id: String(r.id), name: r.name ?? "", employees: r.employees ?? 0,
        shifts: r.shifts ?? 1, hours: r.hours ?? "09:00:00", type: r.type ?? "جدول عمل ثابت",
      })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormName(""); setFormShifts("1"); setFormHours("09:00:00"); setFormType("جدول عمل ثابت"); };

  const startEdit = (item: Schedule) => {
    setEditingId(item.id); setFormName(item.name); setFormShifts(String(item.shifts));
    setFormHours(item.hours); setFormType(item.type); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "خطأ", description: "اسم الجدول مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { name: formName, shifts: Number(formShifts), hours: formHours, type: formType };
      if (editingId) {
        await supabase.from("attendance_schedules").update(payload).eq("id", editingId);
        toast({ title: "تم التعديل" });
      } else {
        await supabase.from("attendance_schedules").insert([payload]);
        toast({ title: "تمت الإضافة" });
      }
      resetForm(); loadData();
    } catch { toast({ title: "خطأ", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleDelete = async (item: Schedule) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    await supabase.from("attendance_schedules").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "تم الحذف" });
  };

  const filtered = items.filter((i) => !search || i.name.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" dir="rtl">
        {/* Attendance Settings */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-50 border-b p-4"><h2 className="text-lg font-bold text-gray-800">إعدادات الحضور</h2></div>
          <div className="p-6">
            <div className="flex flex-wrap gap-8 items-center text-sm text-gray-700">
              <div className="flex items-center gap-2"><Checkbox id="hide-unused" /><label htmlFor="hide-unused" className="cursor-pointer">إخفاء سجلات البصمة غير المستخدمة</label></div>
              <div className="flex items-center gap-2"><Checkbox id="show-chart" /><label htmlFor="show-chart" className="cursor-pointer">عرض مخطط جدول العمل</label></div>
              <div className="flex items-center gap-2"><Checkbox id="show-exit" /><label htmlFor="show-exit" className="cursor-pointer">عرض خروج الموظف للبصمة في يوم الدخول</label></div>
            </div>
          </div>
        </div>

        {/* Work Schedules */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">جداول العمل</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#004e89] hover:bg-[#003865]">
            <Plus className="h-4 w-4 ml-2" /> إضافة جدول
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل الجدول" : "جدول عمل جديد"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium mb-1">اسم الجدول *</label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">عدد الفترات</label><Input type="number" value={formShifts} onChange={(e) => setFormShifts(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">عدد الساعات</label><Input value={formHours} onChange={(e) => setFormHours(e.target.value)} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">نوع الجدول</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
                  <option value="جدول عمل ثابت">جدول عمل ثابت</option>
                  <option value="جدول عمل متغير">جدول عمل متغير</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865]"><Save className="h-4 w-4 ml-1" /> {saving ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 ml-1" /> إلغاء</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
            </div>
            <span className="text-sm text-gray-500">{filtered.length} سجل</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium w-16">#</th>
                  <th className="py-3 px-4 font-medium">الاسم</th>
                  <th className="py-3 px-4 font-medium">عدد الموظفين</th>
                  <th className="py-3 px-4 font-medium">عدد الفترات</th>
                  <th className="py-3 px-4 font-medium">عدد الساعات</th>
                  <th className="py-3 px-4 font-medium">نوع جدول العمل</th>
                  <th className="py-3 px-4 font-medium text-center w-24">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{i + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4">{item.employees}</td>
                    <td className="py-3 px-4">{item.shifts}</td>
                    <td className="py-3 px-4">{item.hours}</td>
                    <td className="py-3 px-4">{item.type}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-[#004e89]"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(item)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
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
