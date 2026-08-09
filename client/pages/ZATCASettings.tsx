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
  production_request_id?: string;
  production_csid_masked?: string;
  production_issued_at?: string;
  production_status?: "not_requested" | "issued" | "failed";
  compliance_results?: ComplianceResult[];
  last_error?: string;
  updated_at?: string;
};

type ComplianceResult = {
  caseIndex?: number;
  documentType: string;
  label: string;
  status: "pending" | "testing" | "passed" | "failed";
  message?: string;
  httpStatus?: number;
  invoiceHash?: string;
  validationResults?: {
    errorMessages?: Array<{ code?: string; message?: string }>;
    warningMessages?: Array<{ code?: string; message?: string }>;
  };
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
  { caseIndex: 0, scope: "standard", label: "فاتورة ضريبية معيارية B2B" },
  { caseIndex: 1, scope: "standard", label: "إشعار دائن معياري B2B" },
  { caseIndex: 2, scope: "standard", label: "إشعار مدين معياري B2B" },
  { caseIndex: 3, scope: "simplified", label: "فاتورة ضريبية مبسطة B2C" },
  { caseIndex: 4, scope: "simplified", label: "إشعار دائن مبسط B2C" },
  { caseIndex: 5, scope: "simplified", label: "إشعار مدين مبسط B2C" },
] as const;

const onboardingSteps = [
  { number: 1, label: "بيانات المنشأة", Icon: Building2 },
  { number: 2, label: "OTP وتهيئة الجهاز", Icon: FileKey2 },
  { number: 3, label: "شهادة التوافق", Icon: ShieldCheck },
  { number: 4, label: "اختبارات التوافق", Icon: MonitorCog },
  { number: 5, label: "Production CSID التجريبي", Icon: ShieldCheck },
];

const statusLabels: Record<SetupStatus, string> = {
  identity_saved: "تم حفظ بيانات المنشأة",
  csr_generated: "CSR جاهز — بانتظار OTP",
  compliance_ready: "تم الحصول على Compliance CSID",
  compliance_testing: "جاري فحص التوافق",
  compliance_passed: "اجتاز فحص التوافق",
  failed: "آخر محاولة تهيئة لم تنجح",
};

const auditActionLabels: Record<string, string> = {
  csr_generated: "توليد CSR والمفتاح الخاص",
  compliance_csid_requested: "طلب شهادة التوافق من ZATCA",
  "compliance_test_standard-invoice": "فحص فاتورة معيارية B2B",
  "compliance_test_standard-credit": "فحص إشعار دائن معياري B2B",
  "compliance_test_standard-debit": "فحص إشعار مدين معياري B2B",
  "compliance_test_simplified-invoice": "فحص فاتورة مبسطة B2C",
  "compliance_test_simplified-credit": "فحص إشعار دائن مبسط B2C",
  "compliance_test_simplified-debit": "فحص إشعار مدين مبسط B2C",
  branch_location_updated: "تحديث عنوان الفواتير المسجل",
};

export default function ZATCASettings() {
  const [identity, setIdentity] = useState<IdentityForm>(initialIdentity);
  const [setup, setSetup] = useState<SetupMetadata | null>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<
    | "prepare"
    | "address"
    | "onboard"
    | "refresh"
    | "compliance"
    | "production"
    | "reset"
    | null
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
      const upstreamDetail =
        payload?.details?.responseText ||
        payload?.details?.response?.message ||
        payload?.details?.response?.error;
      throw new Error(
        [payload?.error ?? error.message, upstreamDetail]
          .filter(Boolean)
          .join(" — "),
      );
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
      if (!quiet) {
        toast({
          title: "الاتصال الآمن يعمل",
          description: data.setup
            ? `حالة التهيئة: ${statusLabels[data.setup.status as SetupStatus] ?? data.setup.status}`
            : "لا توجد تهيئة سابقة. راجع البيانات ثم ولّد CSR.",
        });
      }
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

  const requiredComplianceDocuments = useMemo(() => {
    const invoiceType = setup?.invoice_type ?? identity.invoiceType;
    return complianceDocuments.filter((document) => {
      if (invoiceType === "1000") return document.scope === "standard";
      if (invoiceType === "0100") return document.scope === "simplified";
      return true;
    });
  }, [identity.invoiceType, setup?.invoice_type]);

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

  const saveBranchLocation = async () => {
    setAction("address");
    try {
      const data = await invoke({
        action: "update_branch_location",
        branchLocation: identity.branchLocation,
      });
      toast({ title: "تم حفظ العنوان", description: data.message });
      await loadStatus(true);
    } catch (error) {
      toast({
        title: "تعذر حفظ العنوان",
        description:
          error instanceof Error ? error.message : "تحقق من العنوان المسجل",
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

  const requestProductionCsid = async () => {
    setAction("production");
    try {
      const data = await invoke({ action: "request_production_csid" });
      toast({ title: "تم إصدار Production CSID", description: data.message });
      await loadStatus(true);
    } catch (error) {
      toast({
        title: "تعذر إصدار Production CSID",
        description:
          error instanceof Error ? error.message : "حدث خطأ أثناء الطلب",
        variant: "destructive",
      });
      await loadStatus(true);
    } finally {
      setAction(null);
    }
  };

  const resetOnboarding = async () => {
    const confirmed = window.confirm(
      "سيتم حذف اعتماد المحاكاة الحالي ونتائج الاختبارات لبدء تهيئة جديدة. هل تريد المتابعة؟",
    );
    if (!confirmed) return;
    setAction("reset");
    try {
      const data = await invoke({ action: "reset_onboarding" });
      setSetup(null);
      setAudit([]);
      setOtp("");
      toast({ title: "تم بدء تهيئة جديدة", description: data.message });
    } catch (error) {
      toast({
        title: "تعذر بدء تهيئة جديدة",
        description:
          error instanceof Error ? error.message : "حدث خطأ أثناء إعادة التهيئة",
        variant: "destructive",
      });
    } finally {
      setAction(null);
    }
  };

  const runComplianceTests = async () => {
    if (
      !setup ||
      !["compliance_ready", "compliance_testing", "compliance_passed"].includes(
        setup.status,
      )
    )
      return;
    setAction("compliance");
    try {
      let passed = 0;
      for (const document of requiredComplianceDocuments) {
        const data = await invoke({
          action: "run_compliance_case",
          caseIndex: document.caseIndex,
        });
        if (data.result?.status === "passed") passed += 1;
        setSetup((current) =>
          current
            ? {
                ...current,
                status: data.status as SetupStatus,
                compliance_results: [
                  ...(current.compliance_results ?? []).filter(
                    (item) => item.caseIndex !== document.caseIndex,
                  ),
                  data.result as ComplianceResult,
                ].sort(
                  (a, b) => Number(a.caseIndex ?? 0) - Number(b.caseIndex ?? 0),
                ),
              }
            : current,
        );
        if (data.result?.status !== "passed") break;
      }
      await loadStatus(true);
      toast({
        title:
          passed === requiredComplianceDocuments.length
            ? "اجتاز النظام فحص التوافق"
            : "اكتمل فحص التوافق",
        description: `نجح ${passed} من ${requiredComplianceDocuments.length} مستندات`,
        variant:
          passed === requiredComplianceDocuments.length
            ? "default"
            : "destructive",
      });
    } catch (error) {
      await loadStatus(true);
      toast({
        title: "تعذر إكمال فحص التوافق",
        description:
          error instanceof Error ? error.message : "حدث خطأ أثناء الفحص",
        variant: "destructive",
      });
    } finally {
      setAction(null);
    }
  };

  const step = useMemo(() => {
    if (!setup) return 1;
    if (setup.status === "csr_generated" || setup.status === "failed") return 2;
    if (setup.status === "compliance_ready") return 4;
    if (setup.status === "compliance_testing") return 4;
    if (setup.production_csid_masked) return 5;
    if (setup.status === "compliance_passed") return 4;
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
              <div className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-rose-700">
                <strong className="block">
                  آخر رد محفوظ من المحاولة السابقة
                </strong>
                <span className="mt-1 block">{setup.last_error}</span>
                <small className="mt-1 block text-slate-500">
                  ظهور هذه الرسالة لا يعني إرسال طلب جديد دون OTP.
                </small>
              </div>
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
              onClick={
                setup?.compliance_csid_masked ? saveBranchLocation : prepare
              }
              disabled={Boolean(action)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {action === "prepare" || action === "address" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileKey2 className="h-4 w-4" />
              )}
              {setup?.compliance_csid_masked
                ? "حفظ عنوان الفواتير"
                : "حفظ البيانات وتوليد CSR آمن"}
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
                Boolean(setup.compliance_csid_masked) ||
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
                3. فحص التوافق — المستندات المطلوبة
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                ينشئ الخادم مستندات UBL موقعة ويرسل كل نتيجة فعليًا إلى منصة
                ZATCA Simulation.
              </p>
            </div>
            <button
              onClick={runComplianceTests}
              disabled={
                Boolean(action) ||
                !setup ||
                ![
                  "compliance_ready",
                  "compliance_testing",
                  "compliance_passed",
                ].includes(setup.status)
              }
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {action === "compliance" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MonitorCog className="h-4 w-4" />
              )}
              {action === "compliance"
                ? "جاري إرسال المستندات..."
                : "تشغيل فحص التوافق"}
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {requiredComplianceDocuments.map((document) => {
              const result = setup?.compliance_results?.find(
                (item) => item.caseIndex === document.caseIndex,
              );
              return (
                <div
                  key={document.caseIndex}
                  className={`rounded-xl border p-3 text-sm ${result?.status === "passed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : result?.status === "failed" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${result?.status === "passed" ? "bg-emerald-500" : result?.status === "failed" ? "bg-rose-500" : "bg-slate-300"}`}
                    />
                    {document.label}
                  </div>
                  {result?.status === "failed" &&
                  result.validationResults?.errorMessages?.length ? (
                    <ul className="mt-2 space-y-1 text-xs leading-5 opacity-80">
                      {result.validationResults.errorMessages.map(
                        (error, index) => (
                          <li key={`${error.code ?? "error"}-${index}`}>
                            {error.code ? `[${error.code}] ` : ""}
                            {error.message || "رفضت ZATCA المستند"}
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs leading-5 opacity-80">
                      {result?.status === "passed"
                        ? "اجتاز فحص ZATCA"
                        : result?.message || "لم يُختبر بعد"}
                    </p>
                  )}
                  {result?.httpStatus ? (
                    <small className="mt-1 block font-mono">
                      HTTP {result.httpStatus}
                    </small>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {setup?.status === "compliance_passed" && (
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-indigo-950">
                  4. إصدار Production CSID التجريبي
                </h2>
                <p className="mt-1 text-sm leading-6 text-indigo-800">
                  هذه شهادة تشغيل تجريبية من Simulation وليست شهادة الإنتاج
                  الحقيقي. تُستخدم للانتقال إلى اختبار Clearance وReporting.
                </p>
                {setup.production_csid_masked && (
                  <code className="mt-3 inline-block rounded-lg bg-white px-3 py-2 text-xs text-indigo-900">
                    CSID: {setup.production_csid_masked}
                  </code>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {setup.production_status === "failed" && (
                  <button
                    onClick={resetOnboarding}
                    disabled={Boolean(action)}
                    className="rounded-xl border border-rose-300 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  >
                    {action === "reset" ? "جاري البدء..." : "بدء تهيئة جديدة"}
                  </button>
                )}
              <button
                onClick={requestProductionCsid}
                disabled={
                  Boolean(action) || Boolean(setup.production_csid_masked)
                }
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action === "production" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {setup.production_csid_masked
                  ? "تم الإصدار"
                  : "إصدار Production CSID التجريبي"}
              </button>
              </div>
            </div>
          </section>
        )}

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
                    {auditActionLabels[item.action] ?? item.action}
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
