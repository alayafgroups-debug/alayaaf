import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type CreatedParty = { id: string; name: string; vatNumber: string; commercialRegistration: string; address: string };

export default function PartyRegistrationDialog({ kind, b2c = false, onCreated, onClose }: { kind: "customer" | "vendor"; b2c?: boolean; onCreated: (party: CreatedParty) => void; onClose: () => void }) {
  const { t, direction } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [commercialRegistration, setCommercialRegistration] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isCustomer = kind === "customer";
  const isB2C = isCustomer && b2c;

  const save = async () => {
    if (!name.trim()) { setError(t(isB2C ? "اسم العميل مطلوب" : "الاسم مطلوب")); return; }
    if (!isB2C && (!vatNumber.trim() || !commercialRegistration.trim())) { setError(t("الرقم الضريبي والسجل التجاري مطلوبان للمنشآت")); return; }
    setSaving(true); setError("");
    const address = [building, street, district, city, postalCode].map((value) => value.trim()).filter(Boolean).join("، ");
    const table = isCustomer ? "customers" : "vendors";
    const { data, error: saveError } = await supabase.from(table).insert({
      id: crypto.randomUUID(), name: name.trim(), type: isB2C ? "فرد" : isCustomer ? "شركة" : "مورد محلي",
      email: email.trim(), phone: phone.trim(), status: "نشط", opening_balance: "0", credit_limit: "0",
      country: "المملكة العربية السعودية", tax_registration_mode: isB2C ? "not_registered" : "registered_sa",
      tax_number: isB2C ? null : vatNumber.trim(), commercial_registration: isB2C ? null : commercialRegistration.trim(),
      building_number: building.trim(), street: street.trim(), district: district.trim(), city: city.trim(), postal_code: postalCode.trim(),
      currency: "SAR",
    }).select("id, name, tax_number, commercial_registration, building_number, street, district, city, postal_code").single();
    setSaving(false);
    if (saveError || !data) { setError(saveError?.message ?? t("تعذر حفظ البيانات")); return; }
    onCreated({ id: String(data.id), name: String(data.name), vatNumber: String(data.tax_number ?? ""), commercialRegistration: String(data.commercial_registration ?? ""), address: [data.building_number, data.street, data.district, data.city, data.postal_code].map((value) => String(value ?? "").trim()).filter(Boolean).join("، ") || address });
  };

  const field = (label: string, value: string, update: (next: string) => void, required = false) => <label className="space-y-1 text-xs text-slate-600"><span>{t(label)}{required ? " *" : ""}</span><input value={value} onChange={(event) => update(event.target.value)} className="block w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>;

  return <div dir={direction} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={onClose}><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs text-slate-400">{isCustomer ? t("العملاء") : t("الموردين")}</p><h2 className="text-lg font-bold text-slate-800">{t(isB2C ? "إنشاء عميل جديد" : isCustomer ? "إنشاء عميل جديد" : "إنشاء مورد جديد")}</h2></div><button onClick={onClose} className="rounded p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header><div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">{field(isB2C ? "الاسم الشخصي" : isCustomer ? "اسم المنشأة" : "اسم المورد", name, setName, true)}{field("رقم الجوال", phone, setPhone)}{field("البريد الإلكتروني", email, setEmail)}{!isB2C && <>{field("الرقم الضريبي", vatNumber, setVatNumber, true)}{field("السجل التجاري", commercialRegistration, setCommercialRegistration, true)}</>}<div className="col-span-full border-t border-slate-100 pt-3 text-xs font-bold text-slate-700">{t("العنوان الوطني")}</div>{field("رقم المبنى", building, setBuilding)}{field("الشارع", street, setStreet)}{field("الحي", district, setDistrict)}{field("المدينة", city, setCity)}{field("الرمز البريدي", postalCode, setPostalCode)}</div>{error && <p className="px-5 text-sm text-red-600">{error}</p>}<footer className="mt-2 flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button onClick={onClose} className="rounded border border-slate-200 px-4 py-2 text-sm">{t("إلغاء")}</button><button onClick={() => void save()} disabled={saving} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? t("جاري الحفظ...") : t("حفظ")}</button></footer></section></div>;
}
