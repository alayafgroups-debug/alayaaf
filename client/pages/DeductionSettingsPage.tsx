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
  generated_password: string;
  created_at: string;
}

interface SaudiEmployee {
  id: string;
  emp_id: string;
  name: string;
  first_name?: string | null;
  nationality: string;
}

interface MailMessage {
  id: string;
  emp_id: string;
  emp_name: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  message_kind: "deduction_notice" | "employee_reply";
  created_at: string;
}

export default function DeductionSettingsPage() {
  const [activeTab, setActiveTab] = useState<"reasons" | "generate">("reasons");
  const [deductions, setDeductions] = useState<DeductionReason[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<GeneratedEmail[]>([]);
  const [newDeduction, setNewDeduction] = useState({ name: "", description: "" });
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [saudiEmployees, setSaudiEmployees] = useState<SaudiEmployee[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState("hr.alayaf.com");
  const [primaryConfigId, setPrimaryConfigId] = useState<string | null>(null);
  const [mailMessages, setMailMessages] = useState<MailMessage[]>([]);
  const [showAdminMailbox, setShowAdminMailbox] = useState(false);
  const [adminFolder, setAdminFolder] = useState<"inbox" | "sent">("inbox");
  const [isLoading, setIsLoading] = useState(false);

  // تحميل أسباب الخصومات
  useEffect(() => {
    loadDeductions();
    loadSaudiEmployees();
    loadPrimaryEmail();
    loadGeneratedEmails();
    loadMailMessages();
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
    const { data, error } = await supabase.functions.invoke("manage-employee-credentials", {
      body: { action: "list" },
    });
    if (error || !data?.success) {
      console.error(error ?? data?.error);
      return;
    }
    setGeneratedEmails((data.credentials ?? []) as GeneratedEmail[]);
  };

  const loadMailMessages = async () => {
    const { data, error } = await supabase
      .from("employee_mail_messages")
      .select("id, emp_id, emp_name, from_email, to_email, subject, body, message_kind, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setMailMessages(data as MailMessage[]);
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

  const generateEmailForEmployee = async () => {
    const emp = saudiEmployees.find((employee) => employee.id === selectedEmployee);
    if (!emp) {
      toast.error("اختر موظفاً سعودياً");
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-employee-credentials", {
      body: { action: "generate", employeeId: emp.id },
    });
    setIsLoading(false);

    if (error || !data?.success) {
      toast.error(data?.error || "تعذر توليد بيانات دخول الموظف");
      return;
    }

    toast.success("تم توليد وحفظ البريد وكلمة المرور وربطهما بالموظف");
    setSelectedEmployee("");
    await loadGeneratedEmails();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-400" />
          إعدادات الخصومات والإيميلات
        </h1>

        <button
          onClick={() => {
            setShowAdminMailbox((current) => !current);
            loadMailMessages();
          }}
          className="w-full mb-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl p-4 flex items-center justify-between transition"
        >
          <span className="flex items-center gap-3 font-bold">
            <span className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </span>
            بريد الخصومات
          </span>
          <span className="text-xs text-gray-300">الوارد والمرسل حسب الموظف</span>
        </button>

        {showAdminMailbox && (
          <div className="bg-gray-800 rounded-xl p-5 mb-4 text-white">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAdminFolder("inbox")} className={`flex-1 py-2 rounded-lg ${adminFolder === "inbox" ? "bg-blue-600" : "bg-gray-700"}`}>
                الوارد ({mailMessages.filter((message) => message.to_email === primaryEmail).length})
              </button>
              <button onClick={() => setAdminFolder("sent")} className={`flex-1 py-2 rounded-lg ${adminFolder === "sent" ? "bg-blue-600" : "bg-gray-700"}`}>
                المرسل ({mailMessages.filter((message) => message.from_email === primaryEmail).length})
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {mailMessages
                .filter((message) => adminFolder === "inbox" ? message.to_email === primaryEmail : message.from_email === primaryEmail)
                .map((message) => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{message.emp_name}</p>
                      <span className="text-xs text-gray-400">{new Date(message.created_at).toLocaleString("ar-SA")}</span>
                    </div>
                    <p dir="ltr" className="text-xs text-blue-300 text-left mt-1">
                      {adminFolder === "inbox" ? `من: ${message.from_email}` : `إلى: ${message.to_email}`}
                    </p>
                    <p className="font-semibold mt-2">{message.subject}</p>
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-line">{message.body}</p>
                  </div>
                ))}
              {mailMessages.filter((message) => adminFolder === "inbox" ? message.to_email === primaryEmail : message.from_email === primaryEmail).length === 0 && (
                <p className="text-center text-gray-400 py-5">لا توجد رسائل</p>
              )}
            </div>
          </div>
        )}

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
                {isLoading ? "جاري التوليد والحفظ..." : "توليد وحفظ بيانات الدخول"}
              </button>

              <div className="space-y-2 mt-6">
                <h3 className="font-bold">الإيميلات المحفوظة</h3>
                {generatedEmails.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد إيميلات محفوظة</p>
                ) : generatedEmails.map((email) => (
                  <div key={email.id} className="bg-gray-700 p-4 rounded-lg">
                    <p className="font-semibold">{email.emp_name}</p>
                    <p dir="ltr" className="text-sm text-green-400 font-mono text-left">{email.generated_email}</p>
                    <p dir="ltr" className="mt-2 text-sm text-amber-300 font-mono text-left">
                      كلمة المرور: {email.generated_password || "غير متاحة للحسابات القديمة"}
                    </p>
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
