import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Reason = { id: string; reason: string; effect: string };

export default function HRTerminationReasons() {
  const [items, setItems] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formReason, setFormReason] = useState("");
  const [formEffect, setFormEffect] = useState("no_effect");
  const [saving, setSaving] = useState(false);

  const effectLabels: Record<string, string> = {
    no_effect: "لا يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة",
    has_effect: "يؤدي إلى حرمان الموظف من مكافأة نهاية الخدمة",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("termination_reasons").select("*").order("id");
      if (data) setItems(data.map((r: any) => ({ id: String(r.id), reason: r.reason ?? "", effect: r.effect ?? "" })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormReason(""); setFormEffect("no_effect"); };

  const startEdit = (item: Reason) => {
    setEditingId(item.id); setFormReason(item.reason);
    setFormEffect(item.effect.includes("حرمان") && !item.effect.includes("لا ") ? "has_effect" : "no_effect");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formReason.trim()) { toast({ title: "خطأ", description: "السبب مطلوب", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { reason: formReason, effect: effectLabels[formEffect] };
      if (editingId) {
        await supabase.from("termination_reasons").update(payload).eq("id", editingId);
        toast({ title: "تم التعديل" });
      } else {
        await supabase.from("termination_reasons").insert([payload]);
        toast({ title: "تمت الإضافة" });
      }
      resetForm(); loadData();
    } catch { toast({ title: "خطأ", variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleDelete = async (item: Reason) => {
    if (!confirm(`حذف "${item.reason}"؟`)) return;
    await supabase.from("termination_reasons").delete().eq("id", item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast({ title: "تم الحذف" });
  };

  const filtered = items.filter((i) => !search || i.reason.includes(search));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">أسباب إنهاء الخدمة</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#004e89] hover:bg-[#003865]">
            <Plus className="h-4 w-4 ml-2" /> إضافة سبب جديد
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل السبب" : "إضافة سبب جديد"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">السبب *</label><Input value={formReason} onChange={(e) => setFormReason(e.target.value)} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">تأثيره على مكافأة نهاية الخدمة</label>
                <select value={formEffect} onChange={(e) => setFormEffect(e.target.value)} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
                  <option value="no_effect">{effectLabels.no_effect}</option>
                  <option value="has_effect">{effectLabels.has_effect}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865]"><Save className="h-4 w-4 ml-1" /> {saving ? "جاري الحفظ..." : "حفظ"}</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 ml-1" /> إلغاء</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
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
                  <th className="py-3 px-4 font-medium">السبب</th>
                  <th className="py-3 px-4 font-medium">تأثيره على مكافأة نهاية الخدمة</th>
                  <th className="py-3 px-4 font-medium text-center w-24">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">{i + 1}</td>
                    <td className="py-3 px-4 font-medium">{item.reason}</td>
                    <td className="py-3 px-4">{item.effect}</td>
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
