import { Building2, EllipsisVertical, FileUp, Landmark, WalletCards } from "lucide-react";
import Layout from "@/components/Layout";
import { useI18n } from "@/i18n";

type BankAccount = { name: string; icon: typeof Landmark };

const accounts: BankAccount[] = [
  { name: "الحساب البنكي", icon: Landmark },
  { name: "المصروفات النثرية", icon: WalletCards },
  { name: "الخزينة", icon: Building2 },
];

export default function BankAccounts() {
  const { t, direction, formatNumber } = useI18n();
  const zero = formatNumber(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return <Layout><main dir={direction} className="min-h-full bg-slate-50 p-4"><div className="mx-auto max-w-6xl">
    <header className="border-t-2 border-red-700 bg-white px-5 py-3 shadow-sm"><p className="text-[11px] text-slate-400">{t("المحاسبة والمالية")}</p><h1 className="text-base font-bold text-slate-800">{t("الحسابات البنكية")}</h1></header>
    <section className="space-y-4 bg-white p-5">{accounts.map((account) => { const Icon = account.icon; return <article key={account.name} className="rounded border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span><h2 className="text-sm font-bold text-slate-800">{t(account.name)}</h2></div><div className="grid flex-1 gap-2 text-xs text-slate-500 sm:max-w-sm"><div className="flex justify-between gap-3"><span>{t("رصيد الدفتر")}</span><b className="text-slate-800">{zero} SAR</b></div><div className="flex justify-between gap-3"><span>{t("رصيد كشف الحساب")}</span><b className="text-slate-800">{zero} SAR</b></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-2"><span>{t("الفرق")}</span><b className="text-emerald-600">{zero} SAR</b></div></div><div className="flex items-center gap-2"><button className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"><FileUp className="me-1 inline h-3.5 w-3.5" />{t("استيراد كشف حساب")}</button><button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title={t("المزيد")}><EllipsisVertical className="h-4 w-4" /></button></div></div></article>; })}</section>
    <p className="px-5 pb-5 text-[11px] text-slate-400">{t("تبدأ أرصدة الحسابات البنكية بصفر حتى يتم استيراد كشف حساب أو تسجيل حركة مرحّلة.")}</p>
  </div></main></Layout>;
}
