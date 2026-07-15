import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Printer, FileText, Download, Plus, Trash2, Pencil, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type Holiday = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  branch: string | null;
  department: string | null;
  section: string | null;
  team: string | null;
  description: string | null;
};

type Opt = { id: string; name: string };

export default function HRLeavesHolidays() {
  const [rows, setRows] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [departments, setDepartments] = useState<Opt[]>([]);
  const [sections, setSections] = useState<Opt[]>([]);
  const [branchFilter, setBranchFilter] = useState("الكل");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [saving, setSaving] = useState(false);
  const empty = (): Holiday => ({
    id: "",
    name: "",
    start_date: "",
    end_date: "",
    branch: "",
    department: "",
    section: "",
    team: "",
    description: "",
  });
  const [form, setForm] = useState<Holiday>(empty());

  const load = async () => {
    setLoading(true);
    const [hRes, bRes, dRes, sRes] = await Promise.all([
      supabase.from("official_holidays").select("*").order("start_date", { ascending: false }),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("org_sections").select("id, name").order("name"),
    ]);
    if (hRes.error) toast({ title: "خطأ في التحميل", description: hRes.error.message, variant: "destructive" });
    setRows((hRes.data as Holiday[]) ?? []);
    setBranches((bRes.data as Opt[]) ?? []);
    setDepartments((dRes.data as Opt[]) ?? []);
    setSections((sRes.data as Opt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => branchFilter === "الكل" || (r.branch ?? "") === branchFilter),
    [rows, branchFilter],
  );

  const openAdd = () => {
    setEditing(null);
    setForm(empty());
    setModalOpen(true);
  };
  const openEdit = (h: Holiday) => {
    setEditing(h);
    setForm({ ...h, start_date: h.start_date ?? "", end_date: h.end_date ?? "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "اسم الإجازة مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      branch: form.branch || null,
      department: form.department || null,
      section: form.section || null,
      team: form.team || null,
      description: form.description || null,
    };
    const { error } = editing
      ? await supabase.from("official_holidays").update(payload).eq("id", editing.id)
      : await supabase.from("official_holidays").insert([{ id: crypto.randomUUID(), ...payload }]);
    setSaving(false);
    if (error) {
      toast({ title: "تعذّر الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    setModalOpen(false);
    toast({ title: "تم الحفظ بنجاح" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذه العطلة؟")) return;
    const { error } = await supabase.from("official_holidays").delete().eq("id", id);
    if (error) {
      toast({ title: "تعذّر الحذف", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "تم الحذف" });
  };

  const set = <K extends keyof Holiday>(k: K, v: Holiday[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#004e89] text-white p-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <h2 className="text-lg font-bold whitespace-nowrap hidden sm:block">العُطل والاجازات الرسمية</h2>
              <div className="flex gap-2 text-black w-full sm:w-auto">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="h-8 rounded px-2 text-sm bg-white border-none outline-none flex-1 sm:w-[160px]"
                >
                  <option>الكل</option>
                  {branches.map((b) => (
                    <option key={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <h2 className="text-lg font-bold sm:hidden">العُطل والاجازات الرسمية</h2>
              <div className="flex items-center gap-2">
                <button onClick={openAdd} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="إضافة">
                  <Plus className="h-5 w-5" />
                </button>
                <button onClick={load} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="تحديث">
                  <FileText className="h-4 w-4" />
                </button>
                <button onClick={() => window.print()} className="p-1.5 hover:bg-white/10 rounded transition-colors text-white" title="طباعة">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-2 font-medium min-w-[200px]">اسم الإجازة</th>
                  <th className="py-3 px-2 font-medium">تاريخ البداية</th>
                  <th className="py-3 px-2 font-medium">تاريخ الانتهاء</th>
                  <th className="py-3 px-2 font-medium min-w-[140px]">اسم الفرع</th>
                  <th className="py-3 px-2 font-medium min-w-[140px]">الإدارة</th>
                  <th className="py-3 px-2 font-medium min-w-[140px]">اسم القسم</th>
                  <th className="py-3 px-2 font-medium min-w-[120px]">فريق العمل</th>
                  <th className="py-3 px-2 font-medium min-w-[180px]">الوصف</th>
                  <th className="py-3 px-2 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#004e89]" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText className="h-10 w-10 text-gray-300" />
                        <p>لا توجد بيانات في الجدول</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-2 font-medium text-gray-800">{h.name}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.start_date || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.end_date || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.branch || "الكل"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.department || "الكل"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.section || "الكل"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.team || "-"}</td>
                      <td className="py-2.5 px-2 text-gray-600">{h.description || "-"}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(h)} className="text-blue-500 hover:text-blue-700" title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-700" title="حذف">
                            <Trash2 className="h-4 w-4" />
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
            <span className="text-gray-500">يعرض {filtered.length} من أصل {rows.length} سجل</span>
            <div className="flex gap-1 opacity-50 pointer-events-none">
              <Button variant="outline" size="sm" className="h-8 px-3">السابق</Button>
              <Button variant="outline" size="sm" className="h-8 px-3">التالي</Button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">{editing ? "تعديل عطلة رسمية" : "إضافة عطلة رسمية"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الإجازة *</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: عيد الفطر" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <Input type="date" value={form.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                  <Input type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفرع</label>
                  <select value={form.branch ?? ""} onChange={(e) => set("branch", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">الكل</option>
                    {branches.map((b) => (
                      <option key={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الإدارة</label>
                  <select value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">الكل</option>
                    {departments.map((d) => (
                      <option key={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                  <select value={form.section ?? ""} onChange={(e) => set("section", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">الكل</option>
                    {sections.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">فريق العمل</label>
                  <Input value={form.team ?? ""} onChange={(e) => set("team", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setModalOpen(false)}>إلغاء</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003865] text-white">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
