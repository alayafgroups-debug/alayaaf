import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  X,
  Upload,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
export type Allowance = {
  id: string;
  type: string;
  amount: number;
  from: string;
  to: string;
  effect: string;
};

export type InsuranceItem = {
  id: string;
  type: string;
  value: string;
  notes: string;
};

export type DeptOpt = { id: string; name: string };
export type SectionOpt = { id: string; name: string; departmentId: string; department: string };

export type EmpFormData = {
  id: string;
  // Step 1: Personal
  name: string; // الاسم الكامل (إجباري)
  firstName: string; // الاسم الكامل (حسبي)
  birthDate: string;
  gender: string;
  email: string;
  phone: string;
  nationality: string;
  address2: string;
  maritalStatus: string;
  nationalId: string;
  workContactType: string;
  idExpiryDate: string;
  passportNumber: string;
  passportExpiryDate: string;
  workPermitNumber: string;
  residencePermitDate: string;
  kafalaNumber: string;
  kafalaExpiryDate: string;
  photoUrl: string;
  // Step 2: Job
  division: string;
  jobTitle: string;
  branch: string;
  employmentType: string;
  directorate: string;
  departmentId: string;
  department: string;
  sectionId: string;
  otherWorkLocations: string;
  workLocation: string;
  directManager: string;
  hireDate: string;
  isContractEnd: boolean;
  employeeCategory: string;
  contractEndDate: string;
  workSchedule: string;
  workTime: string;
  attendanceExempt: boolean;
  dailyHours: number;
  allowRemoteUpload: boolean;
  allowRemoteAttendance: boolean;
  managementDaysAfter: number;
  trainingDaysStart: number;
  // Step 3: Financial
  baseSalary: number;
  currency: string;
  allowances: Allowance[];
  socialInsurance: string;
  socialInsuranceType: string;
  socialInsuranceStartDate: string;
  insuranceOther: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  bankName2: string;
  bankBranch2: string;
  bankAccount2: string;
  // Step 4: Permissions
  permissions: string[];
  // Step 5: Insurance
  insuranceItems: InsuranceItem[];
  // Step 6: Documents
  documents: Record<string, string>;
  // Step 7: Account
  username: string;
  accountTitle: string;
  employeeRole: string;
  password: string;
  // Extra
  status: string;
  empId: string;
  costCenter: string;
  notes: string;
  totalSalary: number;
};

export const emptyForm = (): EmpFormData => ({
  id: crypto.randomUUID(),
  name: "",
  firstName: "",
  birthDate: "",
  gender: "",
  email: "",
  phone: "",
  nationality: "",
  address2: "",
  maritalStatus: "",
  nationalId: "",
  workContactType: "",
  idExpiryDate: "",
  passportNumber: "",
  passportExpiryDate: "",
  workPermitNumber: "",
  residencePermitDate: "",
  kafalaNumber: "",
  kafalaExpiryDate: "",
  photoUrl: "",
  division: "",
  jobTitle: "",
  branch: "",
  employmentType: "أساسي",
  directorate: "",
  departmentId: "",
  department: "",
  sectionId: "",
  otherWorkLocations: "",
  workLocation: "",
  directManager: "",
  hireDate: "",
  isContractEnd: false,
  employeeCategory: "",
  contractEndDate: "",
  workSchedule: "",
  workTime: "",
  attendanceExempt: false,
  dailyHours: 8,
  allowRemoteUpload: true,
  allowRemoteAttendance: true,
  managementDaysAfter: 0,
  trainingDaysStart: 0,
  baseSalary: 0,
  currency: "SAR",
  allowances: [],
  socialInsurance: "لا",
  socialInsuranceType: "",
  socialInsuranceStartDate: "",
  insuranceOther: "",
  bankName: "",
  bankBranch: "",
  bankAccount: "",
  bankName2: "",
  bankBranch2: "",
  bankAccount2: "",
  permissions: [],
  insuranceItems: [],
  documents: {},
  username: "",
  accountTitle: "",
  employeeRole: "",
  password: "",
  status: "فعال",
  empId: "",
  costCenter: "",
  notes: "",
  totalSalary: 0,
});

export const mapRowToForm = (r: Record<string, unknown>): EmpFormData => ({
  id: String(r.id ?? ""),
  name: String(r.name ?? ""),
  firstName: String(r.first_name ?? ""),
  birthDate: String(r.birth_date ?? ""),
  gender: String(r.gender ?? ""),
  email: String(r.email ?? ""),
  phone: String(r.phone ?? ""),
  nationality: String(r.nationality ?? ""),
  address2: String(r.address2 ?? ""),
  maritalStatus: String(r.marital_status ?? ""),
  nationalId: String(r.national_id ?? ""),
  workContactType: String(r.work_contact_type ?? ""),
  idExpiryDate: String(r.id_expiry_date ?? ""),
  passportNumber: String(r.passport_number ?? ""),
  passportExpiryDate: String(r.passport_expiry_date ?? ""),
  workPermitNumber: String(r.work_permit_number ?? ""),
  residencePermitDate: String(r.residence_permit_date ?? ""),
  kafalaNumber: String(r.kafala_number ?? ""),
  kafalaExpiryDate: String(r.kafala_expiry_date ?? ""),
  photoUrl: String(r.photo_url ?? ""),
  division: String(r.division ?? ""),
  jobTitle: String(r.job_title ?? ""),
  branch: String(r.branch ?? ""),
  employmentType: String(r.employment_type ?? "أساسي"),
  directorate: String(r.directorate ?? ""),
  departmentId: String(r.department_id ?? ""),
  department: String(r.department ?? ""),
  sectionId: String(r.section_id ?? ""),
  otherWorkLocations: String(r.other_work_locations ?? ""),
  workLocation: String(r.work_location ?? ""),
  directManager: String(r.direct_manager ?? ""),
  hireDate: String(r.hire_date ?? ""),
  isContractEnd: Boolean(r.is_contract_end ?? false),
  employeeCategory: String(r.employee_category ?? ""),
  contractEndDate: String(r.contract_end_date ?? ""),
  workSchedule: String(r.work_schedule ?? ""),
  workTime: String(r.work_time ?? ""),
  attendanceExempt: Boolean(r.attendance_exempt ?? false),
  dailyHours: Number(r.daily_hours ?? 8),
  allowRemoteUpload: Boolean(r.allow_remote_upload ?? true),
  allowRemoteAttendance: Boolean(r.allow_remote_attendance ?? true),
  managementDaysAfter: Number(r.management_days_after ?? 0),
  trainingDaysStart: Number(r.training_days_start ?? 0),
  baseSalary: Number(r.base_salary ?? 0),
  currency: String(r.currency ?? "SAR"),
  allowances: Array.isArray(r.allowances) ? (r.allowances as Allowance[]) : [],
  socialInsurance: ["نعم", "مشمول"].includes(String(r.social_insurance ?? "")) ? "نعم" : "لا",
  socialInsuranceType: String(r.social_insurance_type ?? ""),
  socialInsuranceStartDate: String(r.social_insurance_start_date ?? ""),
  insuranceOther: String(r.insurance_other ?? ""),
  bankName: String(r.bank_name ?? ""),
  bankBranch: String(r.bank_branch ?? ""),
  bankAccount: String(r.bank_account ?? ""),
  bankName2: String(r.bank_name2 ?? ""),
  bankBranch2: String(r.bank_branch2 ?? ""),
  bankAccount2: String(r.bank_account2 ?? ""),
  permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
  insuranceItems: Array.isArray(r.insurance_items)
    ? (r.insurance_items as InsuranceItem[])
    : [],
  documents: (r.documents as Record<string, string>) ?? {},
  username: String(r.username ?? ""),
  accountTitle: String(r.account_title ?? ""),
  employeeRole: String(r.employee_role ?? ""),
  password: "",
  status: String(r.status ?? "نشط") === "نشط" ? "فعال" : String(r.status ?? "غير نشط") === "غير نشط" ? "غير فعال" : String(r.status ?? "فعال"),
  empId: String(r.emp_id ?? ""),
  costCenter: String(r.cost_center ?? ""),
  notes: String(r.notes ?? ""),
  totalSalary: Number(r.total_salary ?? r.base_salary ?? 0),
});

// ─── Constants ──────────────────────────────────────────────────────────────
const NATIONALITIES = ["المملكة العربية السعودية", "مصر", "سوريا", "باكستان", "الهند", "الفلبين", "اليمن", "السودان", "الأردن", "لبنان", "بنغلاديش", "إثيوبيا", "نيجيريا", "أخرى"];
const DEFAULT_DEPARTMENTS = ["الإدارة العليا", "إدارة الموارد البشرية", "إدارة المالية", "إدارة التشغيل", "إدارة المبيعات"];
const DEFAULT_SECTIONS = ["الموارد البشرية", "المحاسبة", "الصيانة والتشغيل", "المبيعات", "تقنية المعلومات"];
const BRANCHES = ["فرع التشغيل والصيانة", "الفرع الرئيسي", "فرع المبيعات"];
const GENDERS = ["ذكر", "أنثى"];
const MARITAL_STATUSES = ["أعزب", "متزوج", "مطلق", "أرمل"];
const DEFAULT_JOBS = ["مدير عام", "مدير موارد بشرية", "مدير مالي", "محاسب", "مهندس", "فني صيانة", "مسؤول مبيعات", "مسؤول مشتريات", "أخصائي موارد بشرية", "موظف إداري"];
const CURRENCIES = ["SAR - Saudi Riyal", "USD - US Dollar", "EUR - Euro", "AED - UAE Dirham"];
const DEFAULT_WORK_SCHEDULES = ["جدول الشركة الأساسي", "جدول مرن", "عمل من المنزل", "نظام ورديات"];
const DEFAULT_WORK_LOCATIONS = ["المقر الرئيسي", "فرع التشغيل والصيانة", "فرع المبيعات"];
const ALLOWANCE_TYPES = ["بدل السكن", "بدل النقل", "بدل الأطفال", "بدل الطعام", "بدل الهاتف", "بدل اللباس", "أخرى"];
const SOCIAL_INSURANCE_TYPES = ["سعودي قابل للخصم", "سعودي غير قابل للخصم"];

type OrganizationOptions = {
  departments: string[];
  sections: string[];
  jobs: string[];
  workLocations: string[];
  workSchedules: string[];
  companies: string[];
};

const DEFAULT_ORGANIZATION_OPTIONS: OrganizationOptions = {
  departments: DEFAULT_DEPARTMENTS,
  sections: DEFAULT_SECTIONS,
  jobs: DEFAULT_JOBS,
  workLocations: DEFAULT_WORK_LOCATIONS,
  workSchedules: DEFAULT_WORK_SCHEDULES,
  companies: ["الشركة الرئيسية"],
};

const PERMISSIONS_COLUMNS = [
  ["صيانة", "الصرف", "السلف", "استئذان", "الإجازات"],
  ["عهدة", "عمل إضافي", "دورة تدريبية", "نقل", "إخلاء طرف"],
  ["شراء", "إضافة طرف", "مباشرة العمل", "انتداب", "استقالة"],
  ["صرف امتياز مالي", "إقالة موظف", "وظيفة شاغرة", "إضافة موظف"],
  ["تعديل راتب", "مهمة عمل", "صرف عمولة", "صرف مستحقات إجازة"],
];

const DOCUMENT_TYPES = [
  { key: "id_card", label: "صورة بطاقة الهوية" },
  { key: "passport", label: "صورة جواز السفر" },
  { key: "cv", label: "سيرة ذاتية" },
  { key: "personal_photo", label: "صورة شخصية" },
  { key: "qualification", label: "المؤهل العملي" },
  { key: "other", label: "وثائق أخرى" },
];

const STEPS = [
  { id: "personal", label: "تفاصيل شخصية" },
  { id: "job", label: "البيانات الوظيفية" },
  { id: "financial", label: "بيانات مالية" },
  { id: "requests", label: "الطلبات الخاصة للموظف" },
  { id: "insurance", label: "التأمين" },
  { id: "documents", label: "وثائق الموظف" },
  { id: "account", label: "معلومات الحساب" },
  { id: "finish", label: "الإنهاء" },
];

// ─── Main EmployeeForm Component ────────────────────────────────────────────
export default function EmployeeForm({
  mode,
  initialData,
  onBack,
  onSaved,
}: {
  mode: "create" | "edit";
  initialData?: EmpFormData;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EmpFormData>(initialData ?? emptyForm());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orgDepartments, setOrgDepartments] = useState<DeptOpt[]>([]);
  const [orgSections, setOrgSections] = useState<SectionOpt[]>([]);
  const [employeeRoles, setEmployeeRoles] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [d, s, r] = await Promise.all([
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("org_sections").select("id, name, department_id, department").order("name"),
        supabase.from("user_roles").select("name_ar").eq("status", "فعال").order("name_ar"),
      ]);
      setOrgDepartments(
        ((d.data as Record<string, unknown>[]) ?? []).map((x) => ({ id: String(x.id), name: String(x.name ?? "") })),
      );
      setOrgSections(
        ((s.data as Record<string, unknown>[]) ?? []).map((x) => ({
          id: String(x.id),
          name: String(x.name ?? ""),
          departmentId: x.department_id ? String(x.department_id) : "",
          department: String(x.department ?? ""),
        })),
      );
      setEmployeeRoles(
        ((r.data as Record<string, unknown>[]) ?? [])
          .map((x) => String(x.name_ar ?? ""))
          .filter(Boolean),
      );
    })();
  }, []);

  const set = <K extends keyof EmpFormData>(key: K, value: EmpFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    set("password", pwd);
  };

  const togglePermission = (perm: string) => {
    set("permissions", form.permissions.includes(perm)
      ? form.permissions.filter((p) => p !== perm)
      : [...form.permissions, perm]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "الاسم الكامل مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Auto-generate emp_id and job number for new employees
      let autoEmpId = form.empId;
      let autoAccountTitle = form.accountTitle;
      if (mode === "create" && !autoEmpId) {
        const { count } = await supabase.from("employees").select("*", { count: "exact", head: true });
        const nextNum = String((count ?? 0) + 1).padStart(3, "0");
        autoEmpId = `EMP-${nextNum}`;
        if (!autoAccountTitle) autoAccountTitle = autoEmpId;
      }

      const payload = {
        id: form.id,
        emp_id: autoEmpId || null,
        name: form.name,
        first_name: form.firstName,
        birth_date: form.birthDate || null,
        gender: form.gender,
        email: form.email,
        phone: form.phone,
        nationality: form.nationality,
        address2: form.address2,
        marital_status: form.maritalStatus,
        national_id: form.nationalId,
        work_contact_type: form.workContactType,
        id_expiry_date: form.idExpiryDate || null,
        passport_number: form.passportNumber,
        passport_expiry_date: form.passportExpiryDate || null,
        work_permit_number: form.workPermitNumber,
        residence_permit_date: form.residencePermitDate || null,
        kafala_number: form.kafalaNumber,
        kafala_expiry_date: form.kafalaExpiryDate || null,
        photo_url: form.photoUrl,
        division: form.division,
        job_title: form.jobTitle,
        branch: form.branch,
        employment_type: form.employmentType,
        directorate: form.directorate,
        department_id: form.departmentId || null,
        department: form.department,
        section_id: form.sectionId || null,
        other_work_locations: form.otherWorkLocations,
        work_location: form.workLocation,
        direct_manager: form.directManager,
        hire_date: form.hireDate || null,
        is_contract_end: form.isContractEnd,
        employee_category: form.employeeCategory,
        contract_end_date: form.contractEndDate || null,
        work_schedule: form.workSchedule,
        work_time: form.workTime,
        attendance_exempt: form.attendanceExempt,
        daily_hours: form.dailyHours,
        allow_remote_upload: form.allowRemoteUpload,
        allow_remote_attendance: form.allowRemoteAttendance,
        management_days_after: form.managementDaysAfter,
        training_days_start: form.trainingDaysStart,
        base_salary: form.baseSalary,
        total_salary: form.baseSalary,
        currency: form.currency,
        allowances: form.allowances,
        social_insurance: form.socialInsurance,
        social_insurance_type: form.socialInsuranceType,
        social_insurance_start_date: form.socialInsuranceStartDate || null,
        insurance_other: form.insuranceOther,
        bank_name: form.bankName,
        bank_branch: form.bankBranch,
        bank_account: form.bankAccount,
        bank_name2: form.bankName2,
        bank_branch2: form.bankBranch2,
        bank_account2: form.bankAccount2,
        permissions: form.permissions,
        insurance_items: form.insuranceItems,
        documents: form.documents,
        username: form.username,
        account_title: autoAccountTitle,
        employee_role: form.employeeRole,
        status: form.status,
        cost_center: form.costCenter,
        notes: form.notes,
      };

      if (mode === "create") {
        const { error: insertError } = await supabase.from("employees").insert([payload]);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase.from("employees").update(payload).eq("id", form.id);
        if (updateError) throw updateError;
      }
      toast({ title: mode === "create" ? "تم إضافة الموظف" : "تم تحديث البيانات", description: `بيانات ${form.name} تم حفظها بنجاح` });
      onSaved();
    } catch (e: unknown) {
      const message = (e as { message?: string })?.message ?? "حدث خطأ أثناء الحفظ";
      toast({ title: "خطأ في الحفظ", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div dir="rtl" className="max-w-6xl mx-auto pb-10">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">{mode === "create" ? "إضافة موظف" : "تعديل موظف"}</h1>
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" /> إغلاق
          </button>
        </div>

        {/* Stepper */}
        <StepperHeader steps={STEPS} current={step} onStepClick={setStep} />

        {/* Step Content */}
        <div className="bg-white border border-gray-200 rounded-b-xl shadow-sm p-6 mt-0">
          {step === 0 && <Step1Personal form={form} set={set} />}
          {step === 1 && <Step2Job form={form} set={set} departments={orgDepartments} sections={orgSections} />}
          {step === 2 && <Step3Financial form={form} set={set} />}
          {step === 3 && <Step4Permissions form={form} togglePermission={togglePermission} />}
          {step === 4 && <Step5Insurance form={form} set={set} />}
          {step === 5 && <Step6Documents form={form} set={set} />}
          {step === 6 && <Step7Account form={form} set={set} roles={employeeRoles} showPassword={showPassword} setShowPassword={setShowPassword} generatePassword={generatePassword} />}
          {step === 7 && <Step8Finish saving={saving} onSave={handleSave} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" /> السابق
          </button>
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1}
            className="flex items-center gap-1 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            التالي <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}

// ─── Stepper Header ──────────────────────────────────────────────────────────
function StepperHeader({ steps, current, onStepClick }: { steps: typeof STEPS; current: number; onStepClick: (i: number) => void }) {
  return (
    <div className="bg-white border border-b-0 border-gray-200 rounded-t-xl px-6 py-4">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(i)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                i === current
                  ? "bg-blue-600 border-blue-600 text-white"
                  : i < current
                    ? "bg-blue-100 border-blue-400 text-blue-700"
                    : "bg-white border-gray-300 text-gray-500"
              )}>
                {i + 1}
              </div>
              <span className={cn(
                "text-[10px] text-center leading-tight max-w-[70px] hidden sm:block",
                i === current ? "text-blue-600 font-semibold" : "text-gray-500"
              )}>
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-1 mb-4",
                i < current ? "bg-blue-400" : "bg-gray-200"
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Personal Details ────────────────────────────────────────────────
function Step1Personal({ form, set }: { form: EmpFormData; set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void }) {
  return (
    <div className="space-y-5">
      {/* Photo Upload */}
      <div className="flex flex-col items-center gap-2 pb-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
          {form.photoUrl ? (
            <img src={form.photoUrl} alt="صورة الموظف" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>
        <button className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
          صورة
        </button>
      </div>

      {/* Row 1: Names */}
      <div className="grid grid-cols-2 gap-4">
        <FInput label="الاسم كامل عربي *" value={form.name} onChange={(v) => set("name", v)} placeholder="الاسم كامل عربي" />
        <FInput label="الاسم كامل إنجليزي" value={form.firstName} onChange={(v) => set("firstName", v)} placeholder="Full name in English" />
      </div>

      {/* Row 2: Gender / Birthdate */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="الجنس *" value={form.gender} onChange={(v) => set("gender", v)} options={GENDERS} placeholder="--" />
        <FInput label="تاريخ الميلاد *" value={form.birthDate} onChange={(v) => set("birthDate", v)} type="date" />
      </div>

      {/* Row 3: Email / Phone */}
      <div className="grid grid-cols-2 gap-4">
        <FInput label="البريد الإلكتروني *" value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="example@email.com" />
        <FInput label="رقم الهاتف *" value={form.phone} onChange={(v) => set("phone", v)} placeholder="05xxxxxxxx" />
      </div>

      {/* Row 4: Nationality / Address2 */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="الجنسية *" value={form.nationality} onChange={(v) => set("nationality", v)} options={NATIONALITIES} placeholder="حدد الدولة..." />
        <FInput label="العنوان الثاني *" value={form.address2} onChange={(v) => set("address2", v)} placeholder="" />
      </div>

      {/* Row 5: Marital Status / National ID */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="الحالة الاجتماعية *" value={form.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL_STATUSES} placeholder="الإتاحة الاجتماعية..." />
        <FInput label="رقم الهوية" value={form.nationalId} onChange={(v) => set("nationalId", v)} placeholder="" />
      </div>

      {/* Row 6: Work Contact Type */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="التواصل العملي" value={form.workContactType} onChange={(v) => set("workContactType", v)} options={["هاتف", "بريد إلكتروني", "واتساب"]} placeholder="---" />
        <div />
      </div>

      {/* Date Range: ID Expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ نهاية الهوية</label>
        <div className="grid grid-cols-2 gap-3">
          <FInput label="" value={form.idExpiryDate} onChange={(v) => set("idExpiryDate", v)} type="date" />
          <div />
        </div>
      </div>

      {/* Passport */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ نهاية جواز السفر</label>
          <input type="date" value={form.passportExpiryDate} onChange={(e) => set("passportExpiryDate", e.target.value)} className={inputCls} />
        </div>
        <FInput label="رقم جواز السفر" value={form.passportNumber} onChange={(v) => set("passportNumber", v)} placeholder="" />
      </div>

      {/* Work Permit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الترجمة</label>
          <input type="date" value={form.residencePermitDate} onChange={(e) => set("residencePermitDate", e.target.value)} className={inputCls} />
        </div>
        <FInput label="رقم العمل الفعلي" value={form.workPermitNumber} onChange={(v) => set("workPermitNumber", v)} placeholder="" />
      </div>

      {/* Kafala */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء الكفالة</label>
          <input type="date" value={form.kafalaExpiryDate} onChange={(e) => set("kafalaExpiryDate", e.target.value)} className={inputCls} />
        </div>
        <FInput label="رقم الكفالة" value={form.kafalaNumber} onChange={(v) => set("kafalaNumber", v)} placeholder="" />
      </div>
    </div>
  );
}

// ─── Step 2: Job Data ────────────────────────────────────────────────────────
function Step2Job({ form, set, departments, sections }: { form: EmpFormData; set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void; departments: DeptOpt[]; sections: SectionOpt[] }) {
  const availableSections = form.departmentId
    ? sections.filter((s) => s.departmentId === form.departmentId)
    : sections;

  const onDirectorateChange = (deptId: string) => {
    set("departmentId", deptId);
    set("directorate", departments.find((d) => d.id === deptId)?.name ?? "");
    set("sectionId", "");
    set("department", "");
  };

  const onSectionChange = (sectionId: string) => {
    set("sectionId", sectionId);
    set("department", sections.find((s) => s.id === sectionId)?.name ?? "");
  };

  return (
    <div className="space-y-5">
      {/* Row 1: Division / Job Title */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="الشعبة *" value={form.division} onChange={(v) => set("division", v)} options={DEFAULT_DEPARTMENTS} placeholder="--" />
        <FSelect label="المسمى الوظيفي *" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} options={DEFAULT_JOBS} placeholder="--" />
      </div>

      {/* Row 2: Branch / Employment Type */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="النوع *" value={form.employmentType} onChange={(v) => set("employmentType", v)} options={["أساسي", "كل الفروع", "جزئي", "عقد"]} placeholder="--" />
        <FSelect label="الفرع *" value={form.branch} onChange={(v) => set("branch", v)} options={BRANCHES} placeholder="--" />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="الحالة *" value={form.status} onChange={(v) => set("status", v)} options={["فعال", "غير فعال", "إجازة", "منتهي"]} placeholder="--" />
        <div />
      </div>

      {/* Row 3: Directorate / Department (real FK links) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الإدارة *</label>
          <select value={form.departmentId} onChange={(e) => onDirectorateChange(e.target.value)} className={inputCls}>
            <option value="">{departments.length ? "--" : "أضف الإدارات من الهيكل التنظيمي"}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">القسم *</label>
          <select value={form.sectionId} onChange={(e) => onSectionChange(e.target.value)} className={inputCls}>
            <option value="">{availableSections.length ? "--" : "لا توجد أقسام لهذه الإدارة"}</option>
            {availableSections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 4: Other Locations / Work Location */}
      <div className="grid grid-cols-2 gap-4">
        <FInput label="مواقع العمل الأخرى" value={form.otherWorkLocations} onChange={(v) => set("otherWorkLocations", v)} />
        <FSelect label="مكان العمل *" value={form.workLocation} onChange={(v) => set("workLocation", v)} options={DEFAULT_WORK_LOCATIONS} placeholder="--" />
      </div>
      <p className="text-xs text-gray-400 -mt-3">يمكنك إضافة مواقع متعددة بعد إدارة هذا الموظف للأساسي</p>

      {/* Row 5: Direct Manager / Hire Date */}
      <div className="grid grid-cols-2 gap-4">
        <FInput label="المدير المباشر *" value={form.directManager} onChange={(v) => set("directManager", v)} />
        <FInput label="تاريخ التعيين *" value={form.hireDate} onChange={(v) => set("hireDate", v)} type="date" />
      </div>

      {/* Row 6: Is Contract End (radio) */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-gray-700">فترة تجربة</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="isContractEnd" checked={form.isContractEnd === true} onChange={() => set("isContractEnd", true)} className="accent-blue-600" />
          <span className="text-sm">نعم</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="isContractEnd" checked={form.isContractEnd === false} onChange={() => set("isContractEnd", false)} className="accent-blue-600" />
          <span className="text-sm">لا</span>
        </label>
      </div>

      {/* Row 7: Employee Category / Contract End Date */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="فئة الموظف" value={form.employeeCategory} onChange={(v) => set("employeeCategory", v)} options={["دوام", "عقد", "جزئي", "مؤقت"]} placeholder="--" />
        <FInput label="تاريخ انتهاء العقد" value={form.contractEndDate} onChange={(v) => set("contractEndDate", v)} type="date" />
      </div>

      {/* Row 8: Work Schedule / Work Time */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="جدول العمل *" value={form.workSchedule} onChange={(v) => set("workSchedule", v)} options={DEFAULT_WORK_SCHEDULES} placeholder="--" />
        <FSelect label="وقت العمل *" value={form.workTime} onChange={(v) => set("workTime", v)} options={["صباحي", "مسائي", "كامل", "ورديات"]} placeholder="--" />
      </div>

      {/* Row 9: Attendance Exempt / Daily Hours */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="معفي من الحضور اليومي" value={form.attendanceExempt ? "نعم" : "لا"} onChange={(v) => set("attendanceExempt", v === "نعم")} options={["نعم", "لا"]} placeholder="--" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">عدد ساعات اليوم</label>
          <input type="number" value={form.dailyHours} onChange={(e) => set("dailyHours", Number(e.target.value))} min={0} max={24} className={inputCls} />
        </div>
      </div>

      {/* Remote Upload Radio */}
      <div className="flex items-center gap-4 border rounded-lg p-3 bg-gray-50">
        <span className="text-sm font-medium text-gray-700 flex-1">السماح بالتحميل من خلال الموقع والتطبيق *</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="allowUpload" checked={form.allowRemoteUpload} onChange={() => set("allowRemoteUpload", true)} className="accent-blue-600" />
          <span className="text-sm">نعم</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="allowUpload" checked={!form.allowRemoteUpload} onChange={() => set("allowRemoteUpload", false)} className="accent-blue-600" />
          <span className="text-sm">لا</span>
        </label>
      </div>

      {/* Remote Attendance Radio */}
      <div className="flex items-center gap-4 border rounded-lg p-3 bg-gray-50">
        <span className="text-sm font-medium text-gray-700 flex-1">السماح للموظف باحتساب من خلال الموقع والتطبيق</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="allowAttend" checked={form.allowRemoteAttendance} onChange={() => set("allowRemoteAttendance", true)} className="accent-blue-600" />
          <span className="text-sm">نعم</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" name="allowAttend" checked={!form.allowRemoteAttendance} onChange={() => set("allowRemoteAttendance", false)} className="accent-blue-600" />
          <span className="text-sm">لا</span>
        </label>
      </div>

      {/* Management Days / Training Days */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">عدد أيام الإجازة المسموح بها خلال السنة التعاقدية *</label>
          <input type="number" value={form.managementDaysAfter} onChange={(e) => set("managementDaysAfter", Number(e.target.value))} min={0} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">بدء أيام التدريب</label>
          <input type="number" value={form.trainingDaysStart} onChange={(e) => set("trainingDaysStart", Number(e.target.value))} min={0} className={inputCls} />
        </div>
      </div>
      <p className="text-xs text-gray-400">هذا الحقل فقط إذا كان الموظف لديه يرتب الخصم مرة واحدة فقط</p>
    </div>
  );
}

// ─── Step 3: Financial ───────────────────────────────────────────────────────
function Step3Financial({ form, set }: { form: EmpFormData; set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void }) {
  const addAllowance = () => {
    const newAllowance: Allowance = { id: crypto.randomUUID(), type: "", amount: 0, from: "", to: "", effect: "" };
    set("allowances", [...form.allowances, newAllowance]);
  };

  const removeAllowance = (id: string) => set("allowances", form.allowances.filter((a) => a.id !== id));

  const updateAllowance = (id: string, field: keyof Allowance, value: string | number) => {
    set("allowances", form.allowances.map((a) => a.id === id ? { ...a, [field]: value } : a));
  };

  return (
    <div className="space-y-6">
      {/* Base Salary / Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الأساسي *</label>
          <input
            type="number"
            value={form.baseSalary}
            onChange={(e) => set("baseSalary", Number(e.target.value))}
            min={0}
            className={inputCls}
            placeholder="0"
          />
        </div>
        <FSelect
          label="عملة *"
          value={form.currency}
          onChange={(v) => set("currency", v)}
          options={CURRENCIES}
          placeholder="Saudi Riyal SAR +(عملة النظام)"
        />
      </div>

      {/* Allowances Table */}
      <div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
          <span className="text-sm font-semibold">بدلات</span>
          <div className="flex gap-2 text-xs opacity-80">
            <span>الأثر</span>
            <span className="w-16 text-center">إلى</span>
            <span className="w-16 text-center">من</span>
            <span className="w-20 text-center">القيمة الأول</span>
            <span className="w-32 text-center">نوع البدل</span>
          </div>
        </div>
        <div className="border border-t-0 border-gray-200 rounded-b-lg">
          {form.allowances.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0">
              <button onClick={() => removeAllowance(a.id)} className="text-red-400 hover:text-red-600 p-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <select value={a.effect} onChange={(e) => updateAllowance(a.id, "effect", e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm">
                <option value="">الأثر</option>
                <option value="مضاف">مضاف</option>
                <option value="مخصوم">مخصوم</option>
              </select>
              <input type="date" value={a.to} onChange={(e) => updateAllowance(a.id, "to", e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" />
              <input type="date" value={a.from} onChange={(e) => updateAllowance(a.id, "from", e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" />
              <input type="number" value={a.amount} onChange={(e) => updateAllowance(a.id, "amount", Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="0" />
              <select value={a.type} onChange={(e) => updateAllowance(a.id, "type", e.target.value)} className="w-32 border rounded px-2 py-1 text-sm">
                <option value="">نوع البدل</option>
                {ALLOWANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          ))}
          <div className="px-3 py-2">
            <button onClick={addAllowance} className="flex items-center gap-1 text-blue-600 text-sm hover:text-blue-700">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Insurance Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">معلومات التأمين</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-gray-700">التأمينات الاجتماعية *</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="socialInsurance" checked={form.socialInsurance === "نعم"} onChange={() => set("socialInsurance", "نعم")} className="accent-blue-600" />
              <span className="text-sm">نعم</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" name="socialInsurance" checked={form.socialInsurance !== "نعم"} onChange={() => set("socialInsurance", "لا")} className="accent-blue-600" />
              <span className="text-sm">لا</span>
            </label>
          </div>
          {form.socialInsurance === "نعم" && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4 border border-blue-200">
              <FSelect label="نوع التأمين *" value={form.socialInsuranceType} onChange={(v) => set("socialInsuranceType", v)} options={SOCIAL_INSURANCE_TYPES} placeholder="اختر نوع التأمين" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاشتراك (ميلادي) *</label>
                <input
                  type="date"
                  value={form.socialInsuranceStartDate}
                  onChange={(e) => set("socialInsuranceStartDate", e.target.value)}
                  className={inputCls}
                />
                {form.socialInsuranceStartDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    التاريخ بالهجري: {
                      (() => {
                        try {
                          const d = new Date(form.socialInsuranceStartDate);
                          return d.toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
                        } catch { return ""; }
                      })()
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bank Info (Two Banks) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">معلومات عن البنك</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <FInput label="اسم البنك" value={form.bankName} onChange={(v) => set("bankName", v)} />
            <FInput label="اسم الفرع" value={form.bankBranch} onChange={(v) => set("bankBranch", v)} />
            <FInput label="رقم الحساب" value={form.bankAccount} onChange={(v) => set("bankAccount", v)} />
          </div>
          <div className="space-y-3">
            <FInput label="اسم البنك" value={form.bankName2} onChange={(v) => set("bankName2", v)} />
            <FInput label="اسم الفرع" value={form.bankBranch2} onChange={(v) => set("bankBranch2", v)} />
            <FInput label="رقم الحساب" value={form.bankAccount2} onChange={(v) => set("bankAccount2", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Permissions ─────────────────────────────────────────────────────
function Step4Permissions({ form, togglePermission }: { form: EmpFormData; togglePermission: (p: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-4">
        {PERMISSIONS_COLUMNS.map((col, ci) => (
          <div key={ci} className="space-y-2">
            {col.map((perm) => (
              <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="rounded border-gray-300 accent-blue-600"
                />
                <span className="text-sm text-gray-700 group-hover:text-blue-600">{perm}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Insurance ───────────────────────────────────────────────────────
function Step5Insurance({ form, set }: { form: EmpFormData; set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void }) {
  const addItem = () => {
    const newItem: InsuranceItem = { id: crypto.randomUUID(), type: "", value: "", notes: "" };
    set("insuranceItems", [...form.insuranceItems, newItem]);
  };
  const removeItem = (id: string) => set("insuranceItems", form.insuranceItems.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof InsuranceItem, value: string) => {
    set("insuranceItems", form.insuranceItems.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  return (
    <div className="space-y-4">
      {form.insuranceItems.map((item) => (
        <div key={item.id} className="flex items-center gap-3 border rounded-lg p-3">
          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
          <input value={item.type} onChange={(e) => updateItem(item.id, "type", e.target.value)} placeholder="نوع التأمين" className={cn(inputCls, "flex-1")} />
          <input value={item.value} onChange={(e) => updateItem(item.id, "value", e.target.value)} placeholder="القيمة" className={cn(inputCls, "flex-1")} />
          <input value={item.notes} onChange={(e) => updateItem(item.id, "notes", e.target.value)} placeholder="ملاحظات" className={cn(inputCls, "flex-1")} />
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-2 px-4 py-2 border border-dashed border-blue-400 rounded-lg text-blue-600 hover:bg-blue-50 text-sm"
      >
        <Plus className="h-4 w-4" />
        إضافة
      </button>
    </div>
  );
}

// ─── Step 6: Documents ───────────────────────────────────────────────────────
function Step6Documents({ form, set }: { form: EmpFormData; set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void }) {
  const setDoc = (key: string, val: string) => {
    set("documents", { ...form.documents, [key]: val });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-5">
        {DOCUMENT_TYPES.map((doc) => (
          <div key={doc.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{doc.label}</label>
            <label className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
              <Upload className="h-4 w-4 text-blue-500" />
              {form.documents[doc.key] ? (
                <span className="text-blue-600 truncate text-xs">{form.documents[doc.key]}</span>
              ) : (
                <span>اختر الملف</span>
              )}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setDoc(doc.key, file.name);
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 7: Account Info ────────────────────────────────────────────────────
function Step7Account({
  form, set, roles, showPassword, setShowPassword, generatePassword,
}: {
  form: EmpFormData;
  set: <K extends keyof EmpFormData>(k: K, v: EmpFormData[K]) => void;
  roles: string[];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  generatePassword: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Job Number / Username */}
      <div className="grid grid-cols-2 gap-4">
        <FInput label="الرقم الوظيفي *" value={form.accountTitle} onChange={(v) => set("accountTitle", v)} placeholder="يتم توليده تلقائيًا" />
        <FInput label="اسم المستخدم *" value={form.username} onChange={(v) => set("username", v)} placeholder="" />
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={cn(inputCls, "pl-10")}
              placeholder="••••••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={generatePassword}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            title="توليد تلقائي"
          >
            <RefreshCw className="h-4 w-4" />
            توليد تلقائي
          </button>
        </div>
      </div>

      {/* Employee Role */}
      <div className="grid grid-cols-2 gap-4">
        <FSelect label="صلاحية الموظف *" value={form.employeeRole} onChange={(v) => set("employeeRole", v)} options={roles} placeholder="--" />
        <div />
      </div>
      <p className="text-xs text-gray-400">سيتم إرسال بيانات الدخول (رقم الموظف + كلمة المرور) للموظف بعد الحفظ.</p>
    </div>
  );
}

// ─── Step 8: Finish ──────────────────────────────────────────────────────────
function Step8Finish({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="text-center text-gray-500 text-sm">
        تأكد من صحة جميع البيانات قبل الحفظ
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 px-10 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 transition disabled:opacity-50"
      >
        <Save className="h-5 w-5" />
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
    </div>
  );
}

// ─── Shared Field Helpers ────────────────────────────────────────────────────
const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white";

function FInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function FSelect({ label, value, onChange, options, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
