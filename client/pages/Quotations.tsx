import { type ReactNode, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Trash2,
  ArrowLeftRight,
  Edit,
  Eye,
  FileSpreadsheet,
  Save,
  Download,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  FilterBar,
  FilterInput,
  FilterSelect,
  FilterActions,
  DataTable,
  ActionBtn,
} from "@/components/SalesPageUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type QuotationItem = {
  id: number;
  itemLabel: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
};

type Totals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

type QuotationRow = {
  id: string;
  date: string;
  validity: string;
  customer: string;
  customerVat: string;
  customerAddress: string;
  referenceNo: string;
  projectName: string;
  notes: string;
  total: string;
  status: string;
  statusColor: string;
  items: QuotationItem[];
};

const statusColors: Record<string, string> = {
  مفتوح: "bg-cyan-500 text-white",
  مرسل: "bg-indigo-600 text-white",
  مغلق: "bg-green-600 text-white",
};

const COMPANY_LOGO_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fce04605038104603b965d31c7c18e8db%2F170c644ba9324aa19b4716bb738402ab?format=webp&width=800&height=1200";

const COMPANY_INFO = {
  nameAr: "شركة إدارة العياف للمقاولات",
  nameEn: "Al-ayaf Management company",
  commercialNo: "7049437580",
  vatNo: "314067317200003",
  city: "جدة",
  bankName: "بنك العربي الوطني",
  beneficiary: "شركة إدارة العياف للمقاولات",
  accountNo: "0108095783340017",
  iban: "SA8930400108095783340017",
};

const toNum = (v: unknown) => Number(v) || 0;

const INPUT_CLASS = "w-full h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const formatMoney = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseCurrency = (value: unknown) => {
  const raw = String(value ?? "").replace(/[^0-9.-]/g, "");
  return Number(raw) || 0;
};

function calculateTotals(items: QuotationItem[]): Totals {
  return items.reduce(
    (acc, item) => {
      const lineSubtotal = toNum(item.quantity) * toNum(item.unitPrice) - toNum(item.discount);
      const lineTax = (lineSubtotal * toNum(item.taxPercent)) / 100;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + toNum(item.discount),
        tax: acc.tax + lineTax,
        total: acc.total + lineSubtotal + lineTax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );
}

function createDefaultItem(id = 1): QuotationItem {
  return {
    id,
    itemLabel: "توريد عمالة",
    description: "",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxPercent: 15,
  };
}

function mapRow(row: Record<string, unknown>): QuotationRow {
  const status = String(row.status ?? "مفتوح");
  const itemsRaw = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];

  const items =
    itemsRaw.length > 0
      ? itemsRaw.map((it, idx) => ({
          id: Number(it.id) || idx + 1,
          itemLabel: String(it.itemLabel ?? "توريد عمالة"),
          description: String(it.description ?? ""),
          quantity: toNum(it.quantity),
          unitPrice: toNum(it.unitPrice),
          discount: toNum(it.discount),
          taxPercent: toNum(it.taxPercent),
        }))
      : [createDefaultItem(1)];

  return {
    id: String(row.id ?? ""),
    date: String(row.issue_date ?? row.date ?? ""),
    validity: String(row.valid_until ?? row.validity ?? ""),
    customer: String(row.customer ?? ""),
    customerVat: String(row.customer_vat ?? ""),
    customerAddress: String(row.customer_address ?? ""),
    referenceNo: String(row.reference_no ?? ""),
    projectName: String(row.project_name ?? ""),
    notes: String(row.notes ?? ""),
    total: formatMoney(parseCurrency(row.grand_total ?? row.total)),
    status,
    statusColor: statusColors[status] ?? "bg-cyan-500 text-white",
    items,
  };
}

export default function Quotations() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit">("list");
  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadQuotations = async () => {
      const { data, error } = await supabase
        .from("sales_quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setQuotations(data.map((row) => mapRow(row as Record<string, unknown>)));
      }
    };

    loadQuotations();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (quotationId: string) => {
    if (!confirm("هل تريد حذف عرض السعر؟")) return;

    const { error } = await supabase.from("sales_quotations").delete().eq("id", quotationId);

    if (!error) {
      setQuotations((prev) => prev.filter((row) => row.id !== quotationId));
      toast({ title: "تم حذف عرض السعر", description: `العرض: ${quotationId}` });
    } else {
      toast({ title: "تعذر حذف عرض السعر", description: error.message });
    }
  };

  const handleDownloadPdf = (quotation: QuotationRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totals = calculateTotals(quotation.items);
    const rowsHtml = quotation.items
      .map((item) => {
        const subtotal = item.quantity * item.unitPrice - item.discount;
        const taxVal = (subtotal * item.taxPercent) / 100;
        const lineTotal = subtotal + taxVal;
        return `
          <tr>
            <td>${item.itemLabel || "-"}</td>
            <td>${item.description || "-"}</td>
            <td>${item.unitPrice.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>${item.discount.toFixed(2)}</td>
            <td>${subtotal.toFixed(2)}</td>
            <td>${item.taxPercent}%</td>
            <td>${taxVal.toFixed(2)}</td>
            <td>${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>عرض سعر ${quotation.id}</title>
          <style>
            *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#111827}
            .sheet{max-width:1200px;margin:0 auto}
            .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}
            .logo{width:140px;height:100px;object-fit:contain}
            .title{font-size:32px;font-weight:700;margin:0}
            .meta{font-size:15px;line-height:1.7}
            .customer{margin:14px 0 12px;font-size:22px;text-align:center;line-height:1.7}
            table{width:100%;border-collapse:collapse;font-size:18px}
            th,td{border:1px solid #e5e7eb;padding:8px;text-align:center}
            th{background:#e5e7eb;font-weight:700}
            .totals{width:420px;margin-top:12px;font-size:30px}
            .totals div{display:flex;justify-content:space-between;border-bottom:1px solid #d1d5db;padding:6px 0}
            .bank{margin-top:30px;font-size:18px;line-height:1.9}
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top">
              <div>
                <h1 class="title">عرض سعر</h1>
                <div class="meta">الرقم ${quotation.id}<br/>التاريخ ${quotation.date || "-"}</div>
              </div>
              <div class="meta" style="text-align:center">
                <div style="font-size:28px;font-weight:700">${COMPANY_INFO.nameAr}</div>
                السجل التجاري: ${COMPANY_INFO.commercialNo}<br/>
                الرقم الضريبي: ${COMPANY_INFO.vatNo}<br/>
                ${COMPANY_INFO.city}
              </div>
              <div style="text-align:left">
                <img src="${COMPANY_LOGO_URL}" class="logo"/>
                <div class="meta">${COMPANY_INFO.nameEn}</div>
              </div>
            </div>

            <div class="customer">
              العميل: ${quotation.customer || "-"}<br/>
              الرقم الضريبي: ${quotation.customerVat || "-"}<br/>
              العنوان: ${quotation.customerAddress || "-"}
            </div>

            <table>
              <thead>
                <tr>
                  <th>البند</th>
                  <th>الوصف</th>
                  <th>السعر</th>
                  <th>الكمية</th>
                  <th>الخصم</th>
                  <th>المجموع بدون الضريبة</th>
                  <th>نسبة الضريبة</th>
                  <th>قيمة الضريبة</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="totals">
              <div><span>${totals.subtotal.toFixed(2)}</span><span>الإجمالي قبل الضريبة</span></div>
              <div><span>${totals.tax.toFixed(2)}</span><span>القيمة المضافة %15</span></div>
              <div><span>${totals.total.toFixed(2)}</span><span>الإجمالي (﷼)</span></div>
              <div><span>${totals.total.toFixed(2)}</span><span>المستحق (﷼)</span></div>
            </div>

            <div class="bank">
              <strong>ملاحظات</strong><br/>
              <strong>البيانات البنكية</strong><br/>
              *اسم البنك: ${COMPANY_INFO.bankName}<br/>
              *اسم المستفيد: ${COMPANY_INFO.beneficiary}<br/>
              *رقم الحساب: ${COMPANY_INFO.accountNo}<br/>
              *رقم الايبان: ${COMPANY_INFO.iban}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Layout subMenu={{ title: "المبيعات", items: salesFeatures }}>
      <div className="mx-auto max-w-7xl">
        {view === "list" && (
          <QuotationsList
            quotations={quotations}
            onCreateClick={() => setView("create")}
            onView={(quotation) => {
              setSelectedQuotation(quotation);
              setView("details");
            }}
            onEdit={(quotation) => {
              setSelectedQuotation(quotation);
              setView("edit");
            }}
            onDelete={handleDelete}
            onDownloadPdf={handleDownloadPdf}
          />
        )}

        {view === "create" && (
          <QuotationEditor
            mode="create"
            onBack={() => setView("list")}
            onSaved={(newRow) => {
              setQuotations((prev) => [newRow, ...prev]);
              setView("list");
              refresh();
            }}
          />
        )}

        {view === "details" && selectedQuotation && (
          <QuotationDetails
            quotation={selectedQuotation}
            onBack={() => setView("list")}
            onEdit={() => setView("edit")}
            onDownloadPdf={handleDownloadPdf}
          />
        )}

        {view === "edit" && selectedQuotation && (
          <QuotationEditor
            mode="edit"
            initialData={selectedQuotation}
            onBack={() => setView("details")}
            onSaved={(updatedRow) => {
              setQuotations((prev) => prev.map((q) => (q.id === updatedRow.id ? updatedRow : q)));
              setSelectedQuotation(updatedRow);
              setView("details");
              refresh();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

function QuotationsList({
  quotations,
  onCreateClick,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
}: {
  quotations: QuotationRow[];
  onCreateClick: () => void;
  onView: (quotation: QuotationRow) => void;
  onEdit: (quotation: QuotationRow) => void;
  onDelete: (quotationId: string) => void;
  onDownloadPdf: (quotation: QuotationRow) => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileSpreadsheet}
        title="عروض الأسعار"
        subtitle="إدارة وتتبع جميع عروض الأسعار"
        actionLabel="إضافة عرض سعر جديد"
        onAction={onCreateClick}
        gradient="from-blue-600 to-indigo-700"
      />

      <FilterBar>
        <FilterInput label="البحث" placeholder="رقم العرض، العميل..." colSpan={2} />
        <FilterSelect label="العميل" options={["الكل"]} />
        <FilterSelect label="الحالة" options={["الكل", "مفتوح", "مرسل", "مغلق"]} />
        <FilterActions />
      </FilterBar>

      <DataTable
        headers={["الإجراءات", "الحالة", "الإجمالي", "العميل", "تاريخ الصلاحية", "تاريخ العرض", "رقم العرض"]}
        gradient="from-[#1e293b] to-[#334155]"
      >
        {quotations.map((row, idx) => (
          <tr key={row.id} className={cn("hover:bg-muted/30", idx % 2 !== 0 && "bg-muted/10")}>
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn icon={Eye} label="عرض" color="blue" onClick={() => onView(row)} />
                <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => onEdit(row)} />
                <ActionBtn icon={Download} label="PDF" color="slate" onClick={() => onDownloadPdf(row)} />
                <ActionBtn icon={Trash2} label="حذف" color="red" onClick={() => onDelete(row.id)} />
              </div>
            </td>
            <td className="px-5 py-3.5 text-right">
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", row.statusColor)}>{row.status}</span>
            </td>
            <td className="px-5 py-3.5 font-bold text-primary whitespace-nowrap">{row.total} ريال</td>
            <td className="px-5 py-3.5">{row.customer || "-"}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{row.validity || "-"}</td>
            <td className="px-5 py-3.5 text-muted-foreground">{row.date || "-"}</td>
            <td className="px-5 py-3.5 font-bold text-primary">{row.id}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function QuotationEditor({
  mode,
  initialData,
  onBack,
  onSaved,
}: {
  mode: "create" | "edit";
  initialData?: QuotationRow;
  onBack: () => void;
  onSaved: (quotation: QuotationRow) => void;
}) {
  const [quotationId, setQuotationId] = useState(initialData?.id ?? "");
  const [date, setDate] = useState(initialData?.date ?? "");
  const [validity, setValidity] = useState(initialData?.validity ?? "");
  const [customer, setCustomer] = useState(initialData?.customer ?? "");
  const [customerVat, setCustomerVat] = useState(initialData?.customerVat ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialData?.customerAddress ?? "");
  const [referenceNo, setReferenceNo] = useState(initialData?.referenceNo ?? "");
  const [projectName, setProjectName] = useState(initialData?.projectName ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "مفتوح");
  const [items, setItems] = useState<QuotationItem[]>(initialData?.items?.length ? initialData.items : [createDefaultItem(1)]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDefaults = async () => {
      const today = new Date();
      const afterMonth = new Date(today);
      afterMonth.setDate(today.getDate() + 30);

      if (!initialData) {
        setDate(today.toISOString().split("T")[0]);
        setValidity(afterMonth.toISOString().split("T")[0]);

        const { data } = await supabase
          .from("sales_quotations")
          .select("id")
          .like("id", "QUO-%")
          .order("id", { ascending: false })
          .limit(1);

        const latestId = data?.[0]?.id ?? "QUO-000099";
        const latestNumber = Number(String(latestId).split("-")[1] ?? "99");
        setQuotationId(`QUO-${String(latestNumber + 1).padStart(6, "0")}`);
      }

      const { data: customerRows } = await supabase.from("customers").select("name").order("name");
      const names = (customerRows ?? []).map((r) => String(r.name ?? "")).filter(Boolean);
      setCustomers(names);
    };

    loadDefaults();
  }, [initialData]);

  const totals = useMemo(() => calculateTotals(items), [items]);

  const updateItem = (id: number, changes: Partial<QuotationItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, createDefaultItem(Date.now())]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  };

  const handleSave = async (nextStatus: string) => {
    if (!quotationId || !customer || !date) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال رقم العرض والعميل والتاريخ" });
      return;
    }

    setSaving(true);

    const payload = {
      id: quotationId,
      date,
      validity,
      issue_date: date,
      valid_until: validity || null,
      customer,
      customer_vat: customerVat || null,
      customer_address: customerAddress || null,
      reference_no: referenceNo || null,
      project_name: projectName || null,
      notes: notes || null,
      status: nextStatus,
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      tax_total: totals.tax,
      grand_total: totals.total,
      total: totals.total.toFixed(2),
      items,
    };

    const query = mode === "create"
      ? supabase.from("sales_quotations").insert([payload]).select().single()
      : supabase.from("sales_quotations").update(payload).eq("id", quotationId).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error || !data) {
      toast({ title: "تعذر حفظ عرض السعر", description: error?.message ?? "حدث خطأ غير متوقع" });
      return;
    }

    const mapped = mapRow(data as Record<string, unknown>);
    onSaved(mapped);
    toast({ title: mode === "create" ? "تم حفظ عرض السعر" : "تم تحديث عرض السعر", description: `العرض: ${mapped.id}` });
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white px-4 py-3">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold flex items-center gap-2">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{mode === "create" ? "عرض سعر" : "تعديل عرض سعر"}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave("مفتوح")}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
          </button>
          <button
            onClick={() => handleSave("مرسل")}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> حفظ ثم إرسال
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <QuotePreview
          quotation={{
            id: quotationId,
            date,
            validity,
            customer,
            customerVat,
            customerAddress,
            referenceNo,
            projectName,
            notes,
            total: totals.total.toFixed(2),
            status,
            statusColor: statusColors[status] ?? "bg-cyan-500 text-white",
            items,
          }}
        />

        <div className="rounded-xl border border-border/60 bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="رقم عرض السعر">
              <input value={quotationId} onChange={(e) => setQuotationId(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="العميل">
              <div className="space-y-2">
                <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={INPUT_CLASS}>
                  <option value="">اختر العميل</option>
                  {customers.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="أو اكتب اسم عميل جديد" className={INPUT_CLASS} />
              </div>
            </Field>
            <Field label="التاريخ">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="تاريخ الصلاحية">
              <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="الرقم الضريبي للعميل">
              <input value={customerVat} onChange={(e) => setCustomerVat(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="رقم المرجع">
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="العنوان" className="md:col-span-2">
              <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="المشروع" className="md:col-span-2">
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={INPUT_CLASS} />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-2 border">الإجراءات</th>
                  <th className="px-2 py-2 border">البند</th>
                  <th className="px-2 py-2 border">الوصف</th>
                  <th className="px-2 py-2 border">السعر</th>
                  <th className="px-2 py-2 border">الكمية</th>
                  <th className="px-2 py-2 border">الخصم</th>
                  <th className="px-2 py-2 border">الضريبة %</th>
                  <th className="px-2 py-2 border">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const subtotal = item.quantity * item.unitPrice - item.discount;
                  const taxVal = (subtotal * item.taxPercent) / 100;
                  const lineTotal = subtotal + taxVal;

                  return (
                    <tr key={item.id}>
                      <td className="border px-2 py-2">
                        <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded bg-red-500 text-white flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                      <td className="border px-2 py-2"><input value={item.itemLabel} onChange={(e) => updateItem(item.id, { itemLabel: e.target.value })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2 min-w-[220px]"><input value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2"><input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, { unitPrice: toNum(e.target.value) })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: toNum(e.target.value) })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2"><input type="number" value={item.discount} onChange={(e) => updateItem(item.id, { discount: toNum(e.target.value) })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2"><input type="number" value={item.taxPercent} onChange={(e) => updateItem(item.id, { taxPercent: toNum(e.target.value) })} className={`${INPUT_CLASS} h-9`} /></td>
                      <td className="border px-2 py-2 font-semibold whitespace-nowrap">{formatMoney(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={addItem} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> إضافة بند
            </button>
            <div className="text-sm space-y-1 text-right">
              <p>الإجمالي قبل الضريبة: <strong>{formatMoney(totals.subtotal)}</strong></p>
              <p>الضريبة: <strong>{formatMoney(totals.tax)}</strong></p>
              <p className="text-base">الإجمالي: <strong>{formatMoney(totals.total)}</strong></p>
            </div>
          </div>

          <Field label="ملاحظات">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${INPUT_CLASS} h-auto py-2 min-h-[88px]`} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function QuotationDetails({
  quotation,
  onBack,
  onEdit,
  onDownloadPdf,
}: {
  quotation: QuotationRow;
  onBack: () => void;
  onEdit: () => void;
  onDownloadPdf: (quotation: QuotationRow) => void;
}) {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-white px-4 py-3">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold flex items-center gap-2">
          العودة للقائمة <ArrowLeftRight className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">تفاصيل عرض السعر</h1>
        <div className="flex gap-2">
          <button onClick={() => onDownloadPdf(quotation)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold flex items-center gap-1.5">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button onClick={onEdit} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold flex items-center gap-1.5">
            <Edit className="h-4 w-4" /> تعديل
          </button>
        </div>
      </div>

      <QuotePreview quotation={quotation} />
    </div>
  );
}

function QuotePreview({ quotation }: { quotation: QuotationRow }) {
  const totals = calculateTotals(quotation.items);

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4 overflow-x-auto" dir="rtl">
      <div className="min-w-[760px] space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold">عرض سعر</h2>
            <p className="text-sm mt-1">الرقم {quotation.id || "-"}</p>
            <p className="text-sm">التاريخ {quotation.date || "-"}</p>
          </div>

          <div className="text-center text-sm leading-7">
            <h3 className="text-2xl font-bold">{COMPANY_INFO.nameAr}</h3>
            <p>السجل التجاري: {COMPANY_INFO.commercialNo}</p>
            <p>الرقم الضريبي: {COMPANY_INFO.vatNo}</p>
            <p>{COMPANY_INFO.city}</p>
          </div>

          <div className="text-left">
            <img src={COMPANY_LOGO_URL} alt="Company Logo" className="w-28 h-20 object-contain" />
            <p className="text-xs mt-1">{COMPANY_INFO.nameEn}</p>
          </div>
        </div>

        <div className="text-center text-xl leading-9">
          <p>العميل: {quotation.customer || "-"}</p>
          <p>الرقم الضريبي: {quotation.customerVat || "-"}</p>
          <p>العنوان: {quotation.customerAddress || "-"}</p>
        </div>

        <table className="w-full border-collapse text-lg">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-300 px-2 py-2">البند</th>
              <th className="border border-slate-300 px-2 py-2">الوصف</th>
              <th className="border border-slate-300 px-2 py-2">السعر</th>
              <th className="border border-slate-300 px-2 py-2">الكمية</th>
              <th className="border border-slate-300 px-2 py-2">الخصم</th>
              <th className="border border-slate-300 px-2 py-2">المجموع بدون الضريبة</th>
              <th className="border border-slate-300 px-2 py-2">نسبة الضريبة</th>
              <th className="border border-slate-300 px-2 py-2">قيمة الضريبة</th>
              <th className="border border-slate-300 px-2 py-2">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => {
              const lineSubtotal = item.quantity * item.unitPrice - item.discount;
              const lineTax = (lineSubtotal * item.taxPercent) / 100;
              const lineTotal = lineSubtotal + lineTax;

              return (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-2 py-2 text-center">{item.itemLabel || "-"}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{item.description || "-"}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatMoney(item.unitPrice)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{item.quantity}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatMoney(item.discount)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatMoney(lineSubtotal)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{item.taxPercent}%</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatMoney(lineTax)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-semibold">{formatMoney(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="max-w-md mr-auto text-2xl leading-10 border-t border-slate-300 pt-2">
          <div className="flex justify-between"><span>{formatMoney(totals.subtotal)}</span><span>الإجمالي قبل الضريبة</span></div>
          <div className="flex justify-between"><span>{formatMoney(totals.tax)}</span><span>القيمة المضافة %15</span></div>
          <div className="flex justify-between font-bold"><span>{formatMoney(totals.total)}</span><span>الإجمالي (﷼)</span></div>
          <div className="flex justify-between font-bold"><span>{formatMoney(totals.total)}</span><span>المستحق (﷼)</span></div>
        </div>

        <div className="pt-3 text-lg leading-8">
          <h4 className="font-bold">ملاحظات</h4>
          <p>{quotation.notes || "-"}</p>
          <h4 className="font-bold mt-2">البيانات البنكية</h4>
          <p>*اسم البنك : {COMPANY_INFO.bankName}</p>
          <p>*اسم المستفيد : {COMPANY_INFO.beneficiary}</p>
          <p>*رقم الحساب : {COMPANY_INFO.accountNo}</p>
          <p>*رقم الايبان : {COMPANY_INFO.iban}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs text-slate-500 font-semibold">{label}</label>
      {children}
    </div>
  );
}
