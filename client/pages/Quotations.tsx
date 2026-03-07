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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <h1>عروض الأسعار</h1>
        </div>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 bg-[#1b8c56] text-white px-4 py-2 rounded-md hover:bg-[#157347] transition-colors font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          إضافة عرض سعر جديد
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm text-slate-600 text-right block">
            البحث
          </label>
          <input
            type="text"
            placeholder="رقم العرض، المرجع، اسم العميل..."
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right"
            dir="rtl"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            العميل
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600 text-right block">
            الحالة
          </label>
          <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-right bg-white appearance-none text-slate-700">
            <option>الكل</option>
          </select>
        </div>
        <div className="md:col-span-4 flex items-center justify-start gap-2 pt-2">
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm">
            <X className="h-4 w-4" />
            إعادة تعيين
          </button>
          <button className="inline-flex items-center gap-2 bg-white border border-slate-300 text-primary px-6 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium">
            <Search className="h-4 w-4" />
            بحث
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-[#222831] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold text-right">الإجراءات</th>
              <th className="px-4 py-3 font-semibold text-right">الحالة</th>
              <th className="px-4 py-3 font-semibold text-right">الإجمالي</th>
              <th className="px-4 py-3 font-semibold text-right">العميل</th>
              <th className="px-4 py-3 font-semibold text-right">
                تاريخ الصلاحية
              </th>
              <th className="px-4 py-3 font-semibold text-right">تاريخ العرض</th>
              <th className="px-4 py-3 font-semibold text-right">رقم العرض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {quotations.map((quo, i) => (
              <tr
                key={quo.id}
                className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
              >
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      title="عرض عرض السعر"
                      onClick={() => onView(quo)}
                      className="p-1.5 text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      title="تعديل عرض السعر"
                      onClick={() => onEdit(quo)}
                      className="p-1.5 text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-amber-700 border border-amber-200 rounded hover:bg-amber-50 transition-colors text-xs font-semibold">
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      تحويل إلى فاتورة مبيعات
                    </button>
                    <button
                      title="تحميل PDF"
                      onClick={() => onDownloadPdf(quo)}
                      className="px-2 py-1.5 text-slate-600 border border-slate-300 rounded hover:bg-slate-100 transition-colors text-xs font-semibold"
                    >
                      تحميل PDF
                    </button>
                    <button
                      title="حذف عرض السعر"
                      onClick={() => onDelete(quo.id)}
                      className="p-1.5 text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle text-right space-y-1">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap",
                      quo.statusColor
                    )}
                  >
                    {quo.status === "مغلق" ? (
                      <span className="h-2 w-2 bg-white rounded-full ml-1" />
                    ) : (
                      <FileSpreadsheet className="h-3 w-3 ml-1" />
                    )}
                    {quo.status}
                  </div>
                  {quo.subStatus && (
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap block mt-1",
                        quo.subStatusColor
                      )}
                    >
                      <ShoppingCart className="h-3 w-3 ml-1" />
                      {quo.subStatus}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                  {quo.total}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  {quo.customer}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {quo.validity}
                </td>
                <td className="px-4 py-3 align-middle text-right text-slate-600">
                  {quo.date}
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium text-blue-600 hover:underline cursor-pointer">
                  {quo.id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تفاصيل عرض السعر</h1>
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">بيانات العرض</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">رقم العرض</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {quotation.id}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">العميل</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {quotation.customer}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">تاريخ العرض</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {quotation.date}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">تاريخ الصلاحية</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {quotation.validity}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">الإجمالي</label>
              <div className="text-base font-semibold text-slate-800 text-right">
                {quotation.total}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">بنود العرض</h2>
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
                  <span className="font-semibold text-slate-800">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
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
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">تعديل عرض السعر</h1>
          <Edit className="h-5 w-5 text-emerald-600" />
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
        >
          حفظ التعديلات
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">معلومات العرض</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">تاريخ العرض</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600 block text-right">تاريخ الصلاحية</label>
              <input
                type="date"
                value={validity}
                onChange={(event) => setValidity(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm text-slate-600 block text-right">العميل</label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <h2 className="font-semibold text-slate-800">بنود العرض</h2>
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
                            className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
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
                          className="w-full px-2 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-right outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-10"
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
                          className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[88px] resize-y"
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
                  <span className="font-semibold text-slate-800">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
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
  const [reference, setReference] = useState("");
  const [validity, setValidity] = useState("2026-04-04");
  const [date, setDate] = useState("2026-03-05");
  const [customer, setCustomer] = useState("");
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
    const quotationId = `QT-${Date.now()}`;
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
    <div className="space-y-6 bg-slate-50 min-h-screen pb-12">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-500 text-white text-sm font-medium rounded hover:bg-slate-600 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            حفظ العرض
          </button>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">
            إضافة عرض سعر جديد
          </h1>
          <Plus className="h-5 w-5 text-blue-600" />
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          العودة للقائمة
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-end gap-2">
            <h2 className="font-semibold text-slate-800">
              معلومات العرض الأساسية
            </h2>
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                مرجع العرض
              </label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="أدخل مرجع العرض (اختياري)"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العملة
              </label>
              <input
                type="text"
                defaultValue="SAR"
                disabled
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded text-sm text-center text-slate-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                الحالة
              </label>
              <div className="w-full px-3 py-2 border border-slate-300 rounded bg-white flex justify-center">
                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-medium">
                  مفتوح
                </span>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                الحالة تتغير تلقائياً
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ الصلاحية <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={validity}
                onChange={(event) => setValidity(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 text-right block">
                تاريخ العرض <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                العميل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="اكتب اسم العميل..."
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium text-slate-700 text-right block">
                ملاحظات
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="أدخل ملاحظات إضافية"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <button
              onClick={handleAddItem}
              className="bg-[#1b8c56] text-white px-3 py-1 rounded text-sm font-medium hover:bg-[#157347] flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              إضافة بند
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-800">بنود العرض</h2>
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
                          className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-10"
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
                        className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[88px] resize-y"
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
                  <span className="font-semibold text-slate-800">
                    {totals.subtotal.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">المجموع الفرعي</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
                    {totals.discount.toFixed(2)} ريال
                  </span>
                  <span className="text-slate-600">الخصم</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-800">
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
