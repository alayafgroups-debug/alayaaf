import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText, Plus, Trash2, Edit, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type DeptRow = { id: string; name: string; nameEn: string; branch: string; manager: string; status: string };

export default function HROrgDepartments() {
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
    if (!confirm(`حذف الإدارة "${dept.name}"؟`)) return;
    await supabase.from("departments").delete().eq("id", dept.id);
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    toast({ title: "تم الحذف" });
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "خطأ", description: "اسم الإدارة مطلوب", variant: "destructive" }); return; }
    if (editingId) {
      await supabase.from("departments").update({ name: formName, name_en: formNameEn, branch: formBranch, manager: formManager }).eq("id", editingId);
      toast({ title: "تم التعديل" });
    } else {
      await supabase.from("departments").insert([{ name: formName, name_en: formNameEn, branch: formBranch, manager: formManager }]);
      toast({ title: "تمت الإضافة" });
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
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50"><Printer className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600 hover:bg-blue-50"><FileText className="h-4 w-4" /></Button>
            <Button size="icon" className="bg-[#004e89] hover:bg-[#003d6d] text-white" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="font-semibold text-lg text-[#004e89]">قائمة الإدارات</div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل الإدارة" : "إضافة إدارة جديدة"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">اسم الإدارة *</label><input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">الاسم بالإنجليزية</label><input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">الفرع</label><input value={formBranch} onChange={(e) => setFormBranch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">المدير</label><input value={formManager} onChange={(e) => setFormManager(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-[#004e89] hover:bg-[#003d6d] text-white"><Save className="h-4 w-4 ml-1" /> حفظ</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 ml-1" /> إلغاء</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-[#004e89] hover:bg-[#004e89]">
                <TableHead className="text-white text-right font-medium w-[60px]">#</TableHead>
                <TableHead className="text-white text-right font-medium">اسم الإدارة</TableHead>
                <TableHead className="text-white text-right font-medium">الاسم بالإنجليزية</TableHead>
                <TableHead className="text-white text-right font-medium">الفرع</TableHead>
                <TableHead className="text-white text-right font-medium">المدير</TableHead>
                <TableHead className="text-white text-right font-medium">الحالة</TableHead>
                <TableHead className="text-white text-center font-medium w-[120px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">جاري التحميل...</TableCell></TableRow>
              ) : departments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">لا توجد إدارات</TableCell></TableRow>
              ) : (
                departments.map((row, i) => (
                  <TableRow key={row.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.nameEn}</TableCell>
                    <TableCell>{row.branch}</TableCell>
                    <TableCell>{row.manager}</TableCell>
                    <TableCell><span className="px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-medium">{row.status}</span></TableCell>
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
        <div className="text-sm text-gray-500">إظهار {departments.length} إدارة</div>
      </div>
    </Layout>
  );
}
