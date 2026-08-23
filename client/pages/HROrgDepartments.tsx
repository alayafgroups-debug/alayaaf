import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

type DeptRow = { id: string; name: string; nameEn: string; branch: string; manager: string; status: string };

export default function HROrgDepartments() {
  const { t, direction, formatNumber } = useI18n();
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formManager, setFormManager] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("departments").select("*").order("created_at", { ascending: false });
      if (data) setDepartments(data.map((r) => ({
        id: String(r.id), name: String(r.name ?? ""), nameEn: String(r.name_en ?? ""),
        branch: String(r.branch ?? ""), manager: String(r.manager ?? ""), status: String(r.status ?? "فعال"),
      })));
    } catch { /* no-op */ } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (dept: DeptRow) => {
    if (!confirm(`${t("حذف الإدارة")} "${dept.name}"؟`)) return;
    await supabase.from("departments").delete().eq("id", dept.id);
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    toast({ title: t("تم الحذف") });
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: t("خطأ"), description: t("اسم الإدارة مطلوب"), variant: "destructive" }); return; }
    if (editingId) {
      await supabase.from("departments").update({ name: formName, name_en: formNameEn, branch: formBranch, manager: formManager }).eq("id", editingId);
      toast({ title: t("تم التعديل") });
    } else {
      await supabase.from("departments").insert([{ name: formName, name_en: formNameEn, branch: formBranch, manager: formManager }]);
      toast({ title: t("تمت الإضافة") });
    }
    resetForm();
    loadData();
  };

  const startEdit = (dept: DeptRow) => {
    setEditingId(dept.id); setFormName(dept.name); setFormNameEn(dept.nameEn); setFormBranch(dept.branch); setFormManager(dept.manager); setShowForm(true);
  };

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormName(""); setFormNameEn(""); setFormBranch(""); setFormManager(""); };

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir={direction}>
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50"><Printer className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50"><FileText className="h-4 w-4" /></Button>
            <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="font-semibold text-lg text-[#004e89]">{t("قائمة الإدارات")}</div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? t("تعديل الإدارة") : t("إضافة إدارة جديدة")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">{t("اسم الإدارة")} *</label><input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t("الاسم بالإنجليزية")}</label><input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t("الفرع")}</label><input value={formBranch} onChange={(e) => setFormBranch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">{t("المدير")}</label><input value={formManager} onChange={(e) => setFormManager(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-[#004e89] hover:bg-[#003d6d] text-white"><Save className="h-4 w-4 me-1" /> {t("حفظ")}</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 me-1" /> {t("إلغاء")}</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
                <TableHead className="text-white text-start font-medium w-[60px]">#</TableHead>
                <TableHead className="text-white text-start font-medium">{t("اسم الإدارة")}</TableHead>
                <TableHead className="text-white text-start font-medium">{t("الاسم بالإنجليزية")}</TableHead>
                <TableHead className="text-white text-start font-medium">{t("الفرع")}</TableHead>
                <TableHead className="text-white text-start font-medium">{t("المدير")}</TableHead>
                <TableHead className="text-white text-start font-medium">{t("الحالة")}</TableHead>
                <TableHead className="text-white text-center font-medium w-[120px]">{t("الإجراءات")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t("جاري التحميل...")}</TableCell></TableRow>
              ) : departments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">{t("لا توجد إدارات")}</TableCell></TableRow>
              ) : (
                departments.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.nameEn}</TableCell>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.manager}</TableCell>
                    <TableCell><span className="px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-medium">{t(row.status)}</span></TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => startEdit(row)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(row)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="text-sm text-gray-500">{t("إظهار")} {formatNumber(departments.length)} {t("إدارة")}</div>
      </div>
    </Layout>
  );
}
