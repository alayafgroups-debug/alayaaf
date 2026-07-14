import Layout from "@/components/Layout";
import { Plus, Search, Filter, Eye, Pencil, Trash2, Save, X, Printer } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import ChartOfAccountsTree from "@/components/chart-of-accounts/ChartOfAccountsTree";

const COMPANY_LOGO_URL =
  "https://cdn.builder.io/api/v1/image/assets%2Fce04605038104603b965d31c7c18e8db%2Ff22198e2793344a8afcb99b315ddbc49?format=webp&width=800&height=1200";

type VoucherRow = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  department: string;
  approvedBy: string;
  totalAmount: string;
  status: string;
};

type PettyCashRow = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  beneficiaryName: string;
  purpose: string;
  amount: string;
  paidBy: string;
  receivedBy: string;
  status: string;
};

type VoucherItemForm = {
  id?: string;
  description: string;
  accountCode: string;
  amount: string;
};

type VoucherForm = {
  id?: string;
  voucherNumber: string;
  voucherDate: string;
  description: string;
  department: string;
  approvedBy: string;
  items: VoucherItemForm[];
};

type VoucherViewData = VoucherRow & { items: VoucherItemForm[] };
type PettyCashViewData = PettyCashRow;

type PettyCashForm = {
  id?: string;
  voucherNumber: string;
  voucherDate: string;
  beneficiaryName: string;
  purpose: string;
  amount: string;
  paidBy: string;
  receivedBy: string;
};


const mapVoucherRow = (row: Record<string, unknown>): VoucherRow => ({
  id: String(row.id ?? ""),
  voucherNumber: String(row.voucher_number ?? ""),
  voucherDate: String(row.voucher_date ?? ""),
  description: String(row.description ?? ""),
  department: String(row.department ?? ""),
  approvedBy: String(row.approved_by ?? ""),
  totalAmount: String(row.total_amount ?? "0.00"),
  status: String(row.status ?? "مسودة"),
});

const mapPettyCashRow = (row: Record<string, unknown>): PettyCashRow => ({
  id: String(row.id ?? ""),
  voucherNumber: String(row.voucher_number ?? ""),
  voucherDate: String(row.voucher_date ?? ""),
  beneficiaryName: String(row.beneficiary_name ?? ""),
  purpose: String(row.purpose ?? ""),
  amount: String(row.amount ?? "0.00"),
  paidBy: String(row.paid_by ?? ""),
  receivedBy: String(row.received_by ?? ""),
  status: String(row.status ?? "قيد المراجعة"),
});

const getEmptyVoucherForm = (): VoucherForm => ({
  id: undefined,
  voucherNumber: "",
  voucherDate: new Date().toISOString().split("T")[0],
  description: "",
  department: "",
  approvedBy: "",
  items: [{ description: "", accountCode: "", amount: "" }],
});

const getEmptyPettyCashForm = (): PettyCashForm => ({
  id: undefined,
  voucherNumber: "",
  voucherDate: new Date().toISOString().split("T")[0],
  beneficiaryName: "",
  purpose: "",
  amount: "",
  paidBy: "",
  receivedBy: "",
});


export default function ExpenseManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const isVouchers = location.pathname.includes("/expenses/vouchers");
  const isPettyCash = location.pathname.includes("/expenses/petty-cash");
  const isReports = location.pathname.includes("/expenses/reports");

  const [voucherRows, setVoucherRows] = useState<VoucherRow[]>([]);
  const [pettyCashRows, setPettyCashRows] = useState<PettyCashRow[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [voucherView, setVoucherView] = useState<VoucherViewData | null>(null);
  const [pettyCashView, setPettyCashView] = useState<PettyCashViewData | null>(null);
  const [voucherForm, setVoucherForm] = useState<VoucherForm>(getEmptyVoucherForm());
  const [pettyCashForm, setPettyCashForm] = useState<PettyCashForm>(getEmptyPettyCashForm());

  useEffect(() => {
    void Promise.allSettled([loadVouchers(), loadPettyCash()]);
  }, [isVouchers, isPettyCash, isReports]);

  const loadVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_vouchers")
        .select("*")
        .order("voucher_date", { ascending: false });

      if (!error && data) {
        setVoucherRows(data.map((row) => mapVoucherRow(row as Record<string, unknown>)));
      } else {
        setVoucherRows([]);
      }
    } catch (e) {
      setVoucherRows([]);
    }
  };

  const loadPettyCash = async () => {
    try {
      const { data, error } = await supabase
        .from("petty_cash_vouchers")
        .select("*")
        .order("voucher_date", { ascending: false });

      if (!error && data) {
        setPettyCashRows(data.map((row) => mapPettyCashRow(row as Record<string, unknown>)));
      } else {
        setPettyCashRows([]);
      }
    } catch (e) {
      setPettyCashRows([]);
    }
  };

  const loadVoucherItems = async (voucherId: string): Promise<VoucherItemForm[]> => {
    const { data, error } = await supabase
      .from("expense_voucher_items")
      .select("id, item_description, account_code, amount")
      .eq("voucher_id", voucherId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((item) => ({
      id: String(item.id ?? ""),
      description: String(item.item_description ?? ""),
      accountCode: String(item.account_code ?? ""),
      amount: String(item.amount ?? "0"),
    }));
  };

  const handlePrintVoucher = async (row: VoucherRow) => {
    const items = await loadVoucherItems(row.id);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const escHtml = (v: unknown) => String(v ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const total = items.reduce((s, i) => s + (Number.parseFloat(i.amount || "0") || 0), 0);
    const rowsHtml = items.map((item, idx) => `<tr><td>${idx + 1}</td><td style="text-align:right">${escHtml(item.description || "-")}</td><td>${escHtml(item.accountCode || "-")}</td><td style="font-weight:700">${(Number.parseFloat(item.amount || "0") || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>\u0633\u0646\u062f \u0635\u0631\u0641 ${escHtml(row.voucherNumber)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#111827;font-family:Arial,Tahoma,sans-serif}.voucher{width:100%;min-height:175mm;border:1px solid #d1d5db;padding:14mm 15mm 10mm;position:relative;background:#fff}.header{display:grid;grid-template-columns:150px 1fr 190px;align-items:start;gap:20px}.logo{width:135px;height:90px;object-fit:contain}.company{text-align:right}.company h2{margin:0;font-size:22px}.company p{margin:4px 0;color:#475569;font-size:11px;line-height:1.6}.voucher-title{text-align:center}.voucher-title h1{font-size:29px;margin:0}.en{font-size:14px;font-weight:700;letter-spacing:1.8px;border-bottom:2px solid #dc2626;padding:4px 12px;display:inline-block}.number{margin-top:10px;color:#dc2626;font-size:24px;font-weight:800;letter-spacing:2px}.date-row{display:flex;justify-content:space-between;margin:14px 0 6px;font-size:12px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;margin-bottom:10px}.label{color:#64748b;font-size:11px}.line-val{font-weight:700;border-bottom:1px solid #94a3b8;padding-bottom:3px}.line{display:grid;grid-template-columns:165px 1fr 165px;gap:8px;align-items:end;margin:10px 0;font-size:13px}.label-ar{font-weight:700}.label-en{text-align:left;font-weight:700;direction:ltr}.vbox{min-height:25px;border-bottom:1px solid #64748b;padding:3px 8px;text-align:center;font-weight:700}table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:8px}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:center}th{background:#f1f5f9;font-weight:700}.total-row{background:#fef2f2;font-weight:700;color:#dc2626}.amt-box{float:left;margin-top:8px;border:2px solid #dc2626;border-radius:6px;padding:9px 18px;color:#dc2626;font-size:18px;font-weight:800}.sigs{display:grid;grid-template-columns:repeat(4,1fr);gap:40px;margin-top:30px;text-align:center}.sig strong{display:block;font-size:13px}.sig small{display:block;color:#64748b}.sig .sl{border-bottom:1px solid #94a3b8;height:38px}.footer{position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(90deg,#dc2626,#0f766e)}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.voucher{border:0}}</style></head><body><section class="voucher"><div class="header"><img class="logo" src="${COMPANY_LOGO_URL}" alt="logo"><div class="voucher-title"><h1>\u0633\u0646\u062f \u0635\u0631\u0641</h1><div class="en">PAYMENT VOUCHER</div><div class="number">${escHtml(row.voucherNumber)}</div></div><div class="company"><h2>\u0634\u0631\u0643\u0629 \u0644\u0627\u0643\u062c\u0631\u064a \u0627\u0644\u0639\u064a\u0627\u0641</h2><p>Luxury Al Ayaf Company<br>\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629<br>VAT No. 314559705300003</p></div></div><div class="date-row"><span><b>\u0627\u0644\u062a\u0627\u0631\u064a\u062e / Date:</b> ${escHtml(row.voucherDate)}</span><span><b>\u0647\u0640 / H &nbsp; \u0631\u064a\u0627\u0644 / S.R. SAR</b></span></div><div class="meta"><div><div class="label">\u0635\u0631\u0641 \u0625\u0644\u0649 / Pay to (\u0642\u0633\u0645):</div><div class="line-val">${escHtml(row.department || "-")}</div></div><div><div class="label">\u0627\u0639\u062a\u0645\u062f \u0645\u0646 / Approved by:</div><div class="line-val">${escHtml(row.approvedBy || "-")}</div></div></div><div class="line"><span class="label-ar">\u0627\u0644\u0628\u064a\u0627\u0646 / Description:</span><div class="vbox">${escHtml(row.description || "-")}</div><span class="label-en">Being / Details</span></div><table><thead><tr><th>#</th><th style="text-align:right">\u0627\u0644\u0628\u0646\u062f / Item</th><th>\u0627\u0644\u062d\u0633\u0627\u0628 / Account</th><th>\u0627\u0644\u0645\u0628\u0644\u063a / Amount</th></tr></thead><tbody>${rowsHtml || "<tr><td colspan='4'>-</td></tr>"}<tr class='total-row'><td colspan='3'>\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a / Total</td><td>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</td></tr></tbody></table><div class="amt-box">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</div><div class="sigs"><div class="sig"><strong>\u0627\u0644\u0645\u062d\u0627\u0633\u0628</strong><small>Accountant</small><div class="sl"></div></div><div class="sig"><strong>\u0645\u062f\u064a\u0631 \u0645\u0627\u0644\u064a</strong><small>Finance Manager</small><div class="sl"></div></div><div class="sig"><strong>\u0645\u0639\u062a\u0645\u062f</strong><small>Approved</small><div class="sl"></div></div><div class="sig"><strong>\u0627\u0644\u0645\u0633\u062a\u0644\u0645</strong><small>Received by</small><div class="sl"></div></div></div><div class="footer"></div></section></body></html>`);
    printWindow.document.close();
    let printed = false;
    const doPrint = () => { if (printed) return; printed = true; printWindow.focus(); printWindow.print(); };
    const logo = printWindow.document.querySelector(".logo") as HTMLImageElement | null;
    if (logo && !logo.complete) {
      logo.addEventListener("load", doPrint, { once: true });
      logo.addEventListener("error", doPrint, { once: true });
      window.setTimeout(doPrint, 3000);
    } else window.setTimeout(doPrint, 150);
  };

  const handleViewVoucher = async (row: VoucherRow) => {
    const items = await loadVoucherItems(row.id);
    setVoucherView({ ...row, items });
  };

  const handleEditVoucher = async (row: VoucherRow) => {
    const items = await loadVoucherItems(row.id);
    setVoucherForm({
      id: row.id,
      voucherNumber: row.voucherNumber,
      voucherDate: row.voucherDate,
      description: row.description,
      department: row.department,
      approvedBy: row.approvedBy,
      items: items.length > 0 ? items : [{ description: "", accountCode: "", amount: "" }],
    });
    setVoucherView(null);
    setIsFormOpen(true);
  };

  const generateVoucherNumber = async (
    tableName: "expense_vouchers" | "petty_cash_vouchers",
    prefix: "SRF" | "QBD"
  ) => {
    const { data } = await supabase
      .from(tableName)
      .select("voucher_number")
      .like("voucher_number", `${prefix}-%`)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastVoucherNumber = String(data?.[0]?.voucher_number ?? "");
    const lastNumber = Number(lastVoucherNumber.split("-")[1] ?? "0");
    const nextNumber = String(lastNumber + 1).padStart(4, "0");
    return `${prefix}-${nextNumber}`;
  };

  const handleViewPettyCash = (row: PettyCashRow) => {
    setPettyCashView(row);
  };

  const handleEditPettyCash = (row: PettyCashRow) => {
    setPettyCashForm({
      id: row.id,
      voucherNumber: row.voucherNumber,
      voucherDate: row.voucherDate,
      beneficiaryName: row.beneficiaryName,
      purpose: row.purpose,
      amount: row.amount,
      paidBy: row.paidBy,
      receivedBy: row.receivedBy,
    });
    setPettyCashView(null);
    setIsFormOpen(true);
  };

  const handlePrintPettyCash = (row: PettyCashRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const escapeHtml = (value: unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const amount = Number.parseFloat(row.amount || "0") || 0;

    printWindow.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>سند قبض ${escapeHtml(row.voucherNumber)}</title><style>
      @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#111827;font-family:Arial,"Tahoma",sans-serif}.voucher{width:100%;min-height:175mm;border:1px solid #d1d5db;padding:14mm 15mm 10mm;position:relative;background:#fff}.header{display:grid;grid-template-columns:150px 1fr 190px;align-items:start;gap:20px}.logo{width:135px;height:90px;object-fit:contain}.company{text-align:right}.company h2{margin:0;font-size:22px}.company p{margin:4px 0;color:#475569;font-size:11px;line-height:1.6}.voucher-title{text-align:center}.voucher-title h1{font-size:29px;margin:0}.voucher-title .en{font-size:14px;font-weight:700;letter-spacing:1.8px;border-bottom:2px solid #0f766e;padding:4px 12px;display:inline-block}.number{margin-top:10px;color:#0f766e;font-size:24px;font-weight:800;letter-spacing:2px}.currency{display:flex;justify-content:center;gap:9px;margin-bottom:7px}.currency span{background:#f1f5f9;padding:5px 10px;font-size:11px;font-weight:700}.date-row{display:flex;justify-content:space-between;margin:17px 0 7px;font-size:12px}.line{display:grid;grid-template-columns:150px 1fr 165px;gap:8px;align-items:end;margin:12px 0;font-size:13px}.label-ar{text-align:right;font-weight:700}.label-en{text-align:left;font-weight:700;direction:ltr}.value{min-height:25px;border-bottom:1px solid #64748b;padding:3px 8px;text-align:center;font-weight:700}.amount-box{display:grid;grid-template-columns:1fr 220px;gap:18px;align-items:center}.amount{border:2px solid #0f766e;border-radius:6px;padding:9px 12px;text-align:center;color:#0f766e;font-size:18px;font-weight:800}.signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:70px;margin-top:38px;text-align:center}.signature strong{display:block;font-size:13px}.signature small{display:block;color:#64748b;margin-top:3px}.signature .sign-line{border-bottom:1px solid #94a3b8;height:42px}.footer{position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(90deg,#0284c7,#0f766e)}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.voucher{border:0}}
    </style></head><body><section class="voucher"><div class="header"><img class="logo" src="${COMPANY_LOGO_URL}" alt="شعار العياف"><div class="voucher-title"><h1>سند قبض</h1><div class="en">RECEIPT VOUCHER</div><div class="number">${escapeHtml(row.voucherNumber)}</div></div><div class="company"><h2>شركة لاكجري العياف</h2><p>Luxury Al Ayaf Company<br>المملكة العربية السعودية<br>VAT No. 314559705300003</p></div></div><div class="date-row"><span><b>التاريخ / Date:</b> ${escapeHtml(row.voucherDate)}</span><div class="currency"><span>هـ / H</span><span>ريال سعودي / S.R. SAR</span></div></div><div class="line"><span class="label-ar">استلمنا من السيد/السادة:</span><div class="value">${escapeHtml(row.beneficiaryName || "-")}</div><span class="label-en">Received from Mr./Mrs.:</span></div><div class="amount-box"><div class="line"><span class="label-ar">مبلغ وقدره:</span><div class="value">${amount.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ريال سعودي</div><span class="label-en">Amount:</span></div><div class="amount">${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</div></div><div class="line"><span class="label-ar">نقداً / شيك رقم / البنك:</span><div class="value">${escapeHtml(row.paidBy || "نقداً")}</div><span class="label-en">Cash / Cheque No. / Bank:</span></div><div class="line"><span class="label-ar">وذلك مقابل:</span><div class="value">${escapeHtml(row.purpose || "-")}</div><span class="label-en">Being:</span></div><div class="signatures"><div class="signature"><strong>المستلم</strong><small>Receiver</small><div class="sign-line"></div><span>${escapeHtml(row.receivedBy || "")}</span></div><div class="signature"><strong>المحاسب</strong><small>Accountant</small><div class="sign-line"></div></div><div class="signature"><strong>المدير المالي</strong><small>Finance Manager</small><div class="sign-line"></div></div></div><div class="footer"></div></section></body></html>`);
    printWindow.document.close();
    let printed = false;
    const print = () => { if (printed) return; printed = true; printWindow.focus(); printWindow.print(); };
    const logo = printWindow.document.querySelector(".logo") as HTMLImageElement | null;
    if (logo && !logo.complete) {
      logo.addEventListener("load", print, { once: true });
      logo.addEventListener("error", print, { once: true });
      window.setTimeout(print, 3000);
    } else window.setTimeout(print, 150);
  };

  const title = isReports
    ? "تقرير المصروفات"
    : isPettyCash
      ? "سندات القبض والصرف"
      : isVouchers
        ? "سندات الصرف"
        : "المصرفات";

  const description = isReports
    ? "ملخصات وتقارير المصروفات والسندات."
    : isPettyCash
      ? "إدارة سندات القبض والصرف وتتبع جميع المعاملات."
      : isVouchers
        ? "إنشاء وإدارة سندات الصرف والمصروفات."
        : "إدارة المصرفات والسندات والتقارير.";

  if (!isVouchers && !isPettyCash && !isReports) {
    return (
      <Layout
        subMenu={{
          title: "المحاسبة والمالية",
          items: [
            { label: "شجرة الحسابات", href: "/expenses" },
            { label: "حساب الضرائب", href: "/expenses/tax" },
            { label: "تقارير ضريبية", href: "/expenses/tax-reports" },
          ],
        }}
      >
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground text-right">المحاسبة والمالية</h1>
            <p className="mt-1 text-sm text-muted-foreground text-right">
              إدارة الحسابات المالية عبر شجرة الحسابات.
            </p>
          </div>
          <ChartOfAccountsTree />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      subMenu={{
        title: "المحاسبة والمالية",
        items: [
          { label: "شجرة الحسابات", href: "/expenses" },
        ],
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {!isReports && (
            <button
              onClick={async () => {
                if (isVouchers) {
                  const voucherNumber = await generateVoucherNumber("expense_vouchers", "SRF");
                  setVoucherForm({ ...getEmptyVoucherForm(), voucherNumber });
                }
                if (isPettyCash) {
                  const voucherNumber = await generateVoucherNumber("petty_cash_vouchers", "QBD");
                  setPettyCashForm({ ...getEmptyPettyCashForm(), voucherNumber });
                }
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90"
            >
              <Plus className="h-4 w-4" />
              {isVouchers ? "إنشاء سند صرف جديد" : "إنشاء سند قبض من عميل"}
            </button>
          )}
        </div>

        {!isReports && isFormOpen && isVouchers ? (
          <VoucherForm
            form={voucherForm}
            setForm={setVoucherForm}
            onSave={async () => {
              setSaving(true);

              const voucherId = voucherForm.id ?? crypto.randomUUID();
              const cleanedItems = voucherForm.items.filter(
                (item) => item.description.trim() || item.accountCode.trim() || item.amount
              );

              const voucherNumber = voucherForm.id
                ? voucherForm.voucherNumber
                : voucherForm.voucherNumber || (await generateVoucherNumber("expense_vouchers", "SRF"));

              const payload = {
                id: voucherId,
                voucher_number: voucherNumber,
                voucher_date: voucherForm.voucherDate,
                description: voucherForm.description,
                department: voucherForm.department,
                approved_by: voucherForm.approvedBy,
                total_amount: cleanedItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0),
                status: "مسودة",
              };

              const result = voucherForm.id
                ? await supabase.from("expense_vouchers").update(payload).eq("id", voucherForm.id)
                : await supabase.from("expense_vouchers").insert([payload]);

              if (!result.error) {
                await supabase.from("expense_voucher_items").delete().eq("voucher_id", voucherId);

                if (cleanedItems.length > 0) {
                  await supabase.from("expense_voucher_items").insert(
                    cleanedItems.map((item) => ({
                      voucher_id: voucherId,
                      item_description: item.description,
                      account_code: item.accountCode,
                      amount: item.amount || "0",
                    }))
                  );
                }

                await loadVouchers();
                setIsFormOpen(false);
                setVoucherForm(getEmptyVoucherForm());
                toast({ title: "تم الحفظ", description: "تم حفظ السند بنجاح" });
              } else {
                toast({ title: "فشل الحفظ", description: "تعذر حفظ السند", variant: "destructive" });
              }
              setSaving(false);
            }}
            onCancel={() => setIsFormOpen(false)}
            saving={saving}
          />
        ) : !isReports && isFormOpen && isPettyCash ? (
          <PettyCashForm
            form={pettyCashForm}
            setForm={setPettyCashForm}
            onSave={async () => {
              setSaving(true);
              const voucherId = pettyCashForm.id ?? crypto.randomUUID();
              const voucherNumber = pettyCashForm.id
                ? pettyCashForm.voucherNumber
                : pettyCashForm.voucherNumber || (await generateVoucherNumber("petty_cash_vouchers", "QBD"));

              const payload = {
                id: voucherId,
                voucher_number: voucherNumber,
                voucher_date: pettyCashForm.voucherDate,
                beneficiary_name: pettyCashForm.beneficiaryName,
                purpose: pettyCashForm.purpose,
                amount: pettyCashForm.amount,
                paid_by: pettyCashForm.paidBy,
                received_by: pettyCashForm.receivedBy,
                status: "قيد المراجعة",
              };

              const result = pettyCashForm.id
                ? await supabase
                    .from("petty_cash_vouchers")
                    .update(payload)
                    .eq("id", pettyCashForm.id)
                : await supabase.from("petty_cash_vouchers").insert([payload]);

              if (!result.error) {
                await loadPettyCash();
                setIsFormOpen(false);
                setPettyCashForm(getEmptyPettyCashForm());
                toast({ title: "تم الحفظ", description: "تم حفظ السند بنجاح" });
              } else {
                toast({ title: "فشل الحفظ", description: "تعذر حفظ السند", variant: "destructive" });
              }
              setSaving(false);
            }}
            onCancel={() => setIsFormOpen(false)}
            saving={saving}
          />
        ) : null}

        {isVouchers && !isFormOpen && (
          <VouchersList
            rows={voucherRows}
            onView={handleViewVoucher}
            onEdit={handleEditVoucher}
            onPrint={handlePrintVoucher}
            onDelete={async (id) => {
              if (!confirm("هل متأكد من حذف السند؟")) return;
              setDeleting(true);
              await supabase.from("expense_voucher_items").delete().eq("voucher_id", id);
              const result = await supabase.from("expense_vouchers").delete().eq("id", id);
              if (!result.error) {
                await loadVouchers();
                toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
              } else {
                toast({ title: "فشل الحذف", variant: "destructive" });
              }
              setDeleting(false);
            }}
          />
        )}

        {isPettyCash && !isFormOpen && (
          <>
            <PettyCashList
              rows={pettyCashRows}
              onView={handleViewPettyCash}
              onEdit={handleEditPettyCash}
              onDelete={async (id) => {
                if (!confirm("هل متأكد من حذف السند؟")) return;
                setDeleting(true);
                const result = await supabase.from("petty_cash_vouchers").delete().eq("id", id);
                if (!result.error) {
                  await loadPettyCash();
                  toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
                } else {
                  toast({ title: "فشل الحذف", variant: "destructive" });
                }
                setDeleting(false);
              }}
            />
            <div className="mt-8 border-t border-border pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">سندات الصرف</h2>
                  <p className="text-sm text-muted-foreground">سجلات الصرف والمصروفات المعتمدة</p>
                </div>
                <button
                  onClick={async () => {
                    const voucherNumber = await generateVoucherNumber("expense_vouchers", "SRF");
                    setVoucherForm({ ...getEmptyVoucherForm(), voucherNumber });
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء سند صرف جديد
                </button>
              </div>
              <VouchersList
                rows={voucherRows}
                onView={handleViewVoucher}
                onEdit={handleEditVoucher}
                onPrint={handlePrintVoucher}
                onDelete={async (id) => {
                  if (!confirm("هل متأكد من حذف السند؟")) return;
                  setDeleting(true);
                  await supabase.from("expense_voucher_items").delete().eq("voucher_id", id);
                  const result = await supabase.from("expense_vouchers").delete().eq("id", id);
                  if (!result.error) {
                    await loadVouchers();
                    toast({ title: "تم الحذف", description: "تم حذف السند بنجاح" });
                  } else {
                    toast({ title: "فشل الحذف", variant: "destructive" });
                  }
                  setDeleting(false);
                }}
              />
            </div>
          </>
        )}

        {isReports && <ExpenseReportsList voucherRows={voucherRows} pettyCashRows={pettyCashRows} />}

        {voucherView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">تفاصيل سند الصرف</h3>
                <button
                  onClick={() => setVoucherView(null)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">رقم السند</p>
                  <p className="font-medium text-foreground">{voucherView.voucherNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="font-medium text-foreground">{voucherView.voucherDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">القسم</p>
                  <p className="font-medium text-foreground">{voucherView.department || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الموافق</p>
                  <p className="font-medium text-foreground">{voucherView.approvedBy || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">الوصف</p>
                <p className="font-medium text-foreground">{voucherView.description || "—"}</p>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-right font-semibold">البند</th>
                      <th className="px-3 py-2 text-right font-semibold">الحساب</th>
                      <th className="px-3 py-2 text-right font-semibold">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherView.items.length > 0 ? (
                      voucherView.items.map((item, index) => (
                        <tr key={item.id ?? index} className="border-t border-border">
                          <td className="px-3 py-2">{item.description || "—"}</td>
                          <td className="px-3 py-2">{item.accountCode || "—"}</td>
                          <td className="px-3 py-2">{item.amount || "0"} ريال</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-border">
                        <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                          لا توجد بنود لهذا السند
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold text-foreground">الإجمالي: {voucherView.totalAmount} ريال</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handlePrintVoucher(voucherView)}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة سند الصرف
                  </button>
                  <button
                    onClick={() => void handleEditVoucher(voucherView)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل السند
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {pettyCashView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xl rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">تفاصيل سند القبض</h3>
                <button
                  onClick={() => setPettyCashView(null)}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">رقم السند</p>
                  <p className="font-medium text-foreground">{pettyCashView.voucherNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="font-medium text-foreground">{pettyCashView.voucherDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المستفيد</p>
                  <p className="font-medium text-foreground">{pettyCashView.beneficiaryName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المبلغ</p>
                  <p className="font-medium text-foreground">{pettyCashView.amount || "0"} ريال</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">صرفه</p>
                  <p className="font-medium text-foreground">{pettyCashView.paidBy || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">استلمه</p>
                  <p className="font-medium text-foreground">{pettyCashView.receivedBy || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">الغرض</p>
                <p className="font-medium text-foreground">{pettyCashView.purpose || "—"}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handlePrintPettyCash(pettyCashView)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <Printer className="h-4 w-4" />
                  طباعة سند القبض
                </button>
                <button
                  onClick={() => handleEditPettyCash(pettyCashView)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل السند
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function VoucherForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: VoucherForm;
  setForm: (form: VoucherForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        {form.id ? "تعديل سند الصرف" : "إنشاء سند صرف جديد"}
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">رقم السند</label>
          <input
            value={form.voucherNumber}
            readOnly
            className="mt-1 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            placeholder="يتولد تلقائياً"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">التاريخ</label>
          <input
            type="date"
            value={form.voucherDate}
            onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">القسم</label>
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="القسم"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">موافق من قبل</label>
          <input
            value={form.approvedBy}
            onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="الاسم"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">الوصف</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="وصف السند"
          rows={2}
        />
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">بنود السند</h4>
          <button
            onClick={() =>
              setForm({
                ...form,
                items: [...form.items, { description: "", accountCode: "", amount: "" }],
              })
            }
            className="text-xs text-primary hover:underline"
          >
            + إضافة بند
          </button>
        </div>

        <div className="space-y-2">
          {form.items.map((item, idx) => (
            <div key={idx} className="grid gap-2 grid-cols-3">
              <input
                value={item.description}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].description = e.target.value;
                  setForm({ ...form, items: newItems });
                }}
                placeholder="البند"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={item.accountCode}
                onChange={(e) => {
                  const newItems = [...form.items];
                  newItems[idx].accountCode = e.target.value;
                  setForm({ ...form, items: newItems });
                }}
                placeholder="كود الحساب"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const newItems = [...form.items];
                    newItems[idx].amount = e.target.value;
                    setForm({ ...form, items: newItems });
                  }}
                  placeholder="المبلغ"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>

        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <X className="h-4 w-4" />
          إلغاء
        </button>
      </div>
    </div>
  );
}

function PettyCashForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: PettyCashForm;
  setForm: (form: PettyCashForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const amountValue = Number.parseFloat(form.amount || "0") || 0;

  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 space-y-6">
      <h3 className="text-2xl font-semibold text-foreground text-right">
        {form.id ? "تعديل سند قبض من عميل" : "سند قبض من عميل"}
      </h3>

      <section className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2">
          <h4 className="text-sm font-semibold text-foreground">معلومات أساسية</h4>
          <span className="text-xs text-muted-foreground">مطلوب</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">العميل</label>
            <input
              value={form.beneficiaryName}
              onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">تم الدفع من خلال</label>
            <input
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">استلمه</label>
            <input
              value={form.receivedBy}
              onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="اسم المستلم"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">عملة السند</label>
            <input
              value="ريال سعودي (SAR)"
              readOnly
              className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-semibold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">المبلغ المستلم</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="مطلوب"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">التاريخ</label>
            <input
              type="date"
              value={form.voucherDate}
              onChange={(e) => setForm({ ...form, voucherDate: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">الوصف</label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="غير محدد"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-2">
          <h4 className="text-sm font-semibold text-foreground">معلومات إضافية (اختياري)</h4>
          <span className="text-xs text-muted-foreground">⌄</span>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">نوع الدفعة</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              دفعة مقدمة
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground"
            >
              دفعة فواتير
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">إضافة لرصيد العميل</span>
          <span className="font-medium">{amountValue.toFixed(2)} ريال</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">المبلغ المدفوع</span>
          <span className="font-medium">{amountValue.toFixed(2)} ريال</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-foreground font-semibold">المتبقي</span>
          <span className="font-semibold">0.00 ريال</span>
        </div>
      </section>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-success/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>

        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground"
        >
          <X className="h-4 w-4" />
          إلغاء
        </button>

        <input
          value={form.voucherNumber}
          readOnly
          className="mr-auto w-36 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
          placeholder="رقم السند"
        />
      </div>
    </div>
  );
}

function VouchersList({
  rows,
  onView,
  onEdit,
  onPrint,
  onDelete,
}: {
  rows: VoucherRow[];
  onView: (row: VoucherRow) => void;
  onEdit: (row: VoucherRow) => void;
  onPrint?: (row: VoucherRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="ابحث برقم السند..."
            className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-emerald-600 text-white">
              <th className="px-4 py-3 text-right font-semibold">رقم السند</th>
              <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
              <th className="px-4 py-3 text-right font-semibold">الوصف</th>
              <th className="px-4 py-3 text-right font-semibold">القسم</th>
              <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                <td className="px-4 py-3 font-medium text-primary">{row.voucherNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.voucherDate}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.department}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.totalAmount} ريال</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(row)}
                      title="عرض"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      title="تعديل"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {onPrint && (
                      <button
                        onClick={() => void onPrint(row)}
                        title="طباعة"
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-sky-600 transition"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(row.id)}
                      title="حذف"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PettyCashList({
  rows,
  onView,
  onEdit,
  onDelete,
}: {
  rows: PettyCashRow[];
  onView: (row: PettyCashRow) => void;
  onEdit: (row: PettyCashRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="ابحث برقم السند..."
            className="w-full rounded-lg border border-border bg-background px-9 py-2 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sky-600 text-white">
              <th className="px-4 py-3 text-right font-semibold">رقم السند</th>
              <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
              <th className="px-4 py-3 text-right font-semibold">المستفيد</th>
              <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
              <th className="px-4 py-3 text-right font-semibold">الغرض</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-right font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/40">
                <td className="px-4 py-3 font-medium text-primary">{row.voucherNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.voucherDate}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.beneficiaryName}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.amount} ريال</td>
                <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(row)}
                      title="عرض"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(row)}
                      title="تعديل"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary transition"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(row.id)}
                      title="حذف"
                      className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseReportsList({
  voucherRows,
  pettyCashRows,
}: {
  voucherRows: VoucherRow[];
  pettyCashRows: PettyCashRow[];
}) {
  const formatMoney = (value: number) =>
    new Intl.NumberFormat("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const vouchersTotal = voucherRows.reduce(
    (sum, row) => sum + Number.parseFloat(row.totalAmount || "0"),
    0
  );

  const pettyCashTotal = pettyCashRows.reduce(
    (sum, row) => sum + Number.parseFloat(row.amount || "0"),
    0
  );

  const overallTotal = vouchersTotal + pettyCashTotal;

  const transactions = [
    ...voucherRows.map((row) => ({
      id: row.id,
      number: row.voucherNumber,
      date: row.voucherDate,
      type: "سند صرف",
      description: row.description || row.department || "—",
      amount: Number.parseFloat(row.totalAmount || "0"),
      status: row.status,
    })),
    ...pettyCashRows.map((row) => ({
      id: row.id,
      number: row.voucherNumber,
      date: row.voucherDate,
      type: "سند قبض",
      description: row.purpose || row.beneficiaryName || "—",
      amount: Number.parseFloat(row.amount || "0"),
      status: row.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-emerald-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات الصرف
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(vouchersTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">{voucherRows.length} سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-sky-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي سندات القبض
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(pettyCashTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">{pettyCashRows.length} سند</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="bg-rose-600 px-4 py-3 text-sm font-semibold text-white rounded-lg mb-3">
            إجمالي المصروفات
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(overallTotal)} ريال</p>
          <p className="text-xs text-muted-foreground mt-1">من جميع السندات</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">تقرير تفصيلي</h3>

        {transactions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <p>لا توجد بيانات للعرض حالياً.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm text-right">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 font-semibold">رقم السند</th>
                  <th className="px-4 py-3 font-semibold">النوع</th>
                  <th className="px-4 py-3 font-semibold">التاريخ</th>
                  <th className="px-4 py-3 font-semibold">الوصف</th>
                  <th className="px-4 py-3 font-semibold">المبلغ</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-primary">{row.number}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.description}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(row.amount)} ريال</td>
                    <td className="px-4 py-3">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
