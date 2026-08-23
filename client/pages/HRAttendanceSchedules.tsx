import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Search, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

type Schedule = { id: string; name: string; employees: number; shifts: number; hours: string; type: string };

export default function HRAttendanceSchedules() {
  const { t, direction, formatNumber } = useI18n();
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
      const { data, error } = await supabase.from("attendance_schedules").select("*").order("id");
      if (error) throw error;
      if (data) setItems(data.map((r: any) => ({ id: String(r.id), name: r.name ?? "", employees: r.employees ?? 0, shifts: r.shifts ?? 1, hours: r.hours ?? "09:00:00", type: r.type ?? "جدول عمل ثابت" })));
    } catch { toast({ title: t("خطأ"), description: t("تعذر تحميل جداول العمل"), variant: "destructive" }); } finally { setLoading(false); }
  };

  useEffect(() => { void loadData(); }, [t]);
  const resetForm = () => { setShowForm(false); setEditingId(null); setFormName(""); setFormShifts("1"); setFormHours("09:00:00"); setFormType("جدول عمل ثابت"); };
  const startEdit = (item: Schedule) => { setEditingId(item.id); setFormName(item.name); setFormShifts(String(item.shifts)); setFormHours(item.hours); setFormType(item.type); setShowForm(true); };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: t("خطأ"), description: t("اسم الجدول مطلوب"), variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { name: formName, shifts: Number(formShifts), hours: formHours, type: formType };
      const { error } = editingId ? await supabase.from("attendance_schedules").update(payload).eq("id", editingId) : await supabase.from("attendance_schedules").insert([payload]);
      if (error) throw error;
      toast({ title: t(editingId ? "تم التعديل" : "تمت الإضافة") });
      resetForm(); void loadData();
    } catch { toast({ title: t("خطأ"), description: t("تعذر حفظ جدول العمل"), variant: "destructive" }); } finally { setSaving(false); }
  };

  const handleDelete = async (item: Schedule) => {
    if (!confirm(`${t("حذف")} "${item.name}"؟`)) return;
    try {
      const { error } = await supabase.from("attendance_schedules").delete().eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: t("تم الحذف") });
    } catch { toast({ title: t("خطأ"), description: t("تعذر حذف جدول العمل"), variant: "destructive" }); }
  };

  const filtered = items.filter((i) => !search || i.name.includes(search));
  const iconMargin = direction === "rtl" ? "ml-2" : "mr-2";
  const searchIconPosition = direction === "rtl" ? "right-3" : "left-3";
  const searchInputPadding = direction === "rtl" ? "pr-9" : "pl-9";

  return <Layout><div className="mx-auto max-w-[1400px] space-y-6 p-6" dir={direction}>
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="border-b bg-gray-50 p-4"><h2 className="text-lg font-bold text-gray-800">{t("إعدادات الحضور")}</h2></div><div className="p-6"><div className="flex flex-wrap items-center gap-8 text-sm text-gray-700"><div className="flex items-center gap-2"><Checkbox id="hide-unused" /><label htmlFor="hide-unused" className="cursor-pointer">{t("إخفاء سجلات البصمة غير المستخدمة")}</label></div><div className="flex items-center gap-2"><Checkbox id="show-chart" /><label htmlFor="show-chart" className="cursor-pointer">{t("عرض مخطط جدول العمل")}</label></div><div className="flex items-center gap-2"><Checkbox id="show-exit" /><label htmlFor="show-exit" className="cursor-pointer">{t("عرض خروج الموظف للبصمة في يوم الدخول")}</label></div></div></div></div>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">{t("جداول العمل")}</h1><Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#004e89] hover:bg-[#003865]"><Plus className={`h-4 w-4 ${iconMargin}`} />{t("إضافة جدول")}</Button></div>
    {showForm && <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">{t(editingId ? "تعديل الجدول" : "جدول عمل جديد")}</h3><div className="grid grid-cols-1 gap-4 md:grid-cols-4"><div><label className="mb-1 block text-sm font-medium">{t("اسم الجدول")} *</label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div><div><label className="mb-1 block text-sm font-medium">{t("عدد الفترات")}</label><Input type="number" value={formShifts} onChange={(e) => setFormShifts(e.target.value)} /></div><div><label className="mb-1 block text-sm font-medium">{t("عدد الساعات")}</label><Input value={formHours} onChange={(e) => setFormHours(e.target.value)} /></div><div><label className="mb-1 block text-sm font-medium">{t("نوع الجدول")}</label><select value={formType} onChange={(e) => setFormType(e.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm"><option value="جدول عمل ثابت">{t("جدول عمل ثابت")}</option><option value="جدول عمل متغير">{t("جدول عمل متغير")}</option></select></div></div><div className="flex gap-2"><Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865]"><Save className={`h-4 w-4 ${direction === "rtl" ? "ml-1" : "mr-1"}`} />{saving ? t("جاري الحفظ...") : t("حفظ")}</Button><Button variant="outline" onClick={resetForm}><X className={`h-4 w-4 ${direction === "rtl" ? "ml-1" : "mr-1"}`} />{t("إلغاء")}</Button></div></div>}
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><div className="relative w-72"><Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 ${searchIconPosition}`} /><Input placeholder={t("بحث...")} value={search} onChange={(e) => setSearch(e.target.value)} className={searchInputPadding} /></div><span className="text-sm text-gray-500">{formatNumber(filtered.length)} {t("سجل")}</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#004e89] text-white"><tr><th className="w-16 px-4 py-3 font-medium">#</th><th className="px-4 py-3 font-medium">{t("الاسم")}</th><th className="px-4 py-3 font-medium">{t("عدد الموظفين")}</th><th className="px-4 py-3 font-medium">{t("عدد الفترات")}</th><th className="px-4 py-3 font-medium">{t("عدد الساعات")}</th><th className="px-4 py-3 font-medium">{t("نوع جدول العمل")}</th><th className="w-24 px-4 py-3 text-center font-medium">{t("الإجراءات")}</th></tr></thead><tbody className="divide-y bg-white">{loading ? <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t("جاري التحميل...")}</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400">{t("لا توجد بيانات")}</td></tr> : filtered.map((item, i) => <tr key={item.id} className="hover:bg-gray-50/50"><td className="px-4 py-3">{formatNumber(i + 1)}</td><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{formatNumber(item.employees)}</td><td className="px-4 py-3">{formatNumber(item.shifts)}</td><td className="px-4 py-3">{item.hours}</td><td className="px-4 py-3">{t(item.type)}</td><td className="px-4 py-3"><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => startEdit(item)} title={t("تعديل")} aria-label={`${t("تعديل")} ${item.name}`} className="text-gray-400 hover:text-[#004e89]"><Edit className="h-4 w-4" /></button><button type="button" onClick={() => handleDelete(item)} title={t("حذف")} aria-label={`${t("حذف")} ${item.name}`} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></div>
  </div></Layout>;
}
