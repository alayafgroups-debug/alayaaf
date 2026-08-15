import { X, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { AccountNode } from "./accountData";
import { CASH_FLOW_TYPES } from "./accountData";
import { useI18n } from "@/i18n";

type Props = {
  account: AccountNode;
  allAccounts: AccountNode[];
  onClose: () => void;
  onSave: (updated: AccountNode) => void;
};

export default function AccountEditPanel({ account, allAccounts, onClose, onSave }: Props) {
  const { t, direction } = useI18n();
  const [form, setForm] = useState<AccountNode>({ ...account });
  const [usageOpen, setUsageOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);

  const [allowTransactions, setAllowTransactions] = useState(true);
  const [allowPayments, setAllowPayments] = useState(account.enablePayments);
  const [allowExpenseClaims, setAllowExpenseClaims] = useState(account.showExpenseClaims);

  const parentOptions = allAccounts.filter(
    (a) => a.code !== form.code && a.level < form.level
  );

  const mainCategories = allAccounts.filter((a) => a.level === 0);

  const handleSave = () => {
    onSave({
      ...form,
      enablePayments: allowPayments,
      showExpenseClaims: allowExpenseClaims,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex" dir={direction}>
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-xl border-s border-border overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-5 py-3">
          <button
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {t("حفظ")}
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{t("تعديل الحساب")}</h2>
            <button onClick={onClose} aria-label={t("إغلاق")} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Account Type & Classification */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-red-500">{t("مطلوب")}</span>
              <label className="text-sm font-semibold text-foreground">{t("نوع الحساب والتصنيف")}</label>
            </div>
            <select
              value={form.parentCode ? allAccounts.find(a => a.code === form.parentCode && a.level === 0)?.code || form.code.charAt(0) : form.code}
              onChange={(e) => setForm({ ...form })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-start"
              dir={direction}
            >
              {mainCategories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.code} - {cat.nameAr}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground text-start">{t("الأب")}</p>
          </div>

          {/* Parent Account */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-red-500">{t("مطلوب")}</span>
              <label className="text-sm font-semibold text-foreground">{t("الحساب الرئيسي")} / {t("الأب")}</label>
            </div>
            <select
              value={form.parentCode}
              onChange={(e) => setForm({ ...form, parentCode: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-start"
              dir={direction}
            >
              <option value="">{t("بدون حساب أب")}</option>
              {parentOptions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} - {p.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Account Info */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-red-500">{t("مطلوب")}</span>
              <label className="text-sm font-semibold text-foreground">{t("معلومات الحساب")}</label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground text-start">{t("الاسم")}</label>
                <input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-start"
                  dir={direction}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground text-start">{t("الاسم بالإنجليزية")}</label>
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  dir="ltr"
                  placeholder={t("أدخل الاسم بالإنجليزية")}
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground justify-end">
                  <Lock className="h-3 w-3" />
                  {t("رقم الحساب")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.code}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-start"
                    dir={direction}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground justify-end cursor-pointer">
                {t("يظهر هذا الحساب في تقرير قائمة المركز المالي")}
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>
            </div>
          </div>

          {/* Cash Flow Type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground text-start">
              {t("نوع التدفق النقدي")}<span className="text-red-500">*</span>
            </label>
            <select
              value={form.cashFlowType}
              onChange={(e) => setForm({ ...form, cashFlowType: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-start"
              dir={direction}
            >
              {CASH_FLOW_TYPES.map((cashFlowType) => (
                <option key={cashFlowType} value={cashFlowType}>{t(cashFlowType)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground text-start">
              {t("حدد القسم الذي سيظهره هذا الحساب ضمن قائمة التدفقات النقدية")}
            </p>
          </div>

          {/* How Can This Account Be Used */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setUsageOpen(!usageOpen)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-foreground"
            >
              <div className="flex items-center gap-1">
                {usageOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <span>{t("كيف يمكن استخدام هذا الحساب؟")} ({t("اختياري")})</span>
            </button>
            {usageOpen && (
              <div className="px-4 pb-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-foreground justify-end cursor-pointer">
                  {t("السماح بتسجيل المعاملات على هذا الحساب")}
                  <input
                    type="checkbox"
                    checked={allowTransactions}
                    onChange={(e) => setAllowTransactions(e.target.checked)}
                    className="rounded border-border"
                  />
                </label>
                <p className="text-xs text-muted-foreground text-start">
                  {t("سيتم السماح في هذه الحالة بتحديد هذا الحساب عند إنشاء القيود المحاسبية أو إصدار الفواتير")}
                </p>

                <label className="flex items-center gap-2 text-sm text-foreground justify-end cursor-pointer">
                  {t("السماح باختيار هذا الحساب للمدفوعات")}
                  <input
                    type="checkbox"
                    checked={allowPayments}
                    onChange={(e) => setAllowPayments(e.target.checked)}
                    className="rounded border-border"
                  />
                </label>
                <p className="text-xs text-muted-foreground text-start">
                  {t("سيتم السماح في هذه الحالة بتحديد هذا الحساب عند تسجيل عمليات الدفع")}
                </p>

                <label className="flex items-center gap-2 text-sm text-foreground justify-end cursor-pointer">
                  {t("السماح باختيار هذا الحساب في مطالبات أو مصاريف الموظفين")}
                  <input
                    type="checkbox"
                    checked={allowExpenseClaims}
                    onChange={(e) => setAllowExpenseClaims(e.target.checked)}
                    className="rounded border-border"
                  />
                </label>
                <p className="text-xs text-muted-foreground text-start">
                  {t("سيتم السماح في هذه الحالة بتحديد هذا الحساب عند تقديم مطالبات الموظفين")}
                </p>
              </div>
            )}
          </div>

          {/* Reports Section */}
          <div className="border border-border rounded-lg">
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-foreground"
            >
              <div className="flex items-center gap-1">
                {reportsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <span>{t("سجلات وتقارير الحساب")}</span>
            </button>
            {reportsOpen && (
              <div className="px-4 pb-4 text-sm text-muted-foreground text-start">
                {t("لا توجد سجلات أو تقارير مرتبطة بهذا الحساب حالياً.")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
