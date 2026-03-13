import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Plus, Edit, Trash2, Save, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type PenaltyType = { id: string; nameAr: string; nameEn: string; limit: string; status: string };

export default function HRPenaltiesTypes() {
  const [items, setItems] = useState<PenaltyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNameAr, setFormNameAr] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formLimit, setFormLimit] = useState("90");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("penalty_types").select("*").order("id");
      if (data) setItems(data.map((r: any) => ({
        id: String(r.id), nameAr: r.name_ar ?? r.name ?? "", nameEn: r.name_en ?? "",
        limit: r.day_limit ? `${r.day_limit} يوم` : "90 يوم", status: r.status ?? "فعال",
      })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormNameAr(""); setFormNameEn(""); setFormLimit("90"); };

  const startEdit = (item: PenaltyType) => {
    setEditingId(item.id); setFormNameAr(item.nameAr); setFormNameEn(item.nameEn);
    setFormLimit(item.limit.replace(" يوم", "")); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formNameAr.trim()) { toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { name_ar: formNameAr, name_en: formNameEn, day_limit: Number(formLimit) || 90 };
      if (editingId) {
        await supabase.from("penalty_types").update(payload).eq("id", editingId);
        toast({ title: "تم التعديل" });
      } else {
        await supabase.from("penalty_types").insert([payload]);
        toast({ title: "تمت الإضافة" });
      }
      resetForm(); loadData();
    } catch { toast({ title: "خطأ", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleDelete = async (item: PenaltyType) => {
    if (!confirm(`حذف "${item.nameAr}"؟`)) return;
    await supabase.from("penalty_types").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "تم الحذف" });
  };

  const filtered = items.filter((i) => !search || i.nameAr.includes(search) || i.nameEn.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">أنواع المخالفات</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#004e89] hover:bg-[#003865]">
            <Plus className="h-4 w-4 ml-2" /> إضافة نوع
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل" : "إضافة نوع مخالفة"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">الاسم بالعربية *</label><Input value={formNameAr} onChange={(e) => setFormNameAr(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">الاسم بالإنجليزية</label><Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">عدد الأيام المسموحة</label><Input type="number" value={formLimit} onChange={(e) => setFormLimit(e.target.value)} /></div>
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
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-[#004e89] text-white">
                <tr>
                  <th className="py-3 px-4 font-medium w-12">#</th>
                  <th className="py-3 px-4 font-medium text-right">الاسم بالعربية</th>
                  <th className="py-3 px-4 font-medium text-right">الاسم بالإنجليزية</th>
                  <th className="py-3 px-4 font-medium">الأيام المسموحة</th>
                  <th className="py-3 px-4 font-medium">الحالة</th>
                  <th className="py-3 px-4 font-medium w-24">الإجراءات</th>
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
                    <td className="py-3 px-4 text-right">{item.nameAr}</td>
                    <td className="py-3 px-4 text-right">{item.nameEn}</td>
                    <td className="py-3 px-4">{item.limit}</td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs">{item.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-blue-500"><Edit className="h-4 w-4" /></button>
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
