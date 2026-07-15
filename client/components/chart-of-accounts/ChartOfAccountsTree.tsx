import { Search, ChevronDown, ChevronLeft, Info } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import type { AccountNode } from "./accountData";
import { defaultAccounts, CATEGORY_COLORS } from "./accountData";
import AccountActionsMenu from "./AccountActionsMenu";
import AccountEditPanel from "./AccountEditPanel";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

const COMPANY_NAME = "شركة العياف التجارية";

const toDatabaseAccount = (account: AccountNode) => ({
  code: account.code,
  company_name: COMPANY_NAME,
  name_ar: account.nameAr,
  name_en: account.nameEn,
  parent_code: account.parentCode || null,
  cash_flow_type: account.cashFlowType,
  account_type: account.accountType,
  level: account.level,
  enable_payments: account.enablePayments,
  show_expense_claims: account.showExpenseClaims,
  is_main_category: Boolean(account.isMainCategory),
  category_color: account.categoryColor ?? null,
  currency_badge: account.currencyBadge ?? null,
  is_system: Boolean(account.isSystem),
  updated_at: new Date().toISOString(),
});

export default function ChartOfAccountsTree() {
  const [accounts, setAccounts] = useState<AccountNode[]>(defaultAccounts);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAccount, setEditingAccount] = useState<AccountNode | null>(null);
  const [collapsedCodes, setCollapsedCodes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"tree" | "list">("tree");
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      await supabase
        .from("accounting_accounts")
        .upsert(defaultAccounts.map(toDatabaseAccount), { onConflict: "code", ignoreDuplicates: true });

      const { data, error } = await supabase
        .from("accounting_accounts")
        .select("*")
        .eq("company_name", COMPANY_NAME)
        .order("code");

      if (error) {
        toast({ title: "تعذر تحميل الحسابات", description: error.message, variant: "destructive" });
        return;
      }

      if (data?.length) {
        setAccounts(data.map((row) => ({
          code: row.code,
          nameAr: row.name_ar,
          nameEn: row.name_en,
          cashFlowType: row.cash_flow_type,
          enablePayments: row.enable_payments,
          showExpenseClaims: row.show_expense_claims,
          accountType: row.account_type,
          level: row.level,
          isMainCategory: row.is_main_category,
          categoryColor: row.category_color ?? undefined,
          currencyBadge: row.currency_badge ?? undefined,
          isSystem: row.is_system,
          parentCode: row.parent_code ?? "",
        })));
      }
    };

    void loadAccounts();
  }, []);

  const hasChildren = (code: string) =>
    accounts.some((a) => a.parentCode === code);

  const toggleCollapse = (code: string) => {
    setCollapsedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const isHidden = (account: AccountNode): boolean => {
    if (!account.parentCode) return false;
    if (collapsedCodes.has(account.parentCode)) return true;
    const parent = accounts.find((a) => a.code === account.parentCode);
    return parent ? isHidden(parent) : false;
  };

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.includes(q) ||
        a.nameAr.includes(q) ||
        a.nameEn.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  const visibleAccounts = useMemo(() => {
    if (searchQuery.trim()) return filteredAccounts;
    return filteredAccounts.filter((a) => !isHidden(a));
  }, [filteredAccounts, searchQuery, collapsedCodes]);

  const getCategoryColor = (account: AccountNode) => {
    if (account.categoryColor) {
      return CATEGORY_COLORS[account.categoryColor];
    }
    return null;
  };

  const getMainCategoryForAccount = (account: AccountNode): AccountNode | undefined => {
    if (account.level === 0) return account;
    const rootCode = account.code.charAt(0);
    return accounts.find((a) => a.code === rootCode && a.level === 0);
  };

  const handleSaveAccount = async (updated: AccountNode) => {
    const { error } = await supabase
      .from("accounting_accounts")
      .upsert(toDatabaseAccount(updated), { onConflict: "code" });

    if (error) {
      toast({ title: "تعذر حفظ الحساب", description: error.message, variant: "destructive" });
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.code === updated.code ? updated : a))
    );
    setEditingAccount(null);
    toast({ title: "تم الحفظ", description: "تم تحديث بيانات الحساب وربطه بقاعدة البيانات" });
  };

  const handleDeleteAccount = async (code: string) => {
    const account = accounts.find((a) => a.code === code);
    if (!account) return;

    if (account.isSystem) {
      toast({
        title: "لا يمكن الحذف",
        description: "هذا الحساب مقيد ولا يمكن حذفه لأنه حساب نظامي.",
        variant: "destructive",
      });
      return;
    }

    const childrenExist = accounts.some((a) => a.parentCode === code);
    if (childrenExist) {
      toast({
        title: "لا يمكن الحذف",
        description: "يجب حذف الحسابات الفرعية أولاً.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("accounting_accounts").delete().eq("code", code);
    if (error) {
      toast({ title: "تعذر حذف الحساب", description: error.message, variant: "destructive" });
      return;
    }

    setAccounts((prev) => prev.filter((a) => a.code !== code));
    toast({ title: "تم الحذف", description: "تم حذف الحساب من قاعدة البيانات" });
  };

  const handleAddSubAccount = (parentCode: string, isBank = false) => {
    const parent = accounts.find((a) => a.code === parentCode);
    if (!parent) return;

    const siblings = accounts.filter((a) => a.parentCode === parentCode);
    let newCode: string;
    if (siblings.length === 0) {
      newCode = parentCode + "1";
    } else {
      const lastSibling = siblings[siblings.length - 1];
      const lastDigit = parseInt(lastSibling.code.slice(parentCode.length)) || 0;
      newCode = parentCode + String(lastDigit + 1);
    }

    const mainCat = getMainCategoryForAccount(parent);

    const newAccount: AccountNode = {
      code: newCode,
      nameAr: isBank ? "حساب بنكي جديد" : "حساب فرعي جديد",
      nameEn: isBank ? "New Bank Account" : "New Sub Account",
      cashFlowType: parent.cashFlowType || "التشغيليات",
      enablePayments: isBank,
      showExpenseClaims: false,
      accountType: parent.accountType || "التشغيليات",
      level: parent.level + 1,
      currencyBadge: isBank ? "SAR" : undefined,
      isSystem: false,
      parentCode: parentCode,
    };

    const parentIndex = accounts.findIndex((a) => a.code === parentCode);
    let insertIndex = parentIndex + 1;
    while (
      insertIndex < accounts.length &&
      accounts[insertIndex].level > parent.level
    ) {
      insertIndex++;
    }

    const newAccounts = [...accounts];
    newAccounts.splice(insertIndex, 0, newAccount);
    setAccounts(newAccounts);

    // Expand parent
    setCollapsedCodes((prev) => {
      const next = new Set(prev);
      next.delete(parentCode);
      return next;
    });

    setEditingAccount(newAccount);
    toast({
      title: "تمت الإضافة",
      description: `تم إضافة ${isBank ? "حساب بنكي" : "حساب"} فرعي جديد`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setActiveTab("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "list"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الحسابات
            </button>
            <button
              onClick={() => setActiveTab("tree")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeTab === "tree"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              شجرة الحسابات
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث..."
            className="w-full rounded-lg border border-border bg-background pr-9 pl-3 py-2 text-sm text-right"
            dir="rtl"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm" dir="rtl">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-[120px]">
                  رقم الحساب
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  اسم الحساب
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-[140px]">
                  نوع التدفق النقدي
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-[140px]">
                  تفعيل عمليات الدفع
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-[160px]">
                  إظهار في مطالبات المصر...
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground w-[120px]">
                  نوع الحساب
                </th>
                <th className="w-[50px]" />
              </tr>
            </thead>
            <tbody>
              {visibleAccounts.map((account) => {
                const catColor = getCategoryColor(account);
                const isMainRow = account.isMainCategory;
                const hasKids = hasChildren(account.code);
                const isCollapsed = collapsedCodes.has(account.code);

                if (isMainRow) {
                  return (
                    <MainCategoryRow
                      key={account.code}
                      account={account}
                      catColor={catColor}
                      hasKids={hasKids}
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleCollapse(account.code)}
                      onEdit={() => setEditingAccount(account)}
                      onDelete={() => handleDeleteAccount(account.code)}
                      onAddSub={() => handleAddSubAccount(account.code)}
                      onAddBank={() => handleAddSubAccount(account.code, true)}
                      hoveredSystem={hoveredSystem}
                      setHoveredSystem={setHoveredSystem}
                    />
                  );
                }

                return (
                  <AccountRow
                    key={account.code}
                    account={account}
                    hasKids={hasKids}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleCollapse(account.code)}
                    onEdit={() => setEditingAccount(account)}
                    onDelete={() => handleDeleteAccount(account.code)}
                    onAddSub={() => handleAddSubAccount(account.code)}
                    onAddBank={() => handleAddSubAccount(account.code, true)}
                    hoveredSystem={hoveredSystem}
                    setHoveredSystem={setHoveredSystem}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Panel */}
      {editingAccount && (
        <AccountEditPanel
          account={editingAccount}
          allAccounts={accounts}
          onClose={() => setEditingAccount(null)}
          onSave={handleSaveAccount}
        />
      )}
    </div>
  );
}

/* ===== Main Category Row (level 0 colored bar) ===== */
function MainCategoryRow({
  account,
  catColor,
  hasKids,
  isCollapsed,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  onAddBank,
  hoveredSystem,
  setHoveredSystem,
}: {
  account: AccountNode;
  catColor: { bg: string; text: string; border: string } | null;
  hasKids: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onAddBank: () => void;
  hoveredSystem: string | null;
  setHoveredSystem: (v: string | null) => void;
}) {
  const bgClass = catColor
    ? `${catColor.bg}/10`
    : "bg-slate-100";

  return (
    <tr className={`border-b border-border ${bgClass} font-semibold`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          {hasKids && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
              {isCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <span className="text-foreground">{account.code}</span>
        </div>
      </td>
      <td className="px-3 py-2.5" colSpan={5}>
        <div className="flex items-center gap-2">
          {catColor && (
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${catColor.bg} ${catColor.text}`}
            >
              {account.nameAr}
            </span>
          )}
          {!catColor && <span className="text-foreground">{account.nameAr}</span>}

          {account.isSystem && (
            <div className="relative">
              <button
                onMouseEnter={() => setHoveredSystem(account.code)}
                onMouseLeave={() => setHoveredSystem(null)}
                className="text-muted-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {hoveredSystem === account.code && (
                <div className="absolute z-50 top-full right-0 mt-1 w-64 rounded-lg border border-border bg-slate-800 text-white p-3 text-xs leading-relaxed shadow-lg">
                  هذا الحساب مقيد ولا يمكن حذفه لأنه حساب نظامي تم إنشاؤه لمساعدتك على تنظيم حساباتك وربطها بالتقارير المناسبة.
                </div>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5">
        <AccountActionsMenu
          account={account}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubAccount={onAddSub}
          onAddBankSubAccount={onAddBank}
        />
      </td>
    </tr>
  );
}

/* ===== Regular Account Row ===== */
function AccountRow({
  account,
  hasKids,
  isCollapsed,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  onAddBank,
  hoveredSystem,
  setHoveredSystem,
}: {
  account: AccountNode;
  hasKids: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onAddBank: () => void;
  hoveredSystem: string | null;
  setHoveredSystem: (v: string | null) => void;
}) {
  const indent = account.level * 20;

  return (
    <tr className="border-b border-border bg-white hover:bg-slate-50/60 transition">
      {/* رقم الحساب */}
      <td className="px-3 py-2.5">
        <span className="text-foreground">{account.code}</span>
      </td>

      {/* اسم الحساب */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2" style={{ paddingRight: `${indent}px` }}>
          {hasKids && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground shrink-0">
              {isCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <span className="text-foreground">{account.nameAr}</span>

          {account.currencyBadge && (
            <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">
              {account.currencyBadge}
            </span>
          )}

          {account.isSystem && (
            <div className="relative">
              <button
                onMouseEnter={() => setHoveredSystem(account.code)}
                onMouseLeave={() => setHoveredSystem(null)}
                className="text-muted-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {hoveredSystem === account.code && (
                <div className="absolute z-50 top-full right-0 mt-1 w-64 rounded-lg border border-border bg-slate-800 text-white p-3 text-xs leading-relaxed shadow-lg">
                  هذا الحساب مقيد ولا يمكن حذفه لأنه حساب نظامي تم إنشاؤه لمساعدتك على تنظيم حساباتك وربطها بالتقارير المناسبة.
                </div>
              )}
            </div>
          )}
        </div>
      </td>

      {/* نوع التدفق النقدي */}
      <td className="px-3 py-2.5 text-muted-foreground">
        {account.cashFlowType || "—"}
      </td>

      {/* تفعيل عمليات الدفع */}
      <td className="px-3 py-2.5 text-muted-foreground">
        {account.enablePayments ? "نعم" : "—"}
      </td>

      {/* إظهار في مطالبات المصروف */}
      <td className="px-3 py-2.5 text-muted-foreground">
        {account.showExpenseClaims ? "نعم" : "—"}
      </td>

      {/* نوع الحساب */}
      <td className="px-3 py-2.5 text-muted-foreground">
        {account.accountType || "—"}
      </td>

      {/* Actions */}
      <td className="px-2 py-2.5">
        <AccountActionsMenu
          account={account}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubAccount={onAddSub}
          onAddBankSubAccount={onAddBank}
        />
      </td>
    </tr>
  );
}
