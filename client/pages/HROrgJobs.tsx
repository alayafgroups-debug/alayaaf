import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Save, X, Printer, FileText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

const DEFAULT_JOBS = [
  { name: "مدير عام", name_en: "General Manager", department: "", status: "فعال" },
  { name: "مدير موارد بشرية", name_en: "HR Manager", department: "", status: "فعال" },
  { name: "مدير مالي", name_en: "CFO", department: "", status: "فعال" },
  { name: "محاسب", name_en: "Accountant", department: "", status: "فعال" },
  { name: "مهندس", name_en: "Engineer", department: "", status: "فعال" },
  { name: "فني صيانة", name_en: "Maintenance Technician", department: "", status: "فعال" },
  { name: "مسؤول مبيعات", name_en: "Sales Representative", department: "", status: "فعال" },
  { name: "مسؤول مشتريات", name_en: "Procurement Officer", department: "", status: "فعال" },
  { name: "أخصائي موارد بشرية", name_en: "HR Specialist", department: "", status: "فعال" },
  { name: "موظف إداري", name_en: "Administrative Staff", department: "", status: "فعال" },
];

type JobRow = { id: string; name: string; nameEn: string; department: string; status: string };

export default function HROrgJobs() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formStatus, setFormStatus] = useState("فعال");
  const [seeded, setSeeded] = useState(false);

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none";

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("hr_jobs").select("*").order("name");
      if (data && data.length > 0) {
        setJobs(data.map((r: any) => ({
          id: String(r.id), name: String(r.name ?? ""),
          nameEn: String(r.name_en ?? ""), department: String(r.department ?? ""),
          status: String(r.status ?? "فعال"),
        })));
        setSeeded(true);
      } else {
        setJobs([]);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
    if (seeded) return;
    try {
      await supabase.from("hr_jobs").insert(DEFAULT_JOBS);
      toast({ title: "تم إضافة الوظائف الافتراضية" });
      loadData();
    } catch {
      toast({ title: "خطأ", description: "تعذر إضافة الوظائف", variant: "destructive" });
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (job: JobRow) => {
    if (!confirm(`حذف الوظيفة "${job.name}"؟`)) return;
    await supabase.from("hr_jobs").delete().eq("id", job.id);
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    toast({ title: "تم الحذف" });
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "خطأ", description: "اسم الوظيفة مطلوب", variant: "destructive" }); return; }
    if (editingId) {
      await supabase.from("hr_jobs").update({ name: formName, name_en: formNameEn, department: formDept, status: formStatus }).eq("id", editingId);
      toast({ title: "تم التعديل" });
    } else {
      await supabase.from("hr_jobs").insert([{ name: formName, name_en: formNameEn, department: formDept, status: formStatus }]);
      toast({ title: "تمت الإضافة" });
    }
    resetForm(); loadData();
  };

  const startEdit = (job: JobRow) => {
    setEditingId(job.id); setFormName(job.name); setFormNameEn(job.nameEn); setFormDept(job.department); setFormStatus(job.status); setShowForm(true);
  };

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormName(""); setFormNameEn(""); setFormDept(""); setFormStatus("فعال"); };

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-5" dir="rtl">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600"><Printer className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="text-blue-600 border-blue-600"><FileText className="h-4 w-4" /></Button>
            <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white gap-1" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> إضافة وظيفة
            </Button>
            {jobs.length === 0 && !loading && (
              <Button variant="outline" onClick={seedDefaults}>تعبئة الوظائف الافتراضية</Button>
            )}
          </div>
          <h1 className="font-bold text-xl text-[#004e89]">قائمة الوظائف</h1>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل وظيفة" : "إضافة وظيفة جديدة"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم الوظيفة (عربي) *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Title (English)</label>
                <input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} className={inputCls} placeholder="English name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الإدارة</label>
                <input value={formDept} onChange={(e) => setFormDept(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={inputCls}>
                  <option value="فعال">فعال</option>
                  <option value="غير فعال">غير فعال</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-[#004e89] hover:bg-[#003d6d] text-white gap-1"><Save className="h-4 w-4" /> حفظ</Button>
              <Button variant="outline" onClick={resetForm} className="gap-1"><X className="h-4 w-4" /> إلغاء</Button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-right">
            <thead className="bg-[#004e89] text-white">
              <tr>
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">اسم الوظيفة</th>
                <th className="py-3 px-4 font-medium">الاسم بالإنجليزية</th>
                <th className="py-3 px-4 font-medium">الإدارة</th>
                <th className="py-3 px-4 font-medium text-center">الحالة</th>
                <th className="py-3 px-4 font-medium text-center w-28">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">لا توجد وظائف - استخدم زر "تعبئة الوظائف الافتراضية"</td></tr>
              ) : jobs.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{i + 1}</td>
                  <td className="py-3 px-4 font-medium">{row.name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.nameEn}</td>
                  <td className="py-3 px-4">{row.department}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "فعال" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{row.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500">إجمالي: {jobs.length} وظيفة</p>
      </div>
    </Layout>
  );
}
