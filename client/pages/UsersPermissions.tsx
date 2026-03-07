import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  phone: string;
  status: string;
};

type UserForm = {
  name: string;
  email: string;
  role: string;
  company: string;
  phone: string;
  status: string;
};

const ROLE_OPTIONS = ["Administrator", "Accounting", "HR", "Sales", "Support", "User"];
const STATUS_OPTIONS = ["نشط", "غير نشط"];

const emptyForm: UserForm = {
  name: "",
  email: "",
  role: "User",
  company: "Kore Holding Company",
  phone: "",
  status: "نشط",
};

const mapUserRow = (row: Record<string, unknown>): UserRow => ({
  id: String(row.id ?? ""),
  name: String(row.full_name ?? row.name ?? ""),
  email: String(row.email ?? ""),
  role: String(row.role ?? "User"),
  company: String(row.company ?? "Kore Holding Company"),
  phone: String(row.phone ?? ""),
  status: String(row.status ?? "نشط"),
});

export default function UsersPermissions() {
  const location = useLocation();
  const isRoles = location.pathname.includes("/users/roles");
  const isAudit = location.pathname.includes("/users/audit");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [fSearch, setFSearch] = useState("");
  const [fRole, setFRole] = useState("");
  const [fStatus, setFStatus] = useState("");

  useEffect(() => {
    if (!isRoles && !isAudit) {
      void loadUsers();
    }
  }, [isRoles, isAudit]);

  async function loadUsers() {
    setLoading(true);
    const result = await supabase
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: false })
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ data: null, error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error && result.data) {
      setUsers(result.data.map((row) => mapUserRow(row as Record<string, unknown>)));
    } else {
      setUsers([]);
      if (result.failed) {
        toast({
          title: "تعذر التحميل",
          description: "فشل الاتصال بقاعدة البيانات",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (fSearch && !`${user.name} ${user.email}`.includes(fSearch)) return false;
      if (fRole && user.role !== fRole) return false;
      if (fStatus && user.status !== fStatus) return false;
      return true;
    });
  }, [users, fSearch, fRole, fStatus]);

  const summaryCards = useMemo(
    () => [
      {
        title: "إجمالي المستخدمين",
        value: String(users.length),
        icon: Users,
        color: "bg-sky-500",
      },
      {
        title: "المستخدمون النشطون",
        value: String(users.filter((u) => u.status === "نشط").length),
        icon: UserCheck,
        color: "bg-emerald-600",
      },
      {
        title: "المستخدمون غير النشطين",
        value: String(users.filter((u) => u.status !== "نشط").length),
        icon: UserX,
        color: "bg-amber-500",
      },
      {
        title: "أدوار النظام",
        value: String(new Set(users.map((u) => u.role)).size),
        icon: ShieldCheck,
        color: "bg-blue-600",
      },
    ],
    [users]
  );

  const title = isRoles
    ? "إدارة الأدوار"
    : isAudit
      ? "سجل التدقيق"
      : "إدارة المستخدمين";
  const description = isRoles
    ? "تحديد الصلاحيات والمسؤوليات لكل دور."
    : isAudit
      ? "متابعة سجل التدقيق والعمليات المنفذة."
      : "إدارة بيانات المستخدمين والوصول للنظام.";

  function openCreate() {
    setSelected(null);
    setForm(emptyForm);
    setMode("create");
  }

  function openEdit(user: UserRow) {
    setSelected(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      phone: user.phone,
      status: user.status,
    });
    setMode("edit");
  }

  function openView(user: UserRow) {
    setSelected(user);
    setMode("view");
  }

  async function saveUser() {
    if (!form.name.trim()) {
      toast({ title: "تنبيه", description: "أدخل اسم المستخدم", variant: "destructive" });
      return;
    }
    if (!form.email.trim()) {
      toast({ title: "تنبيه", description: "أدخل البريد الإلكتروني", variant: "destructive" });
      return;
    }

    const payload = {
      full_name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      company: form.company.trim() || "Kore Holding Company",
      phone: form.phone.trim(),
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    if (mode === "edit" && selected) {
      const result = await supabase
        .from("app_users")
        .update(payload)
        .eq("id", selected.id)
        .then((res) => ({ ...res, failed: false as const }))
        .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

      if (!result.error) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selected.id
              ? { ...u, name: payload.full_name, email: payload.email, role: payload.role, company: payload.company, phone: payload.phone, status: payload.status }
              : u
          )
        );
        toast({ title: "تم الحفظ", description: "تم تحديث المستخدم" });
        setMode("list");
      } else {
        toast({ title: "فشل التحديث", description: "تعذر حفظ التعديلات", variant: "destructive" });
      }
    } else {
      const insertPayload = { id: crypto.randomUUID(), ...payload };
      const result = await supabase
        .from("app_users")
        .insert([insertPayload])
        .then((res) => ({ ...res, failed: false as const }))
        .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

      if (!result.error) {
        const newUser: UserRow = {
          id: insertPayload.id,
          name: insertPayload.full_name,
          email: insertPayload.email,
          role: insertPayload.role,
          company: insertPayload.company,
          phone: insertPayload.phone,
          status: insertPayload.status,
        };
        setUsers((prev) => [newUser, ...prev]);
        toast({ title: "تم الحفظ", description: "تمت إضافة المستخدم" });
        setMode("list");
      } else {
        toast({ title: "فشل الحفظ", description: "تعذر إضافة المستخدم", variant: "destructive" });
      }
    }

    setSaving(false);
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`حذف المستخدم ${user.name}؟`)) return;

    const result = await supabase
      .from("app_users")
      .delete()
      .eq("id", user.id)
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast({ title: "تم الحذف" });
    } else {
      toast({ title: "فشل الحذف", description: "تعذر حذف المستخدم", variant: "destructive" });
    }
  }

  async function toggleUserStatus(user: UserRow) {
    const nextStatus = user.status === "نشط" ? "غير نشط" : "نشط";
    const result = await supabase
      .from("app_users")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .then((res) => ({ ...res, failed: false as const }))
      .catch(() => ({ error: new Error("fetch_failed"), failed: true as const }));

    if (!result.error) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      toast({ title: "تم التحديث", description: `تم تغيير الحالة إلى ${nextStatus}` });
    } else {
      toast({ title: "فشل التحديث", description: "تعذر تحديث الحالة", variant: "destructive" });
    }
  }

  return (
    <Layout
      subMenu={{
        title: "المستخدمين والصلاحيات",
        items: [
          { label: "إدارة المستخدمين", href: "/users" },
          { label: "إدارة الأدوار", href: "/users/roles" },
          { label: "سجل التدقيق", href: "/users/audit" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {!isRoles && !isAudit ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              إضافة مستخدم جديد
            </button>
          ) : null}
        </div>

        {!isRoles && !isAudit ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="erp-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.title}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${card.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {isAudit ? (
          <div className="erp-card">
            <h3 className="text-lg font-semibold text-foreground">سجل التدقيق</h3>
            <p className="mt-2 text-sm text-muted-foreground">يتم تسجيل جميع العمليات الحساسة هنا مع معلومات المستخدم والوقت.</p>
          </div>
        ) : isRoles ? (
          <div className="erp-card">
            <h3 className="text-lg font-semibold text-foreground">إدارة الأدوار</h3>
            <p className="mt-2 text-sm text-muted-foreground">قم بتحديث الصلاحيات الممنوحة لكل دور حسب احتياج العمل.</p>
          </div>
        ) : mode === "create" || mode === "edit" ? (
          <div className="erp-card space-y-4">
            <h3 className="text-lg font-semibold text-foreground">{mode === "create" ? "إضافة مستخدم" : "تعديل المستخدم"}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Field label="اسم المستخدم">
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              </Field>
              <Field label="البريد الإلكتروني">
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              </Field>
              <Field label="الدور">
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background">
                  {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                </select>
              </Field>
              <Field label="الشركة">
                <input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              </Field>
              <Field label="الهاتف">
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
              </Field>
              <Field label="الحالة">
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background">
                  {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={saveUser} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={() => setMode("list")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium">
                <X className="h-4 w-4" />
                إلغاء
              </button>
            </div>
          </div>
        ) : mode === "view" && selected ? (
          <div className="erp-card space-y-3">
            <h3 className="text-lg font-semibold text-foreground">تفاصيل المستخدم</h3>
            <p><strong>الاسم:</strong> {selected.name}</p>
            <p><strong>البريد:</strong> {selected.email}</p>
            <p><strong>الدور:</strong> {selected.role}</p>
            <p><strong>الشركة:</strong> {selected.company}</p>
            <p><strong>الهاتف:</strong> {selected.phone || "-"}</p>
            <p><strong>الحالة:</strong> {selected.status}</p>
            <button onClick={() => setMode("list")} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium">
              <X className="h-4 w-4" />
              إغلاق
            </button>
          </div>
        ) : (
          <div className="erp-card">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="ابحث باسم المستخدم أو البريد" className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">الدور</option>
                  {ROLE_OPTIONS.map((role) => <option key={role}>{role}</option>)}
                </select>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">الحالة</option>
                  {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                </select>
                <button onClick={() => { setFSearch(""); setFRole(""); setFStatus(""); }} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <Filter className="h-4 w-4" />
                  إعادة ضبط
                </button>
                <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-4 py-3 text-right font-semibold">#</th>
                    <th className="px-4 py-3 text-right font-semibold">المستخدم</th>
                    <th className="px-4 py-3 text-right font-semibold">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right font-semibold">الدور</th>
                    <th className="px-4 py-3 text-right font-semibold">الشركة</th>
                    <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">لا يوجد مستخدمون</td></tr>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/40">
                        <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-3 text-foreground">{user.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{user.role}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{user.company}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => void toggleUserStatus(user)} className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "نشط" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                            {user.status}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openView(user)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => openEdit(user)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => void deleteUser(user)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
