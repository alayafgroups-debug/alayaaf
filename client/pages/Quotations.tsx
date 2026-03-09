import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { salesFeatures } from "./Sales";
import {
  Plus,
  Search,
  X,
  Trash2,
  ArrowLeftRight,
  Edit,
  Eye,
  FileSpreadsheet,
  Save,
  FileText,
  Download,
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
  FormHeaderBar,
  FormCard,
  SectionHeader,
  AddItemBtn,
  TotalsSummary,
  PrimaryBtn,
  SecondaryBtn,
} from "@/components/SalesPageUI";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type QuotationRow = {
  id: string;
  date: string;
  validity: string;
  customer: string;
  total: string;
  status: string;
  statusColor: string;
  subStatus?: string;
  subStatusColor?: string;
};

const statusColors: Record<string, string> = {
  مفتوح: "bg-cyan-500 text-white",
  مغلق: "bg-green-600 text-white",
};

const mockQuotations: QuotationRow[] = [];

export default function Quotations() {
  const [view, setView] = useState<"list" | "create" | "details" | "edit">("list");
  const [quotations, setQuotations] = useState<QuotationRow[]>(mockQuotations);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRow | null>(null);

  useEffect(() => {
    const loadQuotations = async () => {
      const { data, error } = await supabase
        .from("sales_quotations")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        setQuotations(
          data.map((row) => ({
            id: row.id ?? "",
            date: row.date ?? "",
            validity: row.validity ?? row.valid_until ?? "",
            customer: row.customer ?? "",
            total: row.total ?? "",
            status: row.status ?? "مفتوح",
            statusColor:
              statusColors[row.status ?? "مفتوح"] ??
              "bg-cyan-500 text-white",
            subStatus: row.sub_status ?? row.subStatus,
            subStatusColor: row.sub_status_color ?? row.subStatusColor,
          }))
        );
      }
    };

    loadQuotations();
  }, []);

  const handleSaved = (quotation: QuotationRow) => {
    setQuotations((prev) => [quotation, ...prev]);
  };

  const handleUpdated = (quotation: QuotationRow) => {
    setQuotations((prev) =>
      prev.map((row) => (row.id === quotation.id ? quotation : row))
    );
  };

  const handleDelete = async (quotationId: string) => {
    const { error } = await supabase
      .from("sales_quotations")
      .delete()
      .eq("id", quotationId);

    if (!error) {
      setQuotations((prev) => prev.filter((row) => row.id !== quotationId));
      toast({ title: "تم حذف عرض السعر", description: `العرض: ${quotationId}` });
    } else {
      toast({ title: "تعذر حذف عرض السعر", description: "يرجى المحاولة لاحقاً" });
    }
  };

  const handleDownloadPdf = (quotation: QuotationRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const parseCurrency = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

    const storedItems = localStorage.getItem(`sales-quotation-items-${quotation.id}`);
    const parsedItems = storedItems
      ? (JSON.parse(storedItems) as Array<{
          id: number;
          description: string;
          unit: string;
          quantity: number;
          price: number;
          discount: number;
          taxPercent: number;
        }>)
      : [];

    const fallbackTotal = parseCurrency(quotation.total);
    const items =
      parsedItems.length > 0
        ? parsedItems
        : [
            {
              id: 1,
              description: "-",
              unit: "-",
              quantity: 1,
              price: fallbackTotal,
              discount: 0,
              taxPercent: 0,
            },
          ];

    const calculated = items.map((item) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        ...item,
        lineSubtotal,
        tax,
        lineTotal,
      };
    });

    const totals = calculated.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + item.lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + item.tax,
        total: acc.total + item.lineTotal,
      }),
      { subtotal: 0, discount: 0, tax: 0, total: 0 }
    );

    const rowsHtml = calculated
      .map(
        (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${escapeHtml(item.description || "-")}</td>
            <td>${escapeHtml(item.unit || "-")}</td>
            <td>${item.quantity}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${item.discount.toFixed(2)}</td>
            <td>${item.taxPercent}%</td>
            <td>${item.lineTotal.toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>عرض سعر ${quotation.id}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: 'Cairo', Arial, sans-serif;
              color: #0f172a;
              background: #f8fafc;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background: white;
              border: 1px solid #e2e8f0;
              padding: 22px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 18px;
            }
            .title {
              font-size: 30px;
              font-weight: 700;
              margin: 0;
            }
            .sub-title {
              margin: 4px 0 0;
              color: #64748b;
              font-size: 14px;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 999px;
              background: #e0f2fe;
              color: #0369a1;
              font-size: 12px;
              font-weight: 700;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            }
            .meta-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 12px;
            }
            .label {
              color: #64748b;
              font-size: 12px;
              margin-bottom: 4px;
            }
            .value {
              font-size: 16px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px;
              text-align: right;
              font-size: 13px;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              font-weight: 700;
            }
            .totals {
              width: 320px;
              margin-inline-start: auto;
              margin-top: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 7px;
              font-size: 13px;
            }
            .total-final {
              border-top: 1px solid #e2e8f0;
              margin-top: 8px;
              padding-top: 10px;
              font-size: 16px;
              font-weight: 700;
              color: #1d4ed8;
            }
            @media print {
              body { background: white; padding: 0; }
              .page { border: 0; width: 100%; min-height: auto; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <h1 class="title">تفاصيل عرض السعر</h1>
                <p class="sub-title">Quotation Details</p>
              </div>
              <div class="badge">${escapeHtml(quotation.status)}</div>
            </div>

            <div class="meta">
              <div class="meta-card">
                <div class="label">رقم العرض</div>
                <div class="value">${escapeHtml(quotation.id)}</div>
              </div>
              <div class="meta-card">
                <div class="label">العميل</div>
                <div class="value">${escapeHtml(quotation.customer || "-")}</div>
              </div>
              <div class="meta-card">
                <div class="label">تاريخ العرض</div>
                <div class="value">${escapeHtml(quotation.date)}</div>
              </div>
              <div class="meta-card">
                <div class="label">تاريخ الصلاحية</div>
                <div class="value">${escapeHtml(quotation.validity)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>وصف البند</th>
                  <th>الوحدة</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>الخصم</th>
                  <th>الضريبة</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>المجموع الفرعي</span>
                <span>${totals.subtotal.toFixed(2)} ريال</span>
              </div>
              <div class="total-row">
                <span>الخصم</span>
                <span>${totals.discount.toFixed(2)} ريال</span>
              </div>
              <div class="total-row">
                <span>الضريبة</span>
                <span>${totals.tax.toFixed(2)} ريال</span>
              </div>
              <div class="total-row total-final">
                <span>الإجمالي</span>
                <span>${totals.total.toFixed(2)} ريال</span>
              </div>
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
            quotations={quotations}
          />
        )}
        {view === "create" && (
          <QuotationForm onBack={() => setView("list")} onSaved={handleSaved} />
        )}
        {view === "details" && selectedQuotation && (
          <QuotationDetails
            quotation={selectedQuotation}
            onBack={() => setView("list")}
          />
        )}
        {view === "edit" && selectedQuotation && (
          <QuotationEdit
            quotation={selectedQuotation}
            onBack={() => setView("list")}
            onUpdated={handleUpdated}
          />
        )}
      </div>
    </Layout>
  );
}

function QuotationsList({
  onCreateClick,
  onView,
  onEdit,
  onDelete,
  onDownloadPdf,
  quotations,
}: {
  onCreateClick: () => void;
  onView: (quotation: QuotationRow) => void;
  onEdit: (quotation: QuotationRow) => void;
  onDelete: (quotationId: string) => void;
  onDownloadPdf: (quotation: QuotationRow) => void;
  quotations: QuotationRow[];
}) {

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={FileSpreadsheet}
        title="عروض الأسعار"
        subtitle="إدارة وتتبع جميع عروض الأسعار"
        actionLabel="إضافة عرض سعر جديد"
        onAction={onCreateClick}
        gradient="from-blue-600 to-indigo-700"
      />

      {/* Filters */}
      <FilterBar>
        <FilterInput label="البحث" placeholder="رقم العرض، المرجع، اسم العميل..." colSpan={2} />
        <FilterSelect label="العميل" options={["الكل"]} />
        <FilterSelect label="الحالة" options={["الكل", "مفتوح", "مغلق"]} />
        <FilterActions />
      </FilterBar>

      {/* Table */}
      <DataTable
        headers={["الإجراءات", "الحالة", "الإجمالي", "العميل", "تاريخ الصلاحية", "تاريخ العرض", "رقم العرض"]}
        gradient="from-[#1e293b] to-[#334155]"
      >
        {quotations.map((quo, i) => (
          <tr
            key={quo.id}
            className={cn("hover:bg-muted/30 transition-colors", i % 2 !== 0 && "bg-muted/10")}
          >
            <td className="px-5 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn icon={Eye} label="عرض" color="blue" onClick={() => onView(quo)} />
                <ActionBtn icon={Edit} label="تعديل" color="emerald" onClick={() => onEdit(quo)} />
                <ActionBtn icon={ArrowLeftRight} label="تحويل" color="amber" />
                <ActionBtn icon={Download} label="PDF" color="slate" onClick={() => onDownloadPdf(quo)} />
                <ActionBtn icon={Trash2} label="حذف" color="red" onClick={() => onDelete(quo.id)} />
              </div>
            </td>
            <td className="px-5 py-3.5 align-middle text-right space-y-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap",
                  quo.status === "مفتوح"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
              >
                {quo.status}
              </span>
              {quo.subStatus && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-bold whitespace-nowrap block mt-1",
                    quo.subStatusColor
                  )}
                >
                  {quo.subStatus}
                </span>
              )}
            </td>
            <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap font-bold text-primary">
              {quo.total}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-foreground font-medium">
              {quo.customer}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {quo.validity}
            </td>
            <td className="px-5 py-3.5 align-middle text-right text-muted-foreground text-[13px]">
              {quo.date}
            </td>
            <td className="px-5 py-3.5 align-middle text-right font-bold text-primary hover:underline cursor-pointer">
              {quo.id}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function QuotationDetails({
  quotation,
  onBack,
}: {
  quotation: QuotationRow;
  onBack: () => void;
}) {
  const [lineItems, setLineItems] = useState<
    Array<{
      id: number;
      description: string;
      unit: string;
      quantity: number;
      price: number;
      discount: number;
      taxPercent: number;
      lineTotal: number;
    }>
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem(
      `sales-quotation-items-${quotation.id}`
    );
    if (stored) {
      const parsed = JSON.parse(stored) as Array<{
        id: number;
        description: string;
        unit: string;
        quantity: number;
        price: number;
        discount: number;
        taxPercent: number;
      }>;

      const mapped = parsed.map((item) => {
        const lineSubtotal = item.quantity * item.price - item.discount;
        const tax = (lineSubtotal * item.taxPercent) / 100;
        return {
          ...item,
          lineTotal: lineSubtotal + tax,
        };
      });
      setLineItems(mapped);
    }
  }, [quotation.id]);

  const totals = lineItems.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineSubtotal + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">تفاصيل عرض السعر</h1>
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">بيانات العرض</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">رقم العرض</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {quotation.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">العميل</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {quotation.customer}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ العرض</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {quotation.date}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ الصلاحية</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {quotation.validity}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">الإجمالي</label>
              <div className="text-base text-sm font-bold text-foreground text-right">
                {quotation.total}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">بنود العرض</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 border border-slate-200">#</th>
                  <th className="px-3 py-2 border border-slate-200">الوصف</th>
                  <th className="px-3 py-2 border border-slate-200">الوحدة</th>
                  <th className="px-3 py-2 border border-slate-200">الكمية</th>
                  <th className="px-3 py-2 border border-slate-200">السعر</th>
                  <th className="px-3 py-2 border border-slate-200">الخصم</th>
                  <th className="px-3 py-2 border border-slate-200">الضريبة</th>
                  <th className="px-3 py-2 border border-slate-200">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 border border-slate-200">{item.id}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.description}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.unit}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.quantity}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.price.toFixed(2)}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.discount.toFixed(2)}</td>
                    <td className="px-3 py-2 border border-slate-200">{item.taxPercent}%</td>
                    <td className="px-3 py-2 border border-slate-200">{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-end mt-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.tax.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-blue-600">
                    {totals.total.toFixed(2)} ريال
                  </span>
                  <span className="font-bold text-slate-800">الإجمالي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotationEdit({
  quotation,
  onBack,
  onUpdated,
}: {
  quotation: QuotationRow;
  onBack: () => void;
  onUpdated: (quotation: QuotationRow) => void;
}) {
  const [reference, setReference] = useState("");
  const [validity, setValidity] = useState(quotation.validity);
  const [date, setDate] = useState(quotation.date);
  const [customer, setCustomer] = useState(quotation.customer);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState(
    () =>
      JSON.parse(
        localStorage.getItem(`sales-quotation-items-${quotation.id}`) || "null"
      ) || [
        {
          id: 1,
          description: "",
          unit: "",
          quantity: 1,
          price: 0,
          discount: 0,
          taxPercent: 15,
        },
      ]
  );

  const handleAddItem = () => {
    setItems((prev: typeof items) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        unit: "",
        quantity: 1,
        price: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev: typeof items) =>
      prev.map((item: (typeof items)[number]) =>
        item.id === id ? { ...item, ...changes } : item
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev: typeof items) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (acc: { subtotal: number; discount: number; tax: number; total: number }, item: (typeof items)[number]) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    const payload = {
      date,
      validity,
      customer,
      total: `ريال ${totals.total.toFixed(2)}`,
      status: quotation.status,
    };

    const { data, error } = await supabase
      .from("sales_quotations")
      .update(payload)
      .eq("id", quotation.id)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-quotation-items-${quotation.id}`,
        JSON.stringify(items)
      );
      onUpdated({
        id: data.id ?? quotation.id,
        date: data.date ?? date,
        validity: data.validity ?? validity,
        customer: data.customer ?? customer,
        total: data.total ?? payload.total,
        status: data.status ?? quotation.status,
        statusColor: statusColors[data.status ?? quotation.status] ?? "bg-cyan-500 text-white",
      });
      toast({ title: "تم تحديث عرض السعر", description: `العرض: ${quotation.id}` });
      onBack();
    } else {
      toast({ title: "تعذر تحديث عرض السعر", description: "يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center rounded-2xl bg-white border border-border/50 shadow-sm px-6 py-4 animate-fade-in-up">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border-2 border-border/60 bg-white text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">تعديل عرض السعر</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
        >
          حفظ التعديلات
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-end gap-2">
            <h2 className="text-sm font-bold text-foreground">معلومات العرض</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ العرض</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">تاريخ الصلاحية</label>
              <input
                type="date"
                value={validity}
                onChange={(event) => setValidity(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[12px] font-semibold text-muted-foreground block text-right">العميل</label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <h2 className="text-sm font-bold text-foreground">بنود العرض</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-16 text-center"></th>
                  <th className="pb-2 font-medium w-32">الإجمالي</th>
                  <th className="pb-2 font-medium w-32">الضريبة</th>
                  <th className="pb-2 font-medium w-24">خصم</th>
                  <th className="pb-2 font-medium w-32">السعر *</th>
                  <th className="pb-2 font-medium w-24">الكمية *</th>
                  <th className="pb-2 font-medium w-32">الوحدة</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: (typeof items)[number]) => {
                  const lineSubtotal = item.quantity * item.price - item.discount;
                  const lineTax = (lineSubtotal * item.taxPercent) / 100;
                  const lineTotal = lineSubtotal + lineTax;

                  return (
                    <tr key={item.id}>
                      <td className="pt-4 align-top">
                        <div className="flex items-center justify-center gap-1 h-10">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          value={lineTotal.toFixed(2)}
                          disabled
                          className="w-full px-2 py-2 border border-border/40 bg-muted/30 rounded-xl text-sm text-right outline-none h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.taxPercent}
                          onChange={(event) =>
                            updateItem(item.id, {
                              taxPercent: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(event) =>
                            updateItem(item.id, {
                              discount: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(event) =>
                            updateItem(item.id, {
                              price: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, {
                              quantity: Number(event.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 px-1 align-top">
                        <input
                          type="text"
                          placeholder="اكتب الوحدة..."
                          value={item.unit}
                          onChange={(event) =>
                            updateItem(item.id, {
                              unit: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                        />
                      </td>
                      <td className="pt-4 pl-1 align-top min-w-[320px]">
                        <textarea
                          rows={3}
                          placeholder="اكتب وصف البند..."
                          value={item.description}
                          onChange={(event) =>
                            updateItem(item.id, {
                              description: event.target.value,
                            })
                          }
                          className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-slate-200 pt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.tax.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-emerald-600">
                    {totals.total.toFixed(2)} ريال
                  </span>
                  <span className="font-bold text-slate-800">الإجمالي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotationForm({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (quotation: QuotationRow) => void;
}) {
  const [quotationNumber, setQuotationNumber] = useState("");
  const [reference, setReference] = useState("");
  const [validity, setValidity] = useState("");
  const [date, setDate] = useState("");
  const [customer, setCustomer] = useState("");
  const customerOptions = ["فندي بن سالم", "فندي كوزوبد", "شركة لاكجري العياف"];
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    {
      id: 1,
      description: "",
      unit: "",
      quantity: 1,
      price: 0,
      discount: 0,
      taxPercent: 15,
    },
  ]);

  useEffect(() => {
    const loadDefaults = async () => {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);

      setDate(today.toISOString().split("T")[0]);
      setValidity(nextMonth.toISOString().split("T")[0]);

      const { data } = await supabase
        .from("sales_quotations")
        .select("id")
        .like("id", "QUO-%")
        .order("id", { ascending: false })
        .limit(1);

      const latestId = data?.[0]?.id ?? "QUO-000099";
      const latestNumber = Number(String(latestId).split("-")[1] ?? "99");
      const nextNumber = `QUO-${String(latestNumber + 1).padStart(6, "0")}`;
      setQuotationNumber(nextNumber);
    };

    void loadDefaults();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        description: "",
        unit: "",
        quantity: 1,
        price: 0,
        discount: 0,
        taxPercent: 15,
      },
    ]);
  };

  const updateItem = (id: number, changes: Partial<(typeof items)[number]>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = items.reduce(
    (acc, item) => {
      const lineSubtotal = item.quantity * item.price - item.discount;
      const tax = (lineSubtotal * item.taxPercent) / 100;
      const lineTotal = lineSubtotal + tax;
      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + item.discount,
        tax: acc.tax + tax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSave = async () => {
    const quotationId = quotationNumber || `QUO-${Date.now()}`;
    const payload = {
      id: quotationId,
      date,
      validity,
      customer,
      total: `ريال ${totals.total.toFixed(2)}`,
      status: "مفتوح",
    };

    const { data, error } = await supabase
      .from("sales_quotations")
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem(
        `sales-quotation-items-${data.id ?? quotationId}`,
        JSON.stringify(items)
      );
      onSaved({
        id: data.id ?? quotationId,
        date: data.date ?? date,
        validity: data.validity ?? validity,
        customer: data.customer ?? customer,
        total: data.total ?? payload.total,
        status: data.status ?? "مفتوح",
        statusColor: statusColors[data.status ?? "مفتوح"] ?? "bg-cyan-500 text-white",
      });
      toast({ title: "تم حفظ عرض السعر", description: `العرض: ${data.id ?? quotationId}` });
      onBack();
    } else {
      toast({ title: "تعذر حفظ عرض السعر", description: "يرجى المحاولة لاحقاً" });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-border/50 shadow-sm px-4 py-3 animate-fade-in-up">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/30"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#51314f] px-4 py-2 text-sm font-bold text-white"
          >
            حفظ
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            حفظ ثم إرسال
          </button>
        </div>

        <h1 className="text-lg font-extrabold text-foreground">إنشاء عرض سعر</h1>

        <button
          onClick={onBack}
          className="rounded-lg border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-muted-foreground"
        >
          العودة للقائمة
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="h-16 w-16 rounded-lg bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center text-center">
              شركة لاكجري العياف
            </div>
            <div>
              <p className="text-base font-bold text-foreground">شركة لاكجري العياف</p>
              <p className="text-xs text-muted-foreground mt-1">الشارع رقم 20</p>
              <p className="text-xs text-muted-foreground">المملكة العربية السعودية</p>
              <p className="text-xs text-muted-foreground">315597905300003 : الرقم الضريبي</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">رقم عرض السعر</label>
                <input
                  type="text"
                  value={quotationNumber}
                  readOnly
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-muted/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">العميل</label>
                <select
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right bg-white"
                >
                  <option value="">اختر العميل</option>
                  {customerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">تاريخ العرض</label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">تاريخ الصلاحية</label>
                <input
                  type="date"
                  value={validity}
                  onChange={(event) => setValidity(event.target.value)}
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">أمر الشراء</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="اختياري"
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground text-right block">المشروع</label>
                <input
                  type="text"
                  placeholder="اختياري"
                  className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-muted-foreground text-right block">المرجع</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="وصف العرض، تعليمات، مرجع داخلي..."
                className="w-full px-3 py-2 border border-border/60 rounded-lg text-sm text-right resize-none"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-2xl bg-white border border-border/50 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-emerald-500/20 hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">بنود العرض</h2>
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-right mb-4">
              <thead>
                <tr className="text-slate-600 border-b border-slate-200">
                  <th className="pb-2 font-medium w-32">الإجمالي</th>
                  <th className="pb-2 font-medium w-48">نوع الضريبة</th>
                  <th className="pb-2 font-medium w-24">خصم</th>
                  <th className="pb-2 font-medium w-32">السعر *</th>
                  <th className="pb-2 font-medium w-24">الكمية *</th>
                  <th className="pb-2 font-medium w-32">الوحدة</th>
                  <th className="pb-2 font-medium w-[320px]">وصف البند *</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="pt-4 align-top">
                      <div className="flex items-center justify-end gap-2 h-10">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <select
                        value={item.taxPercent}
                        onChange={(event) =>
                          updateItem(item.id, {
                            taxPercent: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      >
                        <option value={15}>ضريبة 15% (15.0000%)</option>
                        <option value={0}>معفاة (0%)</option>
                      </select>
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(event) =>
                          updateItem(item.id, {
                            discount: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(event) =>
                          updateItem(item.id, {
                            price: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Number(event.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 px-1 align-top">
                      <input
                        type="text"
                        placeholder="اكتب الوحدة..."
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(item.id, {
                            unit: event.target.value,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-10"
                      />
                    </td>
                    <td className="pt-4 pl-1 align-top min-w-[320px]">
                      <textarea
                        rows={3}
                        placeholder="اكتب وصف البند..."
                        value={item.description}
                        onChange={(event) =>
                          updateItem(item.id, {
                            description: event.target.value,
                          })
                        }
                        className="w-full px-2 py-2 border border-border/60 rounded-xl text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[88px] resize-y"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals */}
            <div className="border-t border-slate-200 pt-4 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-sm font-bold text-foreground">
                    {totals.tax.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الضريبة</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                  <span className="font-bold text-blue-600">
                    {totals.total.toFixed(2)} ريال
                  </span>
                  <span className="font-bold text-slate-800">الإجمالي</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShoppingCart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
