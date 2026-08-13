import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

const DEFAULT_REQUEST_TYPES = ["إجازة", "سلفة", "نقل", "استئذان", "عهدة", "مصروفات", "أخرى", "الرواتب"];
const ADD_REQUEST_TYPE = "__add_request_type__";

type Step = { order: number; approver: string; role: string };

export default function HRApprovalsAdd() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [active, setActive] = useState(true);
  const [type, setType] = useState("إجازة");
  const [requestTypes, setRequestTypes] = useState(DEFAULT_REQUEST_TYPES);
  const [addingRequestType, setAddingRequestType] = useState(false);
  const [customRequestType, setCustomRequestType] = useState("");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [steps, setSteps] = useState<Step[]>([{ order: 1, approver: "", role: "معتمد" }]);

  useEffect(() => {
    (async () => {
      const [employeesResult, chainsResult] = await Promise.all([
        supabase
          .from("employees")
          .select("id, name")
          .in("status", ["نشط", "فعال"])
          .order("name"),
        supabase.from("approval_chains").select("type"),
      ]);
      setManagers((employeesResult.data ?? []).map((e: any) => ({ id: String(e.id), name: String(e.name) })));
      const savedTypes = (chainsResult.data ?? [])
        .map((chain: any) => String(chain.type ?? "").trim())
        .filter(Boolean);
      setRequestTypes([...new Set([...DEFAULT_REQUEST_TYPES, ...savedTypes])]);
    })();
  }, []);

  const addCustomRequestType = () => {
    const customType = customRequestType.trim();
    if (!customType) {
      toast({ title: "أدخل اسم نوع الطلب", variant: "destructive" });
      return;
    }
    setRequestTypes((current) => current.includes(customType) ? current : [...current, customType]);
    setType(customType);
    setCustomRequestType("");
    setAddingRequestType(false);
  };

  const addStep = () => setSteps((prev) => [...prev, { order: prev.length + 1, approver: "", role: "معتمد" }]);
  const removeStep = (order: number) => setSteps((prev) => prev.filter((s) => s.order !== order).map((s, i) => ({ ...s, order: i + 1 })));
  const updateStep = (order: number, patch: Partial<Step>) => setSteps((prev) => prev.map((s) => (s.order === order ? { ...s, ...patch } : s)));

  const handleSave = async () => {
    if (!nameAr.trim()) {
      toast({ title: "بيانات ناقصة", description: "أدخل اسم سلسلة الموافقات بالعربية", variant: "destructive" });
      setStep(1);
      return;
    }
    const validSteps = steps.filter((s) => s.approver.trim());
    if (validSteps.length === 0) {
      toast({ title: "بيانات ناقصة", description: "أضف خطوة اعتماد واحدة على الأقل", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("approval_chains").insert({
      name: nameAr.trim(),
      type,
      steps: validSteps,
      status: active ? "فعال" : "غير فعال",
    });
    setSaving(false);
    if (error) {
      toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم الحفظ", description: "تم إنشاء سلسلة الموافقات بنجاح" });
    navigate("/hr/approvals/list");
  };

  return (
    <Layout>
      <div className="p-6 max-w-[1200px] mx-auto space-y-6" dir="rtl">
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? "bg-[#004e89]" : "bg-gray-200"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-3">بيانات سلسلة الموافقات</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-gray-700">الوصف بالعربية *</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">الوصف بالإنجليزية</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="bg-gray-50" dir="ltr" />
                </div>
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <Label className="text-gray-700">فعال *</Label>
                  <RadioGroup value={active ? "yes" : "no"} onValueChange={(v) => setActive(v === "yes")} className="flex gap-6 mt-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="yes" id="active_yes" />
                      <Label htmlFor="active_yes" className="font-normal cursor-pointer">نعم</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="no" id="active_no" />
                      <Label htmlFor="active_no" className="font-normal cursor-pointer">لا</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b pb-3">مجال سلسلة الموافقات</h2>
              <div className="space-y-2 max-w-md">
                <Label className="text-gray-700">نوع الطلب المرتبط *</Label>
                <select
                  value={type}
                  onChange={(e) => {
                    if (e.target.value === ADD_REQUEST_TYPE) {
                      setAddingRequestType(true);
                      return;
                    }
                    setType(e.target.value);
                    setAddingRequestType(false);
                  }}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 bg-white text-sm"
                >
                  {requestTypes.map((requestType) => <option key={requestType} value={requestType}>{requestType}</option>)}
                  <option value={ADD_REQUEST_TYPE}>إضافة</option>
                </select>
                {addingRequestType && (
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={customRequestType}
                      onChange={(event) => setCustomRequestType(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomRequestType();
                        }
                      }}
                      placeholder="اكتب نوع الطلب الجديد"
                      autoFocus
                    />
                    <Button type="button" onClick={addCustomRequestType} className="bg-[#004e89] hover:bg-[#003d6d] text-white gap-1 shrink-0">
                      <Plus className="h-4 w-4" /> إضافة
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-lg font-bold text-gray-800">تسلسل لجنة الموافقات</h2>
                <Button onClick={addStep} variant="outline" className="gap-2"><Plus className="h-4 w-4" /> إضافة خطوة</Button>
              </div>
              <div className="space-y-3">
                {steps.map((st) => (
                  <div key={st.order} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-full bg-[#004e89] text-white flex items-center justify-center text-sm shrink-0">{st.order}</div>
                    <select value={st.approver} onChange={(e) => updateStep(st.order, { approver: e.target.value })} className="flex-1 h-10 border border-gray-300 rounded-md px-3 bg-white text-sm">
                      <option value="">اختر المعتمِد</option>
                      {managers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <select value={st.role} onChange={(e) => updateStep(st.order, { role: e.target.value })} className="w-40 h-10 border border-gray-300 rounded-md px-3 bg-white text-sm">
                      <option value="معتمد">معتمد</option>
                      <option value="مراجع">مراجع</option>
                      <option value="معتمد نهائي">معتمد نهائي</option>
                    </select>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(st.order)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-start gap-2 pt-4 border-t">
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">التالي</Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="bg-[#004e89] hover:bg-[#003d6d] text-white px-8">{saving ? "جاري الحفظ..." : "حفظ السلسلة"}</Button>
            )}
            <Button variant="outline" className="text-gray-500 px-8" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>السابق</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
