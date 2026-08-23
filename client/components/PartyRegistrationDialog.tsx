import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type CreatedParty = { id: string; name: string; vatNumber: string; commercialRegistration: string; address: string };

export default function PartyRegistrationDialog({ kind, b2c = false, onCreated, onClose }: { kind: "customer" | "vendor"; b2c?: boolean; onCreated: (party: CreatedParty) => void; onClose: () => void }) {
  const { t, direction } = useI18n();
  const [isIndividual, setIsIndividual] = useState(kind === "customer" && b2c);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("المملكة العربية السعودية");
  const [taxMode, setTaxMode] = useState<"not_registered" | "registered_sa">("not_registered");
  const [vatNumber, setVatNumber] = useState("");
  const [commercialRegistration, setCommercialRegistration] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [invoiceRef, setInvoiceRef] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isCustomer = kind === "customer";

  const field = (label: string, value: string, update: (next: string) => void, required = false, type = "text") => <label className="space-y-1 text-xs text-slate-600"><span>{t(label)}{required ? " *" : ""}</span><input type={type} value={value} onChange={(event) => update(event.target.value)} placeholder={required ? t("مطلوب") : t("اختياري")} className="block h-10 w-full rounded border border-slate-200 px-3 text-sm text-slate-800" /></label>;
  const section = (title: string, children: React.ReactNode, open = false) => <details open={open} className="col-span-full rounded border border-slate-100"><summary className="flex cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{t(title)}<ChevronDown className="h-4 w-4" /></summary><div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">{children}</div></details>;

  const save = async () => {
    if (!name.trim()) { setError(t("الاسم مطلوب")); return; }
    if (!isIndividual && taxMode === "registered_sa" && !/^3\d{14}$/.test(vatNumber)) { setError(t("أدخل رقم تسجيل ضريبي سعودي صحيح من 15 رقمًا")); return; }
    setSaving(true); setError("");
    const address = [building, street, district, city, postalCode].map((item) => item.trim()).filter(Boolean).join("، ");
    const table = isCustomer ? "customers" : "vendors";
    const { data, error: saveError } = await supabase.from(table).insert({
      id: crypto.randomUUID(), name: name.trim(), type: isIndividual ? "فرد" : isCustomer ? "شركة" : "مورد محلي", email: email.trim(), phone: phone.trim(), status: "نشط", opening_balance: "0", credit_limit: "0",
      country: isIndividual ? "" : country, tax_registration_mode: isIndividual ? "not_registered" : taxMode, tax_number: !isIndividual && taxMode === "registered_sa" ? vatNumber.trim() : null, commercial_registration: !isIndividual ? commercialRegistration.trim() || null : null,
      building_number: building.trim(), street: street.trim(), district: district.trim(), city: city.trim(), postal_code: postalCode.trim(), invoice_ref: invoiceRef.trim(), currency: "SAR", payment_terms: paymentTerms, license_number: licenseNumber.trim(), business_type: businessType,
    }).select("id, name, tax_number, commercial_registration, building_number, street, district, city, postal_code").single();
    setSaving(false);
    if (saveError || !data) { setError(saveError?.message ?? t("تعذر حفظ البيانات")); return; }
    onCreated({ id: String(data.id), name: String(data.name), vatNumber: String(data.tax_number ?? ""), commercialRegistration: String(data.commercial_registration ?? ""), address: [data.building_number, data.street, data.district, data.city, data.postal_code].map((item) => String(item ?? "").trim()).filter(Boolean).join("، ") || address });
  };

  return createPortal(<div dir={direction} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={onClose}><section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs text-slate-400">{isCustomer ? t("العملاء") : t("الموردين")}</p><h2 className="text-lg font-bold text-slate-800">{t(isCustomer ? "إنشاء عميل جديد" : "إنشاء مورد جديد")}</h2></div><button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">{isCustomer && <label className="col-span-full space-y-1 text-xs text-slate-600"><span>{t("نوع العميل")}</span><select value={isIndividual ? "individual" : "organization"} onChange={(event) => setIsIndividual(event.target.value === "individual")} className="block h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"><option value="individual">{t("شخص / عميل B2C")}</option><option value="organization">{t("جهة أو منشأة B2B")}</option></select></label>}{field(isIndividual ? "الاسم الشخصي" : isCustomer ? "اسم المنشأة" : "اسم المورد", name, setName, true)}{field("رقم الجوال", phone, setPhone)}{field("البريد الإلكتروني", email, setEmail, false, "email")}{!isIndividual && <>{section("المنشأة والتسجيل الضريبي مطلوب", <><label className="space-y-1 text-xs text-slate-600"><span>{t("البلد")}</span><select value={country} onChange={(event) => setCountry(event.target.value)} className="block h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"><option value="المملكة العربية السعودية">{t("المملكة العربية السعودية")}</option><option value="">{t("اختياري")}</option></select></label><div className="space-y-2 text-xs text-slate-600"><span>{t("التسجيل في ضريبة القيمة المضافة")}</span><label className="flex items-center gap-2"><input type="radio" checked={taxMode === "not_registered"} onChange={() => setTaxMode("not_registered")} />{t("غير مسجل في ضريبة القيمة المضافة")}</label><label className="flex items-center gap-2"><input type="radio" checked={taxMode === "registered_sa"} onChange={() => setTaxMode("registered_sa")} />{t("جهة اتصال مسجلة في ضريبة القيمة المضافة في السعودية")}</label></div>{field("رقم التسجيل الضريبي", vatNumber, setVatNumber)}{field("رقم السجل التجاري للعميل", commercialRegistration, setCommercialRegistration)}</>, true)}{section("العنوان اختياري", <>{field("المدينة", city, setCity)}{field("الشارع", street, setStreet)}{field("رقم المبنى", building, setBuilding)}{field("الحي", district, setDistrict)}{field("الرمز البريدي", postalCode, setPostalCode)}</>)}{section("بيانات الفوترة اختياري", <>{field("المعرّف", invoiceRef, setInvoiceRef)}<label className="space-y-1 text-xs text-slate-600"><span>{t("شروط الدفع")}</span><select value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} className="block h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"><option value="">{t("تحديد")}</option><option value="فوري">{t("فوري")}</option><option value="30 يوم">{t("30 يوم")}</option></select></label>{field("رقم الترخيص", licenseNumber, setLicenseNumber)}<label className="space-y-1 text-xs text-slate-600"><span>{t("نوع ترخيص جهة الاتصال")}</span><select value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="block h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm"><option value="">{t("تحديد")}</option><option value="شركة">{t("شركة")}</option><option value="فرد">{t("فرد")}</option></select></label></>)} </>}</div>{error && <p className="px-5 text-sm text-red-600">{error}</p>}<footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm">{t("إلغاء")}</button><button onClick={() => void save()} disabled={saving} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? t("جاري الحفظ...") : t("حفظ")}</button></footer></section></div>, document.body);
}
