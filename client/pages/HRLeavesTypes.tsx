import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type LeaveType = {
  id: string;
  name: string;
  name_en: string;
  max_days: number;
  deduction_percent: number;
  paid: boolean;
  affects_balance: boolean;
  gender: string;
  status: string;
};

export default function HRLeavesTypes() {
  const [items, setItems] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formDays, setFormDays] = useState("1");
  const [formDeduction, setFormDeduction] = useState("0");
  const [formPaid, setFormPaid] = useState(true);
  const [formAffects, setFormAffects] = useState(true);
  const [formGender, setFormGender] = useState("both");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("leave_types").select("*").order("id");
      if (error) throw error;
      if (data) setItems(data.map((r: any) => ({
        id: String(r.id), name: r.name ?? "", name_en: r.name_en ?? "",
        max_days: r.max_days ?? 0, deduction_percent: r.deduction_percent ?? 0,
        paid: r.is_paid ?? true, affects_balance: r.affects_balance ?? true,
        gender: r.gender ?? "both", status: r.status ?? "مفعلة",
      })));
    } catch (error) {
      toast({ title: "تعذر تحميل تصنيفات الإجازات", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => {
    setShowForm(false); setEditingId(null);
    setFormName(""); setFormNameEn(""); setFormDays("1");
    setFormDeduction("0"); setFormPaid(true); setFormAffects(true); setFormGender("both");
  };

  const startEdit = (item: LeaveType) => {
    setEditingId(item.id); setFormName(item.name); setFormNameEn(item.name_en);
    setFormDays(String(item.max_days)); setFormDeduction(String(item.deduction_percent));
    setFormPaid(item.paid); setFormAffects(item.affects_balance); setFormGender(item.gender);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "خطأ", description: "اسم التصنيف مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(), name_en: formNameEn.trim(), max_days: Number(formDays),
        deduction_percent: Number(formDeduction), is_paid: formPaid,
        affects_balance: formAffects, gender: formGender,
      };
      if (editingId) {
        const { error } = await supabase.from("leave_types").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "تم التعديل بنجاح" });
      } else {
        const { error } = await supabase.from("leave_types").insert([payload]);
        if (error) throw error;
        toast({ title: "تمت الإضافة بنجاح" });
      }
      resetForm();
      await loadData();
    } catch (error) {
      toast({ title: "تعذر حفظ التصنيف", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: LeaveType) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    const { error } = await supabase.from("leave_types").delete().eq("id", item.id);
    if (error) {
      toast({ title: "تعذر حذف التصنيف", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "تم الحذف" });
  };

  const filtered = items.filter((i) => !search || i.name.includes(search) || i.name_en.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">تصنيف الإجازات</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#004e89] hover:bg-[#003865]">
            <Plus className="h-4 w-4 ml-2" /> تصنيف جديد
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل التصنيف" : "تصنيف جديد"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">الاسم بالعربية *</label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">الاسم بالإنجليزية</label><Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">مدة الإجازة (يوم)</label><Input type="number" value={formDays} onChange={(e) => setFormDays(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">نسبة الخصم (%)</label><Input type="number" value={formDeduction} onChange={(e) => setFormDeduction(e.target.value)} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">إجازة مدفوعة</label>
                <div className="flex gap-4 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formPaid} onChange={() => setFormPaid(true)} /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!formPaid} onChange={() => setFormPaid(false)} /><span>لا</span></label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تؤثر على الرصيد</label>
                <div className="flex gap-4 h-10 items-center">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formAffects} onChange={() => setFormAffects(true)} /><span>نعم</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!formAffects} onChange={() => setFormAffects(false)} /><span>لا</span></label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تقييد الجنس</label>
                <select value={formGender} onChange={(e) => setFormGender(e.target.value)} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
                  <option value="both">لكلا الجنسين</option>
                  <option value="male">ذكور فقط</option>
                  <option value="female">إناث فقط</option>
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
                  <th className="py-3 px-4 font-medium">اسم التصنيف</th>
                  <th className="py-3 px-4 font-medium">مدة الإجازة</th>
                  <th className="py-3 px-4 font-medium">نسبة الخصم</th>
                  <th className="py-3 px-4 font-medium text-center">الحالة</th>
                  <th className="py-3 px-4 font-medium text-center w-24">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{i + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.name}</td>
                    <td className="py-3 px-4">{item.max_days} يوم</td>
                    <td className="py-3 px-4">{item.deduction_percent}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded text-xs font-medium">{item.status}</span>
                    </td>
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
