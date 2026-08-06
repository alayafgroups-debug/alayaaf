import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Building2,
  Check,
  FileKey2,
  Loader2,
  MonitorCog,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type SetupStatus =
  | "identity_saved"
  | "csr_generated"
  | "compliance_ready"
  | "compliance_testing"
  | "compliance_passed"
  | "failed";

type SetupMetadata = {
  id: string;
  mode: "simulation";
  company_name_ar: string;
  company_name_en?: string;
  vat_number: string;
  commercial_registration: string;
  branch_name: string;
  branch_location: string;
  industry: string;
  device_manufacturer: string;
  device_model: string;
  device_serial: string;
  common_name: string;
  invoice_type: "1000" | "0100" | "1100";
  status: SetupStatus;
  compliance_request_id?: string;
  compliance_csid_masked?: string;
  compliance_issued_at?: string;
  compliance_results?: ComplianceResult[];
  last_error?: string;
  updated_at?: string;
};

type ComplianceResult = {
  documentType: string;
  label: string;
  status: "pending" | "testing" | "passed" | "failed";
  message?: string;
};

type IdentityForm = {
  companyNameAr: string;
  companyNameEn: string;
  vatNumber: string;
  commercialRegistration: string;
  branchName: string;
  branchLocation: string;
  industry: string;
  deviceManufacturer: string;
  deviceModel: string;
  deviceSerial: string;
  commonName: string;
  invoiceType: "1000" | "0100" | "1100";
};

const initialIdentity: IdentityForm = {
  companyNameAr: "شركة إدارة العياف للمقاولات",
  companyNameEn: "Al-ayaf Management Company",
  vatNumber: "314067317200003",
  commercialRegistration: "7049437580",
  branchName: "الفرع الرئيسي",
  branchLocation: "",
  industry: "المقاولات",
  deviceManufacturer: "Alayaaf ERP",
  deviceModel: "Web EGS V1",
  deviceSerial: "ALAYAAF-EGS-001",
  commonName: "ALAYAAF-EGS-001",
  invoiceType: "1100",
};

const complianceDocuments = [
  "فاتورة ضريبية معيارية B2B",
  "إشعار دائن معياري B2B",
  "إشعار مدين معياري B2B",
  "فاتورة ضريبية مبسطة B2C",
  "إشعار دائن مبسط B2C",
  "إشعار مدين مبسط B2C",
];

const onboardingSteps = [
  { number: 1, label: "بيانات المنشأة", Icon: Building2 },
  { number: 2, label: "OTP وتهيئة الجهاز", Icon: FileKey2 },
  { number: 3, label: "شهادة التوافق", Icon: ShieldCheck },
  { number: 4, label: "الاختبارات الستة", Icon: MonitorCog },
];

const statusLabels: Record<SetupStatus, string> = {
  identity_saved: "تم حفظ بيانات المنشأة",
  csr_generated: "CSR جاهز — بانتظار OTP",
  compliance_ready: "تم الحصول على Compliance CSID",
  compliance_testing: "جاري فحص التوافق",
  compliance_passed: "اجتاز فحص التوافق",
  failed: "تحتاج العملية إلى إعادة المحاولة",
};

export default function ZATCASettings() {
  const [identity, setIdentity] = useState<IdentityForm>(initialIdentity);
  const [setup, setSetup] = useState<SetupMetadata | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<
    "prepare" | "onboard" | "refresh" | null
  >(null);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(
      "zatca-onboarding",
      { body },
    );
    if (error) {
      const context = (error as { context?: Response }).context;
      const payload = context
        ? await context
            .clone()
            .json()
            .catch(() => null)
        : null;
      throw new Error(String(payload?.error ?? error.message));
    }
    if (data?.error) throw new Error(String(data.error));
    return data;
  };

  const loadStatus = async (quiet = false) => {
    if (!quiet) setAction("refresh");
    try {
      const data = await invoke({ action: "status" });
      setSetup(data.setup ?? null);
      setAudit(data.audit ?? []);
      if (data.setup) {
        setIdentity({
          companyNameAr: data.setup.company_name_ar ?? "",
          companyNameEn: data.setup.company_name_en ?? "",
          vatNumber: data.setup.vat_number ?? "",
          commercialRegistration: data.setup.commercial_registration ?? "",
          branchName: data.setup.branch_name ?? "",
          branchLocation: data.setup.branch_location ?? "",
          industry: data.setup.industry ?? "",
          deviceManufacturer: data.setup.device_manufacturer ?? "",
          deviceModel: data.setup.device_model ?? "",
          deviceSerial: data.setup.device_serial ?? "",
          commonName: data.setup.common_name ?? "",
          invoiceType: data.setup.invoice_type ?? "1100",
        });
      }
    } catch (error) {
      if (!quiet) {
        toast({
          title: "تعذر تحميل حالة ZATCA",
          description:
            error instanceof Error ? error.message : "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  useEffect(() => {
    loadStatus(true);
  }, []);

  const setField = <K extends keyof IdentityForm>(
    key: K,
    value: IdentityForm[K],
  ) => setIdentity((current) => ({ ...current, [key]: value }));

  const prepare = async () => {
    setAction("prepare");
    try {
      const data = await invoke({ action: "prepare", ...identity });
      toast({ title: "تم تجهيز الجهاز", description: data.message });
      await loadStatus(true);
    } catch (error) {
      toast({
        title: "تعذر تجهيز الجهاز",
        description:
          error instanceof Error ? error.message : "تحقق من البيانات",
        variant: "destructive",
      });
    } finally {
      setAction(null);
    }
  };

  const onboard = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast({
        title: "رمز غير صالح",
        description: "أدخل رمز OTP المكون من 6 أرقام",
        variant: "destructive",
      });
      return;
    }
    setAction("onboard");
    try {
      const data = await invoke({ action: "onboard", otp });
      setOtp("");
      toast({ title: "نجحت تهيئة Sandbox", description: data.message });
      await loadStatus(true);
    } catch (error) {
      toast({
        title: "رفضت ZATCA طلب التهيئة",
        description:
          error instanceof Error ? error.message : "تحقق من OTP والبيانات",
        variant: "destructive",
      });
      await loadStatus(true);
    } finally {
      setAction(null);
    }
  };

  const step = useMemo(() => {
    if (!setup) return 1;
    if (setup.status === "csr_generated" || setup.status === "failed") return 2;
    if (setup.status === "compliance_ready") return 3;
    if (setup.status === "compliance_testing") return 4;
    if (setup.status === "compliance_passed") return 5;
    return 1;
  }, [setup]);

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 p-2" dir="rtl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">
              الفاتورة الإلكترونية — المرحلة الثانية
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              تهيئة ZATCA التجريبية
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              تجهيز وحدة EGS داخل بيئة المحاكاة، وتوليد CSR والمفتاح الخاص داخل
              الخادم دون عرض الأسرار في المتصفح.
            </p>
          </div>
          <button
            onClick={() => loadStatus()}
            disabled={Boolean(action)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${action === "refresh" ? "animate-spin" : ""}`}
            />{" "}
            تحديث الحالة
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          {onboardingSteps.map(({ number, label, Icon }) => {
            const active = step >= number;
            return (
              <div
                key={number}
                className={`rounded-2xl border p-4 ${active ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    {step > number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <small className="text-slate-500">الخطوة {number}</small>
                    <strong className="block text-sm text-slate-900">
                      {label}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {setup && (
          <section
            className={`rounded-2xl border p-4 ${setup.status === "failed" ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className={
                    setup.status === "failed"
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }
                />
                <div>
                  <strong className="block text-slate-900">
                    {statusLabels[setup.status]}
                  </strong>
                  <span className="text-xs text-slate-600">
                    البيئة: Simulation فقط
                  </span>
                </div>
              </div>
              {setup.compliance_csid_masked && (
                <code className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700">
                  CSID: {setup.compliance_csid_masked}
                </code>
              )}
            </div>
            {setup.last_error && (
              <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-rose-700">
                {setup.last_error}
              </p>
            )}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h2 className="font-bold text-slate-900">
              1. بيانات المنشأة ووحدة إصدار الفواتير
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              راجع البيانات القانونية بدقة قبل إنشاء OTP؛ يجب أن يطابق الرقم
              الضريبي بيانات المنشأة الظاهرة في بوابة فاتورة، وأدخل عنوان الفرع
              المسجل كاملًا.
            </p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field
              label="اسم المنشأة بالعربية"
              value={identity.companyNameAr}
              onChange={(value) => setField("companyNameAr", value)}
              className={inputClass}
            />
            <Field
              label="اسم المنشأة بالإنجليزية"
              value={identity.companyNameEn}
              onChange={(value) => setField("companyNameEn", value)}
              className={inputClass}
            />
            <Field
              label="الرقم الضريبي — 15 رقمًا"
              value={identity.vatNumber}
              onChange={(value) =>
                setField("vatNumber", value.replace(/\D/g, "").slice(0, 15))
              }
              className={inputClass}
              dir="ltr"
            />
            <Field
              label="رقم السجل التجاري"
              value={identity.commercialRegistration}
              onChange={(value) =>
                setField(
                  "commercialRegistration",
                  value.replace(/\D/g, "").slice(0, 15),
                )
              }
              className={inputClass}
              dir="ltr"
            />
            <Field
              label="اسم الفرع"
              value={identity.branchName}
              onChange={(value) => setField("branchName", value)}
              className={inputClass}
            />
            <Field
              label="نوع النشاط"
              value={identity.industry}
              onChange={(value) => setField("industry", value)}
              className={inputClass}
            />
            <div className="md:col-span-2">
              <Field
                label="عنوان الفرع المسجل"
                value={identity.branchLocation}
                onChange={(value) => setField("branchLocation", value)}
                className={inputClass}
              />
            </div>
            <Field
              label="مصنّع الحل التقني"
              value={identity.deviceManufacturer}
              onChange={(value) => setField("deviceManufacturer", value)}
              className={inputClass}
              dir="ltr"
            />
            <Field
              label="طراز الجهاز / النظام"
              value={identity.deviceModel}
              onChange={(value) => setField("deviceModel", value)}
              className={inputClass}
              dir="ltr"
            />
            <Field
              label="الرقم التسلسلي للوحدة"
              value={identity.deviceSerial}
              onChange={(value) =>
                setField(
                  "deviceSerial",
                  value.toUpperCase().replace(/[^A-Z0-9._\-/]/g, ""),
                )
              }
              className={inputClass}
              dir="ltr"
            />
            <Field
              label="الاسم الشائع للشهادة (CN)"
              value={identity.commonName}
              onChange={(value) => setField("commonName", value)}
              className={inputClass}
              dir="ltr"
            />
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-bold text-slate-700">
                أنواع الفواتير التي تصدرها الوحدة
              </span>
              <select
                value={identity.invoiceType}
                onChange={(event) =>
                  setField(
                    "invoiceType",
                    event.target.value as IdentityForm["invoiceType"],
                  )
                }
                className={inputClass}
              >
                <option value="1100">معيارية ومبسطة — 1100</option>
                <option value="1000">معيارية فقط — 1000</option>
                <option value="0100">مبسطة فقط — 0100</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-5 py-4">
            <button
              onClick={prepare}
              disabled={Boolean(action)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {action === "prepare" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileKey2 className="h-4 w-4" />
              )}
              حفظ البيانات وتوليد CSR آمن
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">2. إدخال رمز التفعيل OTP</h2>
          <p className="mt-1 text-sm text-slate-500">
            بعد ظهور حالة CSR جاهز، أنشئ رمزًا واحدًا من منصة المحاكاة وأدخله
            هنا خلال ساعة.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              dir="ltr"
              className="h-12 w-48 rounded-xl border border-slate-300 px-4 text-center font-mono text-xl tracking-[0.35em] outline-none focus:border-blue-500"
            />
            <button
              onClick={onboard}
              disabled={
                Boolean(action) ||
                !setup ||
                !["csr_generated", "failed"].includes(setup.status) ||
                otp.length !== 6
              }
              className="flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action === "onboard" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              تهيئة الجهاز في Sandbox
            </button>
          </div>
          <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <AlertCircle className="h-5 w-5 shrink-0" /> لا يُحفظ OTP، ولا يعرض
            النظام المفتاح الخاص أو Secret أو CSID الكامل في المتصفح.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">
                3. فحص التوافق — المستندات الستة
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                يُفتح بعد الحصول على Compliance CSID. لن يُعرض نجاح وهمي قبل
                إرسال مستندات موقعة وصحيحة إلى ZATCA.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              بانتظار مرحلة التوقيع والفحص
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {complianceDocuments.map((document) => (
              <div
                key={document}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                {document}
              </div>
            ))}
          </div>
        </section>

        {audit.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-slate-900">سجل التهيئة</h2>
            <div className="space-y-2">
              {audit.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-slate-700">
                    {item.action}
                  </span>
                  <span
                    className={
                      item.result === "success"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {item.result === "success" ? "نجح" : "فشل"}
                  </span>
                  <time className="text-slate-400">
                    {new Date(item.created_at).toLocaleString("ar-SA")}
                  </time>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-white/40 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
        dir={dir}
      />
    </label>
  );
}
