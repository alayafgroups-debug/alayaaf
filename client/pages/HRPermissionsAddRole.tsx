import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type Permission = { key: string; label: string };
type PermissionGroup = { title: string; permissions: Permission[] };

const crudPermissions = (prefix: string, item: string): Permission[] => [
  { key: `${prefix}.view`, label: `استعراض ${item}` },
  { key: `${prefix}.add`, label: `إضافة ${item}` },
  { key: `${prefix}.edit`, label: `تعديل ${item}` },
  { key: `${prefix}.delete`, label: `حذف ${item}` },
  { key: `${prefix}.export`, label: `تصدير ${item}` },
];

const PERMISSION_GROUPS: Record<string, PermissionGroup[]> = {
  "الوصول للأقسام": [
    {
      title: "الأقسام الرئيسية للنظام",
      permissions: [
        { key: "module.sales", label: "المبيعات" },
        { key: "module.purchases", label: "المشتريات" },
        { key: "module.hr", label: "الموارد البشرية" },
        { key: "module.crm", label: "العملاء والموردين" },
        { key: "module.accounting", label: "المحاسبة والمالية" },
        { key: "module.users", label: "المستخدمين والصلاحيات" },
        { key: "module.ai", label: "الذكاء الاصطناعي" },
        { key: "module.settings", label: "الإعدادات" },
        { key: "module.expenses", label: "المصروفات" },
        { key: "module.inventory", label: "المستودعات والمخازن" },
      ],
    },
    {
      title: "أقسام الموارد البشرية",
      permissions: [
        { key: "hr.employees", label: "الموظفون" },
        { key: "hr.attendance", label: "الحضور والانصراف" },
        { key: "hr.payroll", label: "الرواتب" },
        { key: "hr.leaves", label: "الإجازات" },
        { key: "hr.penalties", label: "المساءلات والإنذارات" },
        { key: "hr.reports", label: "التقارير" },
        { key: "hr.termination", label: "إنهاء الخدمة" },
        { key: "hr.settings", label: "إعدادات الموارد البشرية" },
        { key: "hr.permissions", label: "الأدوار والصلاحيات" },
        { key: "hr.org", label: "الهيكل التنظيمي" },
      ],
    },
    {
      title: "أقسام المبيعات",
      permissions: [
        { key: "sales.quotations", label: "عروض الأسعار" },
        { key: "sales.orders", label: "أوامر البيع" },
        { key: "sales.invoices", label: "الفواتير" },
        { key: "sales.returns", label: "مرتجعات المبيعات" },
        { key: "sales.reports", label: "تقارير المبيعات" },
      ],
    },
    {
      title: "أقسام المشتريات",
      permissions: [
        { key: "purchases.requests", label: "طلبات الشراء" },
        { key: "purchases.orders", label: "أوامر الشراء" },
        { key: "purchases.invoices", label: "فواتير الموردين" },
        { key: "purchases.receipts", label: "استلام البضاعة" },
        { key: "purchases.returns", label: "مرتجعات المشتريات" },
      ],
    },
  ],
  "قائمة الموظفين": [
    {
      title: "نطاق عرض الموظفين",
      permissions: [
        { key: "employees.scope.all", label: "استعراض جميع الموظفين" },
        { key: "employees.scope.management", label: "استعراض موظفي الإدارة" },
        { key: "employees.scope.branch", label: "استعراض موظفي الفرع" },
        { key: "employees.scope.department", label: "استعراض موظفي القسم" },
        { key: "employees.scope.direct", label: "استعراض الموظفين تحت الإدارة المباشرة" },
      ],
    },
    {
      title: "إجراءات الموظفين",
      permissions: [
        { key: "add_employee", label: "إضافة موظف جديد" },
        { key: "employees.edit", label: "تعديل بيانات موظف" },
        { key: "employees.delete", label: "حذف موظف" },
        { key: "employees.inactive", label: "استعراض الموظفين غير الفعالين" },
        { key: "employees.movements", label: "عرض حركات الموظفين" },
        { key: "employees.terminate", label: "إنهاء الخدمة" },
        { key: "employees.link_account", label: "ربط حساب الموظف" },
        { key: "employees.financial", label: "عرض البيانات المالية" },
        { key: "employees.financial_edit", label: "تعديل البيانات المالية" },
        { key: "employees.attendance", label: "عرض حالة الحضور" },
      ],
    },
  ],
  "قسم التقارير": [{ title: "صلاحيات التقارير", permissions: crudPermissions("reports", "التقارير") }],
  "حساب الدوام": [{ title: "صلاحيات الدوام", permissions: crudPermissions("attendance", "سجلات الدوام") }],
  "حساب الراتب": [{ title: "صلاحيات الرواتب", permissions: [...crudPermissions("payroll", "الرواتب"), { key: "payroll.approve", label: "اعتماد الرواتب" }] }],
  "قياس الأداء": [{ title: "صلاحيات الأداء", permissions: crudPermissions("performance", "تقييمات الأداء") }],
  "إرسال الطلبات": [{ title: "صلاحيات إرسال الطلبات", permissions: crudPermissions("requests.sent", "الطلبات المرسلة") }],
  "الطلبات الواردة": [{ title: "صلاحيات الطلبات الواردة", permissions: [...crudPermissions("requests.incoming", "الطلبات الواردة"), { key: "requests.approve", label: "اعتماد أو رفض الطلبات" }] }],
  "التأمينات": [{ title: "صلاحيات التأمينات", permissions: crudPermissions("insurance", "التأمينات") }],
  "المساءلات والإنذارات": [{ title: "صلاحيات المساءلات والإنذارات", permissions: crudPermissions("penalties", "المساءلات والإنذارات") }],
  "قسم الإعلانات": [{ title: "صلاحيات الإعلانات", permissions: crudPermissions("announcements", "الإعلانات") }],
  "قسم السلفيات": [{ title: "صلاحيات السلف", permissions: [...crudPermissions("advances", "السلف"), { key: "advances.approve", label: "اعتماد السلف" }] }],
  "النظام المالي": [{ title: "صلاحيات النظام المالي", permissions: crudPermissions("finance", "البيانات المالية") }],
  "تواصل مع الإدارة": [{ title: "صلاحيات التواصل", permissions: crudPermissions("communication", "رسائل الإدارة") }],
  "الإجازات": [{ title: "صلاحيات الإجازات", permissions: [...crudPermissions("leaves", "الإجازات"), { key: "leaves.approve", label: "اعتماد الإجازات" }] }],
  "عمولات الموظفين": [{ title: "صلاحيات العمولات", permissions: crudPermissions("commissions", "العمولات") }],
  "إدارة المشاريع والمهام": [{ title: "صلاحيات المشاريع والمهام", permissions: crudPermissions("projects", "المشاريع والمهام") }],
  "إدارة التدريب": [{ title: "صلاحيات التدريب", permissions: crudPermissions("training", "الدورات التدريبية") }],
};

const PERMISSION_TABS = Object.keys(PERMISSION_GROUPS);

export default function HRPermissionsAddRole() {
  const navigate = useNavigate();
  const { roleId } = useParams();
  const isEditing = Boolean(roleId);
  const [activeTab, setActiveTab] = useState(PERMISSION_TABS[0]);
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(isEditing);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [status, setStatus] = useState("فعال");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!roleId) return;
    let active = true;
    async function loadRole() {
      const { data, error } = await supabase.from("user_roles").select("*").eq("id", roleId).single();
      if (!active) return;
      if (error) {
        toast.error(`تعذر تحميل الدور: ${error.message}`);
        navigate("/hr/permissions/roles");
      } else {
        setNameAr(String(data.name_ar ?? ""));
        setNameEn(String(data.name_en ?? ""));
        setStatus(String(data.status ?? "فعال"));
        setPermissions((data.permissions as Record<string, boolean>) ?? {});
      }
      setLoadingRole(false);
    }
    loadRole();
    return () => { active = false; };
  }, [roleId, navigate]);

  const activePermissions = useMemo(
    () => PERMISSION_GROUPS[activeTab].flatMap((group) => group.permissions),
    [activeTab],
  );
  const allActiveSelected = activePermissions.length > 0 && activePermissions.every((permission) => permissions[permission.key]);

  const handlePermissionChange = (key: string, value: boolean) => {
    setPermissions((previous) => ({ ...previous, [key]: value }));
  };

  const toggleCurrentTab = (checked: boolean) => {
    setPermissions((previous) => {
      const next = { ...previous };
      activePermissions.forEach((permission) => { next[permission.key] = checked; });
      return next;
    });
  };

  const handleSave = async () => {
    if (!nameAr.trim() || !nameEn.trim()) {
      toast.error("يجب ملء اسم الدور بالعربية والإنجليزية");
      return;
    }
    setLoading(true);
    const payload = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      status,
      permissions,
      updated_at: new Date().toISOString(),
    };
    try {
      const result = isEditing
        ? await supabase.from("user_roles").update(payload).eq("id", roleId!).select("id").single()
        : await supabase.from("user_roles").insert(payload).select("id").single();
      if (result.error) throw result.error;
      toast.success(isEditing ? "تم تحديث الدور والصلاحيات" : "تم إضافة الدور والصلاحيات");
      navigate("/hr/permissions/roles");
    } catch (error) {
      toast.error(`تعذر حفظ الدور: ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRole) {
    return <Layout><div className="h-[60vh] flex items-center justify-center" dir="rtl"><Loader2 className="h-7 w-7 animate-spin text-[#004e89]" /><span className="mr-3">جاري تحميل الدور...</span></div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6" dir="rtl">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-[#004e89]">{isEditing ? "تعديل الدور والصلاحيات" : "إضافة دور جديد"}</h2>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/hr/permissions/roles")} variant="outline" className="px-6"><X className="h-4 w-4 ml-1" /> إلغاء</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-[#004e89] hover:bg-[#003865] px-8">
              {loading ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2"><Label>الاسم بالعربية <span className="text-red-500">*</span></Label><Input value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="مثال: مدير الموارد البشرية" /></div>
            <div className="space-y-2"><Label>الاسم بالإنجليزية <span className="text-red-500">*</span></Label><Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="e.g. HR Manager" /></div>
            <div className="space-y-2"><Label>حالة الدور</Label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"><option value="فعال">فعال</option><option value="غير فعال">غير فعال</option></select></div>
          </div>

          <div className="space-y-5">
            <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto whitespace-nowrap">
              {PERMISSION_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={tab === "الوصول للأقسام"
                    ? `px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === tab ? "bg-emerald-600 text-white" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"}`
                    : cnTab(activeTab === tab)
                  }
                >
                  {tab === "الوصول للأقسام" && <span className="text-base">🏢</span>}
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center bg-gray-50 border rounded-lg px-4 py-3">
              <div><p className="font-semibold text-gray-800">صلاحيات {activeTab}</p><p className="text-xs text-gray-500">يتم حفظ جميع الخيارات المحددة مع الدور</p></div>
              <div className="flex items-center gap-2"><Label htmlFor="selectAll" className="cursor-pointer">اختيار الكل</Label><Checkbox id="selectAll" checked={allActiveSelected} onCheckedChange={(value) => toggleCurrentTab(value === true)} /></div>
            </div>

            {PERMISSION_GROUPS[activeTab].map((group) => (
              <div key={group.title} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className={`px-4 py-3 border-b font-bold ${activeTab === "الوصول للأقسام" ? "bg-emerald-50 text-emerald-800" : "bg-gray-50 text-gray-800"}`}>
                  {group.title}
                </div>
                <div className={`p-4 ${activeTab === "الوصول للأقسام" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0"}`}>
                  {group.permissions.map((permission) => (
                    activeTab === "الوصول للأقسام" ? (
                      <label key={permission.key} htmlFor={permission.key} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${permissions[permission.key] ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                        <span className="font-medium text-sm text-gray-800">{permission.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${permissions[permission.key] ? "text-emerald-600" : "text-gray-400"}`}>{permissions[permission.key] ? "مفعّل" : "معطّل"}</span>
                          <Checkbox id={permission.key} checked={permissions[permission.key] ?? false} onCheckedChange={(value) => handlePermissionChange(permission.key, value === true)} />
                        </div>
                      </label>
                    ) : (
                      <div key={permission.key} className="flex items-center justify-between border-b border-gray-100 py-3 gap-4">
                        <Label htmlFor={permission.key} className="text-sm cursor-pointer">{permission.label}</Label>
                        <Checkbox id={permission.key} checked={permissions[permission.key] ?? false} onCheckedChange={(value) => handlePermissionChange(permission.key, value === true)} />
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function cnTab(active: boolean) {
  return `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? "bg-[#004e89] text-white" : "text-gray-600 hover:bg-gray-100"}`;
}
