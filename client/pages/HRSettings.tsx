import { useEffect, useMemo, useState, type ReactNode } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, Settings2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type TabKey = "general" | "recruitment" | "payroll" | "leaves" | "attendance";

type HRSettingsState = {
  general: {
    monthlyHours: number;
    overtimeRateSaudi: number;
    overtimeStartAfterHours: number;
    monthlyOvertimeCap: number;
    currency: string;
    probationMonths: number;
    weekendDay1: string;
    weekendDay2: string;
  };
  recruitment: {
    probationDays: number;
    autoCloseRequisitionDays: number;
    minScreeningScore: number;
    defaultContractType: string;
    defaultContractYears: number;
    weeklyWorkHours: number;
    dailyWorkHours: number;
    annualVacationDays: number;
    allowAutoRenew: string;
  };
  payroll: {
    housingAllowancePct: number;
    transportAllowancePct: number;
    gosiEmployeePct: number;
    gosiEmployerPct: number;
    payrollDay: number;
    transferMethod: string;
    wpsEnabled: string;
    eosAfterYears: number;
    eosFactorFirst5: number;
    eosFactorAfter5: number;
  };
  leaves: {
    annualLeaveDays: number;
    marriageLeaveDays: number;
    maternityLeaveDays: number;
    paternityLeaveDays: number;
    emergencyLeaveDays: number;
    sickLeaveDays: number;
    carryForwardDays: number;
    requestBeforeDays: number;
    unpaidLeaveAllowed: string;
  };
  attendance: {
    workDaysPerWeek: number;
    defaultShiftStart: string;
    defaultShiftEnd: string;
    graceMinutes: number;
    overtimeMinMinutes: number;
    latePenaltyEnabled: string;
    absencePenaltyEnabled: string;
    weekendOvertimeMultiplier: number;
  };
};

const SETTINGS_STORAGE_KEY = "hr_settings_local";

const defaultSettings: HRSettingsState = {
  general: {
    monthlyHours: 160,
    overtimeRateSaudi: 150,
    overtimeStartAfterHours: 8,
    monthlyOvertimeCap: 40,
    currency: "ريال سعودي",
    probationMonths: 3,
    weekendDay1: "الجمعة",
    weekendDay2: "السبت",
  },
  recruitment: {
    probationDays: 90,
    autoCloseRequisitionDays: 30,
    minScreeningScore: 60,
    defaultContractType: "سنوي",
    defaultContractYears: 1,
    weeklyWorkHours: 48,
    dailyWorkHours: 8,
    annualVacationDays: 30,
    allowAutoRenew: "إجباري",
  },
  payroll: {
    housingAllowancePct: 25,
    transportAllowancePct: 10,
    gosiEmployeePct: 9.75,
    gosiEmployerPct: 11.75,
    payrollDay: 25,
    transferMethod: "تحويل بنكي",
    wpsEnabled: "مفعل",
    eosAfterYears: 5,
    eosFactorFirst5: 0.5,
    eosFactorAfter5: 1,
  },
  leaves: {
    annualLeaveDays: 21,
    marriageLeaveDays: 5,
    maternityLeaveDays: 70,
    paternityLeaveDays: 3,
    emergencyLeaveDays: 5,
    sickLeaveDays: 30,
    carryForwardDays: 15,
    requestBeforeDays: 30,
    unpaidLeaveAllowed: "مسموح",
  },
  attendance: {
    workDaysPerWeek: 6,
    defaultShiftStart: "08:00",
    defaultShiftEnd: "16:00",
    graceMinutes: 15,
    overtimeMinMinutes: 30,
    latePenaltyEnabled: "مفعل",
    absencePenaltyEnabled: "مفعل",
    weekendOvertimeMultiplier: 1.5,
  },
};

const tabLabels: Record<TabKey, string> = {
  general: "الإعدادات العامة",
  recruitment: "التوظيف والعقود",
  payroll: "الرواتب والتأمينات",
  leaves: "الإجازات",
  attendance: "الدوام",
};

function readLocalSettings(): HRSettingsState | null {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as HRSettingsState;
  } catch {
    return null;
  }
}

function writeLocalSettings(settings: HRSettingsState) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function mergeTab<T extends Record<string, unknown>>(defaults: T, incoming: unknown): T {
  if (!incoming || typeof incoming !== "object") return defaults;
  return { ...defaults, ...(incoming as Partial<T>) };
}

export default function HRSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HRSettingsState>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const local = readLocalSettings();

    try {
      const { data, error } = await supabase
        .from("hr_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["general", "recruitment", "payroll", "leaves", "attendance"]);

      if (!error && data) {
        const dbState: HRSettingsState = {
          general: defaultSettings.general,
          recruitment: defaultSettings.recruitment,
          payroll: defaultSettings.payroll,
          leaves: defaultSettings.leaves,
          attendance: defaultSettings.attendance,
        };

        data.forEach((row) => {
          const key = String((row as Record<string, unknown>).setting_key ?? "") as TabKey;
          const value = (row as Record<string, unknown>).setting_value;
          if (key === "general") dbState.general = mergeTab(defaultSettings.general, value);
          if (key === "recruitment") dbState.recruitment = mergeTab(defaultSettings.recruitment, value);
          if (key === "payroll") dbState.payroll = mergeTab(defaultSettings.payroll, value);
          if (key === "leaves") dbState.leaves = mergeTab(defaultSettings.leaves, value);
          if (key === "attendance") dbState.attendance = mergeTab(defaultSettings.attendance, value);
        });

        const hasDbValues = data.length > 0;
        const resolved = hasDbValues ? dbState : (local ?? dbState);

        setSettings(resolved);
        writeLocalSettings(resolved);
      } else {
        setSettings(local ?? defaultSettings);
      }
    } catch {
      setSettings(local ?? defaultSettings);
    } finally {
      setLoading(false);
    }
  }

  const saveLabel = useMemo(() => {
    if (activeTab === "general") return "حفظ الإعدادات العامة";
    if (activeTab === "recruitment") return "حفظ إعدادات التوظيف والعقود";
    if (activeTab === "payroll") return "حفظ إعدادات الرواتب والتأمينات";
    if (activeTab === "leaves") return "حفظ إعدادات الإجازات";
    return "حفظ إعدادات الدوام";
  }, [activeTab]);

  async function saveCurrentTab() {
    const payload = {
      setting_key: activeTab,
      setting_value: settings[activeTab],
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from("hr_settings")
        .upsert([payload], { onConflict: "setting_key" });

      if (error) throw error;

      writeLocalSettings(settings);
      toast({ title: "تم الحفظ", description: "تم حفظ الإعدادات في قاعدة البيانات" });
    } catch {
      writeLocalSettings(settings);
      toast({
        title: "تم الحفظ محليًا",
        description: "تعذر حفظ الإعدادات في قاعدة البيانات حالياً",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div dir="rtl" className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-gray-700" />
            <h1 className="text-2xl font-bold">إعدادات الموارد البشرية</h1>
          </div>
          <button
            onClick={() => navigate("/hr/dashboard")}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-2 flex flex-wrap gap-2">
            {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {loading ? <div className="text-center text-gray-500 py-6">جاري تحميل الإعدادات...</div> : null}

            {!loading && activeTab === "general" ? (
              <GeneralSettingsTab
                value={settings.general}
                onChange={(next) => setSettings((prev) => ({ ...prev, general: next }))}
              />
            ) : null}

            {!loading && activeTab === "recruitment" ? (
              <RecruitmentSettingsTab
                value={settings.recruitment}
                onChange={(next) => setSettings((prev) => ({ ...prev, recruitment: next }))}
              />
            ) : null}

            {!loading && activeTab === "payroll" ? (
              <PayrollSettingsTab
                value={settings.payroll}
                onChange={(next) => setSettings((prev) => ({ ...prev, payroll: next }))}
              />
            ) : null}

            {!loading && activeTab === "leaves" ? (
              <LeavesSettingsTab
                value={settings.leaves}
                onChange={(next) => setSettings((prev) => ({ ...prev, leaves: next }))}
              />
            ) : null}

            {!loading && activeTab === "attendance" ? (
              <AttendanceSettingsTab
                value={settings.attendance}
                onChange={(next) => setSettings((prev) => ({ ...prev, attendance: next }))}
              />
            ) : null}

            <div className="pt-2">
              <button
                onClick={saveCurrentTab}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, colorClass, children }: { title: string; colorClass: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className={`px-3 py-2 text-white text-sm font-semibold ${colorClass}`}>{title}</div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600 text-xs">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value || 0))}
      className="w-full rounded border border-gray-300 px-2 py-2"
    />
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 px-2 py-2"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 px-2 py-2 bg-white"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function GeneralSettingsTab({
  value,
  onChange,
}: {
  value: HRSettingsState["general"];
  onChange: (value: HRSettingsState["general"]) => void;
}) {
  return (
    <Section title="الإعدادات العامة" colorClass="bg-blue-600">
      <Field label="عدد ساعات العمل الشهرية">
        <NumberInput value={value.monthlyHours} onChange={(v) => onChange({ ...value, monthlyHours: v })} />
      </Field>
      <Field label="نسبة الأجر الإضافي السعودي (%)">
        <NumberInput value={value.overtimeRateSaudi} onChange={(v) => onChange({ ...value, overtimeRateSaudi: v })} />
      </Field>
      <Field label="يبدأ الإضافي بعد (ساعات)">
        <NumberInput value={value.overtimeStartAfterHours} onChange={(v) => onChange({ ...value, overtimeStartAfterHours: v })} />
      </Field>
      <Field label="الحد الأعلى للإضافي الشهري (ساعة)">
        <NumberInput value={value.monthlyOvertimeCap} onChange={(v) => onChange({ ...value, monthlyOvertimeCap: v })} />
      </Field>
      <Field label="العملة">
        <SelectInput value={value.currency} onChange={(v) => onChange({ ...value, currency: v })} options={["ريال سعودي", "دولار", "درهم"]} />
      </Field>
      <Field label="فترة التجربة (بالأشهر)">
        <NumberInput value={value.probationMonths} onChange={(v) => onChange({ ...value, probationMonths: v })} />
      </Field>
      <Field label="الويكند الأول">
        <SelectInput value={value.weekendDay1} onChange={(v) => onChange({ ...value, weekendDay1: v })} options={["الجمعة", "السبت", "الأحد"]} />
      </Field>
      <Field label="الويكند الثاني">
        <SelectInput value={value.weekendDay2} onChange={(v) => onChange({ ...value, weekendDay2: v })} options={["السبت", "الأحد", "لا يوجد"]} />
      </Field>
    </Section>
  );
}

function RecruitmentSettingsTab({
  value,
  onChange,
}: {
  value: HRSettingsState["recruitment"];
  onChange: (value: HRSettingsState["recruitment"]) => void;
}) {
  return (
    <>
      <Section title="إعدادات التوظيف" colorClass="bg-green-600">
        <Field label="فترة التجربة (يوم)">
          <NumberInput value={value.probationDays} onChange={(v) => onChange({ ...value, probationDays: v })} />
        </Field>
        <Field label="إغلاق الطلب الوظيفي بعد (يوم)">
          <NumberInput value={value.autoCloseRequisitionDays} onChange={(v) => onChange({ ...value, autoCloseRequisitionDays: v })} />
        </Field>
        <Field label="أدنى تقييم للفرز (%)">
          <NumberInput value={value.minScreeningScore} onChange={(v) => onChange({ ...value, minScreeningScore: v })} />
        </Field>
        <Field label="تجديد العقد تلقائيًا">
          <SelectInput value={value.allowAutoRenew} onChange={(v) => onChange({ ...value, allowAutoRenew: v })} options={["إجباري", "اختياري", "معطل"]} />
        </Field>
      </Section>

      <Section title="إعدادات العقود" colorClass="bg-cyan-500">
        <Field label="نوع العقد الافتراضي">
          <SelectInput value={value.defaultContractType} onChange={(v) => onChange({ ...value, defaultContractType: v })} options={["سنوي", "محدد المدة", "غير محدد المدة"]} />
        </Field>
        <Field label="مدة العقد الافتراضية (سنة)">
          <NumberInput value={value.defaultContractYears} onChange={(v) => onChange({ ...value, defaultContractYears: v })} />
        </Field>
        <Field label="ساعات العمل الأسبوعية">
          <NumberInput value={value.weeklyWorkHours} onChange={(v) => onChange({ ...value, weeklyWorkHours: v })} />
        </Field>
        <Field label="ساعات العمل اليومية">
          <NumberInput value={value.dailyWorkHours} onChange={(v) => onChange({ ...value, dailyWorkHours: v })} />
        </Field>
        <Field label="الإجازة السنوية الافتراضية (يوم)">
          <NumberInput value={value.annualVacationDays} onChange={(v) => onChange({ ...value, annualVacationDays: v })} />
        </Field>
      </Section>
    </>
  );
}

function PayrollSettingsTab({
  value,
  onChange,
}: {
  value: HRSettingsState["payroll"];
  onChange: (value: HRSettingsState["payroll"]) => void;
}) {
  return (
    <>
      <Section title="إعدادات الرواتب" colorClass="bg-yellow-500">
        <Field label="بدل السكن (%)">
          <NumberInput value={value.housingAllowancePct} onChange={(v) => onChange({ ...value, housingAllowancePct: v })} />
        </Field>
        <Field label="بدل النقل (%)">
          <NumberInput value={value.transportAllowancePct} onChange={(v) => onChange({ ...value, transportAllowancePct: v })} />
        </Field>
        <Field label="تاريخ صرف الراتب">
          <NumberInput value={value.payrollDay} onChange={(v) => onChange({ ...value, payrollDay: v })} />
        </Field>
        <Field label="طريقة صرف الراتب">
          <SelectInput value={value.transferMethod} onChange={(v) => onChange({ ...value, transferMethod: v })} options={["تحويل بنكي", "نقدي", "شيك"]} />
        </Field>
        <Field label="WPS نظام حماية الأجور">
          <SelectInput value={value.wpsEnabled} onChange={(v) => onChange({ ...value, wpsEnabled: v })} options={["مفعل", "معطل"]} />
        </Field>
      </Section>

      <Section title="إعدادات التأمينات الاجتماعية" colorClass="bg-red-600">
        <Field label="نسبة التأمينات على الموظف (%)">
          <NumberInput value={value.gosiEmployeePct} onChange={(v) => onChange({ ...value, gosiEmployeePct: v })} />
        </Field>
        <Field label="نسبة التأمينات على صاحب العمل (%)">
          <NumberInput value={value.gosiEmployerPct} onChange={(v) => onChange({ ...value, gosiEmployerPct: v })} />
        </Field>
        <Field label="احتساب نهاية الخدمة بعد (سنة)">
          <NumberInput value={value.eosAfterYears} onChange={(v) => onChange({ ...value, eosAfterYears: v })} />
        </Field>
        <Field label="معامل نهاية الخدمة أول 5 سنوات">
          <NumberInput value={value.eosFactorFirst5} onChange={(v) => onChange({ ...value, eosFactorFirst5: v })} />
        </Field>
        <Field label="معامل نهاية الخدمة بعد 5 سنوات">
          <NumberInput value={value.eosFactorAfter5} onChange={(v) => onChange({ ...value, eosFactorAfter5: v })} />
        </Field>
      </Section>
    </>
  );
}

function LeavesSettingsTab({
  value,
  onChange,
}: {
  value: HRSettingsState["leaves"];
  onChange: (value: HRSettingsState["leaves"]) => void;
}) {
  return (
    <>
      <Section title="إعدادات الإجازات" colorClass="bg-slate-600">
        <Field label="إجازة سنوية (يوم)">
          <NumberInput value={value.annualLeaveDays} onChange={(v) => onChange({ ...value, annualLeaveDays: v })} />
        </Field>
        <Field label="إجازة زواج (يوم)">
          <NumberInput value={value.marriageLeaveDays} onChange={(v) => onChange({ ...value, marriageLeaveDays: v })} />
        </Field>
        <Field label="إجازة أمومة (يوم)">
          <NumberInput value={value.maternityLeaveDays} onChange={(v) => onChange({ ...value, maternityLeaveDays: v })} />
        </Field>
        <Field label="إجازة أبوة (يوم)">
          <NumberInput value={value.paternityLeaveDays} onChange={(v) => onChange({ ...value, paternityLeaveDays: v })} />
        </Field>
        <Field label="إجازة طارئة (يوم)">
          <NumberInput value={value.emergencyLeaveDays} onChange={(v) => onChange({ ...value, emergencyLeaveDays: v })} />
        </Field>
        <Field label="إجازة مرضية (يوم)">
          <NumberInput value={value.sickLeaveDays} onChange={(v) => onChange({ ...value, sickLeaveDays: v })} />
        </Field>
        <Field label="ترحيل الإجازات (يوم)">
          <NumberInput value={value.carryForwardDays} onChange={(v) => onChange({ ...value, carryForwardDays: v })} />
        </Field>
        <Field label="الطلب قبل الإجازة (يوم)">
          <NumberInput value={value.requestBeforeDays} onChange={(v) => onChange({ ...value, requestBeforeDays: v })} />
        </Field>
      </Section>

      <Section title="الإجازات غير المدفوعة" colorClass="bg-gray-900">
        <Field label="الإجازة غير المدفوعة">
          <SelectInput value={value.unpaidLeaveAllowed} onChange={(v) => onChange({ ...value, unpaidLeaveAllowed: v })} options={["مسموح", "غير مسموح"]} />
        </Field>
      </Section>
    </>
  );
}

function AttendanceSettingsTab({
  value,
  onChange,
}: {
  value: HRSettingsState["attendance"];
  onChange: (value: HRSettingsState["attendance"]) => void;
}) {
  return (
    <Section title="إعدادات الدوام" colorClass="bg-indigo-700">
      <Field label="عدد أيام العمل بالأسبوع">
        <NumberInput value={value.workDaysPerWeek} onChange={(v) => onChange({ ...value, workDaysPerWeek: v })} />
      </Field>
      <Field label="بداية الدوام الافتراضية">
        <TextInput value={value.defaultShiftStart} onChange={(v) => onChange({ ...value, defaultShiftStart: v })} />
      </Field>
      <Field label="نهاية الدوام الافتراضية">
        <TextInput value={value.defaultShiftEnd} onChange={(v) => onChange({ ...value, defaultShiftEnd: v })} />
      </Field>
      <Field label="فترة السماح (دقيقة)">
        <NumberInput value={value.graceMinutes} onChange={(v) => onChange({ ...value, graceMinutes: v })} />
      </Field>
      <Field label="الحد الأدنى للإضافي (دقيقة)">
        <NumberInput value={value.overtimeMinMinutes} onChange={(v) => onChange({ ...value, overtimeMinMinutes: v })} />
      </Field>
      <Field label="خصم التأخير">
        <SelectInput value={value.latePenaltyEnabled} onChange={(v) => onChange({ ...value, latePenaltyEnabled: v })} options={["مفعل", "معطل"]} />
      </Field>
      <Field label="خصم الغياب">
        <SelectInput value={value.absencePenaltyEnabled} onChange={(v) => onChange({ ...value, absencePenaltyEnabled: v })} options={["مفعل", "معطل"]} />
      </Field>
      <Field label="معامل إضافي أيام الراحة">
        <NumberInput value={value.weekendOvertimeMultiplier} onChange={(v) => onChange({ ...value, weekendOvertimeMultiplier: v })} />
      </Field>
    </Section>
  );
}
