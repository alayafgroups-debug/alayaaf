import { useState, useEffect } from "react";
import { Plus, Trash2, Mail, Settings, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface DeductionReason {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

interface GeneratedEmail {
  id: string;
  emp_id: string;
  emp_name: string;
  generated_email: string;
  created_at: string;
}

interface SaudiEmployee {
  id: string;
  emp_id: string;
  name: string;
  first_name?: string | null;
  nationality: string;
}

interface EmailSchedule {
  id: string;
  day_of_month: number;
  description: string;
}

export default function DeductionSettingsPage() {
  const [activeTab, setActiveTab] = useState<"reasons" | "schedule" | "generate">("reasons");
  const [deductions, setDeductions] = useState<DeductionReason[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [emailSchedules, setEmailSchedules] = useState<EmailSchedule[]>([]);
  const [newDeduction, setNewDeduction] = useState({ name: "", description: "" });
  const [newSchedule, setNewSchedule] = useState({ day: 15, description: "" });
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [saudiEmployees, setSaudiEmployees] = useState<SaudiEmployee[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState("hr.alayaf.com");
  const [primaryConfigId, setPrimaryConfigId] = useState<string | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // تحميل أسباب الخصومات
  useEffect(() => {
    loadDeductions();
    loadSchedules();
    loadSaudiEmployees();
    loadPrimaryEmail();
    loadGeneratedEmails();
  }, []);

  const loadDeductions = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_config_items")
        .select("*")
        .eq("config_type", "deduction_reason");
      
      if (!error && data) {
        setDeductions(data.map((d: any) => ({
          id: d.id,
          name: d.name_ar,
          description: d.description,
          created_at: d.created_at
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("hr_config_items")
        .select("*")
        .eq("config_type", "email_schedule");
      
      if (!error && data) {
        setEmailSchedules(data.map((s: any) => ({
          id: s.id,
          day_of_month: s.sort_order || 15,
          description: s.description
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSaudiEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, emp_id, name, first_name, nationality")
        .eq("nationality", "سعودي");
      
      if (!error && data) {
        setSaudiEmployees(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPrimaryEmail = async () => {
    const { data, error } = await supabase
      .from("hr_config_items")
      .select("id, value")
      .eq("config_type", "primary_email_domain")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setPrimaryConfigId(String(data.id));
      setPrimaryEmail(String(data.value || "hr.alayaf.com"));
    }
  };

  const savePrimaryEmail = async () => {
    const value = primaryEmail.trim().replace(/^https?:\/\//, "").replace(/^@/, "").replace(/\/$/, "");
    if (!value) {
      toast.error("أدخل الإيميل الرئيسي");
      return;
    }

    setIsLoading(true);
    const payload = {
      config_type: "primary_email_domain",
      name_ar: "الإيميل الرئيسي",
      value,
      status: "فعال",
    };
    const result = primaryConfigId
      ? await supabase.from("hr_config_items").update(payload).eq("id", primaryConfigId).select("id").single()
      : await supabase.from("hr_config_items").insert([payload]).select("id").single();
    setIsLoading(false);

    if (result.error) {
      toast.error("تعذر حفظ الإيميل الرئيسي");
      return;
    }
    setPrimaryConfigId(String(result.data.id));
    setPrimaryEmail(value);
    toast.success("تم حفظ الإيميل الرئيسي");
  };

  const loadGeneratedEmails = async () => {
    const { data, error } = await supabase
      .from("employee_emails")
      .select("id, emp_id, emp_name, generated_email, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setGeneratedEmails(data as GeneratedEmail[]);
  };

  const addDeduction = async () => {
    if (!newDeduction.name) {
      toast.error("أدخل اسم السبب");
      return;
    }

    try {
      const { error } = await supabase
        .from("hr_config_items")
        .insert([{
          config_type: "deduction_reason",
          name_ar: newDeduction.name,
          description: newDeduction.description,
          status: "فعال"
        }]);

      if (!error) {
        toast.success("تم إضافة سبب الخصم");
        setNewDeduction({ name: "", description: "" });
        loadDeductions();
      }
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  const deleteDeduction = async (id: string) => {
    try {
      await supabase.from("hr_config_items").delete().eq("id", id);
      toast.success("تم الحذف");
      loadDeductions();
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  const addSchedule = async () => {
    if (!newSchedule.description) {
      toast.error("أدخل الوصف");
      return;
    }

    try {
      const { error } = await supabase
        .from("hr_config_items")
        .insert([{
          config_type: "email_schedule",
          name_ar: `إرسال في اليوم ${newSchedule.day}`,
          description: newSchedule.description,
          sort_order: newSchedule.day,
          status: "فعال"
        }]);

      if (!error) {
        toast.success("تم إضافة الفترة");
        setNewSchedule({ day: 15, description: "" });
        loadSchedules();
      }
    } catch (err) {
      toast.error("حدث خطأ");
    }
  };

  const generateEmailForEmployee = () => {
    const emp = saudiEmployees.find((employee) => employee.id === selectedEmployee);
    if (!emp) {
      toast.error("اختر موظفاً سعودياً");
      return;
    }

    const englishFirstName = String(emp.first_name || "").trim().split(/\s+/)[0];
    const safeFirstName = englishFirstName.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!safeFirstName) {
      toast.error("يجب إضافة الاسم الأول بالإنجليزية للموظف أولاً");
      return;
    }

    const domain = primaryEmail.trim().replace(/^https?:\/\//, "").replace(/^@/, "").replace(/\/$/, "");
    setGeneratedDraft(`${safeFirstName}@${domain}`);
  };

  const saveGeneratedEmail = async () => {
    const emp = saudiEmployees.find((employee) => employee.id === selectedEmployee);
    if (!emp || !generatedDraft) return;

    setIsLoading(true);
    const { error } = await supabase.from("employee_emails").insert([{
      emp_id: emp.emp_id,
      emp_name: emp.name,
      generated_email: generatedDraft,
      status: "active",
    }]);
    setIsLoading(false);

    if (error) {
      toast.error(error.code === "23505" ? "هذا الإيميل محفوظ مسبقاً" : "تعذر حفظ الإيميل");
      return;
    }

    toast.success("تم حفظ إيميل الموظف");
    setSelectedEmployee("");
    setGeneratedDraft("");
    loadGeneratedEmails();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-400" />
          إعدادات الخصومات والإيميلات
        </h1>

        <div className="bg-gray-800 rounded-xl p-5 mb-6 text-white">
          <label className="block text-sm font-semibold mb-2">الإيميل الرئيسي</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              dir="ltr"
              value={primaryEmail}
              onChange={(event) => setPrimaryEmail(event.target.value)}
              placeholder="hr.alayaf.com"
              className="flex-1 px-4 py-2.5 bg-gray-700 rounded-lg text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={savePrimaryEmail}
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              تغيير وحفظ
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("reasons")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              activeTab === "reasons"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            أسباب الخصومات
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              activeTab === "schedule"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            فترات الإرسال
          </button>
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
              activeTab === "generate"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            توليد الإيميلات
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-xl p-6 text-white">
          {/* أسباب الخصومات */}
          {activeTab === "reasons" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">أسباب الخصومات</h2>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="اسم السبب"
                  value={newDeduction.name}
                  onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                />
                <textarea
                  placeholder="الوصف (اختياري)"
                  value={newDeduction.description}
                  onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                  rows={3}
                />
                <button
                  onClick={addDeduction}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  إضافة سبب
                </button>
              </div>

              <div className="space-y-2 mt-6">
                {deductions.map((d) => (
                  <div key={d.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      {d.description && <p className="text-sm text-gray-400 mt-1">{d.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteDeduction(d.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* فترات الإرسال */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">فترات إرسال الإيميلات</h2>
              
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="اليوم من الشهر"
                  value={newSchedule.day}
                  onChange={(e) => setNewSchedule({ ...newSchedule, day: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                  min="1"
                  max="28"
                />
                <input
                  type="text"
                  placeholder="الوصف"
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  onClick={addSchedule}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  إضافة فترة
                </button>
              </div>

              <div className="space-y-2 mt-6">
                {emailSchedules.map((s) => (
                  <div key={s.id} className="bg-gray-700 p-4 rounded-lg">
                    <p className="font-semibold">اليوم {s.day_of_month}</p>
                    <p className="text-sm text-gray-400">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* توليد الإيميلات */}
          {activeTab === "generate" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-400" />
                توليد الإيميلات
              </h2>
              
              <select
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value);
                  setGeneratedDraft("");
                }}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              >
                <option value="">اختر موظف سعودي</option>
                {saudiEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.emp_id})
                  </option>
                ))}
              </select>

              <button
                onClick={generateEmailForEmployee}
                disabled={!selectedEmployee || isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Mail className="h-5 w-5" />
                توليد إيميل
              </button>

              {generatedDraft && (
                <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                  <p dir="ltr" className="text-green-400 font-mono text-left">{generatedDraft}</p>
                  <button
                    onClick={saveGeneratedEmail}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    حفظ
                  </button>
                </div>
              )}

              <div className="space-y-2 mt-6">
                <h3 className="font-bold">الإيميلات المحفوظة</h3>
                {generatedEmails.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد إيميلات محفوظة</p>
                ) : generatedEmails.map((email) => (
                  <div key={email.id} className="bg-gray-700 p-4 rounded-lg">
                    <p className="font-semibold">{email.emp_name}</p>
                    <p dir="ltr" className="text-sm text-green-400 font-mono text-left">{email.generated_email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
