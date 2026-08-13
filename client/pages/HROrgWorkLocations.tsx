import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Save, X, Printer, FileText, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type LocationRow = {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  city: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
};

export default function HROrgWorkLocations() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formStatus, setFormStatus] = useState("فعال");
  const [formLatitude, setFormLatitude] = useState("");
  const [formLongitude, setFormLongitude] = useState("");

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none";

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("hr_work_locations").select("*").order("name");
      if (data) setRows(data.map((r: any) => ({
        id: String(r.id), name: String(r.name ?? ""), nameEn: String(r.name_en ?? ""),
        address: String(r.address ?? ""), city: String(r.city ?? ""), status: String(r.status ?? "فعال"),
        latitude: r.latitude == null ? null : Number(r.latitude),
        longitude: r.longitude == null ? null : Number(r.longitude),
        isDefault: Boolean(r.is_company_default),
      })));
    } catch { setRows([]); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (loc: LocationRow) => {
    if (loc.isDefault) {
      toast({ title: "لا يمكن حذف الموقع الرئيسي", description: "غيّر الموقع الرئيسي من صفحة التحضير أولاً", variant: "destructive" });
      return;
    }
    if (!confirm(`حذف موقع "${loc.name}"؟`)) return;
    await supabase.from("hr_work_locations").delete().eq("id", loc.id);
    setRows((prev) => prev.filter((r) => r.id !== loc.id));
    toast({ title: "تم الحذف" });
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "خطأ", description: "اسم موقع العمل مطلوب", variant: "destructive" }); return; }
    const latitude = formLatitude.trim() ? Number(formLatitude) : null;
    const longitude = formLongitude.trim() ? Number(formLongitude) : null;
    if (
      (latitude == null) !== (longitude == null) ||
      (latitude != null && (
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || Number(longitude) < -180 || Number(longitude) > 180
      ))
    ) {
      toast({ title: "إحداثيات غير صحيحة", description: "أدخل خط العرض وخط الطول ضمن النطاق الصحيح", variant: "destructive" });
      return;
    }
    const payload = {
      name: formName, name_en: formNameEn, address: formAddress, city: formCity,
      status: formStatus, latitude, longitude, attendance_radius_m: 10,
    };
    const result = editingId
      ? await supabase.from("hr_work_locations").update(payload).eq("id", editingId)
      : await supabase.from("hr_work_locations").insert([payload]);
    if (result.error) {
      toast({ title: "تعذر حفظ الموقع", description: result.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "تم التعديل" : "تمت الإضافة" });
    resetForm(); loadData();
  };

  const startEdit = (loc: LocationRow) => {
    setEditingId(loc.id); setFormName(loc.name); setFormNameEn(loc.nameEn); setFormAddress(loc.address); setFormCity(loc.city); setFormStatus(loc.status);
    setFormLatitude(loc.latitude == null ? "" : String(loc.latitude));
    setFormLongitude(loc.longitude == null ? "" : String(loc.longitude));
    setShowForm(true);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "الجهاز لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormLatitude(position.coords.latitude.toFixed(7));
        setFormLongitude(position.coords.longitude.toFixed(7));
        toast({ title: "تم التقاط الموقع الحالي" });
      },
      () => toast({ title: "يرجى السماح بالوصول إلى الموقع", variant: "destructive" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const resetForm = () => { setShowForm(false); setEditingId(null); setFormName(""); setFormNameEn(""); setFormAddress(""); setFormCity(""); setFormStatus("فعال"); setFormLatitude(""); setFormLongitude(""); };

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-5" dir="rtl">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex gap-2">
            <Button variant="outline" size="icon"><Printer className="h-4 w-4 text-blue-600" /></Button>
            <Button variant="outline" size="icon"><FileText className="h-4 w-4 text-blue-600" /></Button>
            <Button className="bg-[#004e89] hover:bg-[#003d6d] text-white gap-1" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> إضافة موقع
            </Button>
          </div>
          <h1 className="font-bold text-xl text-[#004e89] flex items-center gap-2"><MapPin className="h-5 w-5" /> مواقع العمل</h1>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? "تعديل موقع" : "إضافة موقع عمل جديد"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">اسم الموقع *</label><input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">Location Name (EN)</label><input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">العنوان</label><input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className={inputCls} /></div>
              <div><label className="block text-sm font-medium mb-1">المدينة</label><input value={formCity} onChange={(e) => setFormCity(e.target.value)} className={inputCls} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={inputCls}>
                  <option value="فعال">فعال</option><option value="غير فعال">غير فعال</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">خط العرض</label><input type="number" step="any" value={formLatitude} onChange={(e) => setFormLatitude(e.target.value)} className={inputCls} placeholder="مثال: 21.3891" /></div>
              <div><label className="block text-sm font-medium mb-1">خط الطول</label><input type="number" step="any" value={formLongitude} onChange={(e) => setFormLongitude(e.target.value)} className={inputCls} placeholder="مثال: 39.8579" /></div>
              <div className="flex items-end"><Button type="button" variant="outline" onClick={captureLocation} className="w-full gap-2"><Navigation className="h-4 w-4" /> استخدام موقعي الحالي</Button></div>
            </div>
            <p className="text-xs text-slate-500">الموقع الذي يحتوي على إحداثيات يمكن تعيينه للموظفين كنطاق حضور بمسافة 10 أمتار.</p>
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
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">اسم الموقع</th>
                <th className="py-3 px-4">الاسم بالإنجليزية</th>
                <th className="py-3 px-4">المدينة</th>
                <th className="py-3 px-4">العنوان</th>
                <th className="py-3 px-4">إحداثيات الحضور</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center w-24">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">جاري التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">لا توجد مواقع عمل</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{i + 1}</td>
                  <td className="py-3 px-4 font-medium">{row.name}</td>
                  <td className="py-3 px-4 text-gray-600">{row.nameEn}</td>
                  <td className="py-3 px-4">{row.city}</td>
                  <td className="py-3 px-4 text-gray-600">{row.address}</td>
                  <td className="py-3 px-4 text-xs font-mono text-gray-600">
                    {row.latitude != null && row.longitude != null ? `${row.latitude}, ${row.longitude}` : "غير محدد"}
                    {row.isDefault && <span className="mr-2 rounded bg-violet-100 px-2 py-0.5 font-sans text-violet-700">الرئيسي</span>}
                  </td>
                  <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "فعال" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{row.status}</span></td>
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
        <p className="text-sm text-gray-500">إجمالي: {rows.length} موقع</p>
      </div>
    </Layout>
  );
}
