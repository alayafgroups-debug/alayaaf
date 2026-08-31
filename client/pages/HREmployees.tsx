import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Columns3,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { PageHeader } from "@/components/SalesPageUI";
import EmployeeForm, { emptyForm, mapRowToForm } from "./EmployeeForm";
import type { EmpFormData } from "./EmployeeForm";
import { useI18n } from "@/i18n";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUSES = ["فعال", "غير فعال", "إجازة", "منتهي"];

type OptionalColumn = "englishName" | "directorate" | "nationality" | "nationalId" | "hireDate" | "phone" | "email";

const OPTIONAL_COLUMNS: { key: OptionalColumn; label: string }[] = [
  { key: "englishName", label: "الاسم بالإنجليزية" },
  { key: "directorate", label: "الإدارة" },
  { key: "nationality", label: "الجنسية" },
  { key: "nationalId", label: "رقم الهوية" },
  { key: "hireDate", label: "تاريخ التعيين" },
  { key: "phone", label: "رقم الجوال" },
  { key: "email", label: "البريد الإلكتروني" },
];

const STATUS_COLORS: Record<string, string> = {
  "فعال": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "نشط": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "غير فعال": "bg-slate-100 text-slate-600 border-slate-200",
  "غير نشط": "bg-slate-100 text-slate-600 border-slate-200",
  "إجازة": "bg-amber-50 text-amber-700 border-amber-200",
  "منتهي": "bg-rose-50 text-rose-700 border-rose-200",
};

const EXPORT_ENGLISH_VALUES: Record<string, string> = {
  "شركة إدارة العياف للمقاولات": "Idarat Al Ayaf For Contracting",
  "الفرع الرئيسي": "Main Branch",
  "الإدارة العليا": "Executive Management",
  "إدارة الموارد البشرية": "Human Resources Management",
  "قسم الموارد البشرية": "Human Resources Department",
  "الموارد البشرية": "Human Resources",
  "إدارة المالية": "Finance Management",
  "قسم المالية": "Finance Department",
  "المحاسبة": "Accounting",
  "إدارة التشغيل": "Operations Management",
  "الصيانة والتشغيل": "Maintenance and Operations",
  "إدارة المبيعات": "Sales Management",
  "المبيعات": "Sales",
  "تقنية المعلومات": "Information Technology",
  "عامل نظافة": "Cleaner",
  "المملكة العربية السعودية": "Saudi Arabia", "الإمارات العربية المتحدة": "United Arab Emirates",
  "البحرين": "Bahrain", "الكويت": "Kuwait", "عُمان": "Oman", "قطر": "Qatar",
  "مصر": "Egypt", "السودان": "Sudan", "جنوب السودان": "South Sudan", "ليبيا": "Libya",
  "تونس": "Tunisia", "الجزائر": "Algeria", "المغرب": "Morocco", "موريتانيا": "Mauritania",
  "الصومال": "Somalia", "جيبوتي": "Djibouti", "جزر القمر": "Comoros", "سوريا": "Syria",
  "الأردن": "Jordan", "لبنان": "Lebanon", "فلسطين": "Palestine", "العراق": "Iraq", "اليمن": "Yemen",
  "الهند": "India", "باكستان": "Pakistan", "بنغلاديش": "Bangladesh", "سريلانكا": "Sri Lanka",
  "نيبال": "Nepal", "بوتان": "Bhutan", "أفغانستان": "Afghanistan", "المالديف": "Maldives",
  "الفلبين": "Philippines", "إندونيسيا": "Indonesia", "ماليزيا": "Malaysia", "تايلاند": "Thailand",
  "فيتنام": "Vietnam", "ميانمار": "Myanmar", "الصين": "China", "اليابان": "Japan", "كوريا الجنوبية": "South Korea",
  "إثيوبيا": "Ethiopia", "إريتريا": "Eritrea", "كينيا": "Kenya", "أوغندا": "Uganda",
  "تنزانيا": "Tanzania", "نيجيريا": "Nigeria", "غانا": "Ghana", "السنغال": "Senegal",
  "الكاميرون": "Cameroon", "جنوب أفريقيا": "South Africa", "تركيا": "Turkey", "إيران": "Iran",
  "أذربيجان": "Azerbaijan", "أوزبكستان": "Uzbekistan", "كازاخستان": "Kazakhstan",
  "روسيا": "Russia", "أوكرانيا": "Ukraine", "المملكة المتحدة": "United Kingdom", "فرنسا": "France",
  "ألمانيا": "Germany", "إيطاليا": "Italy", "إسبانيا": "Spain", "هولندا": "Netherlands",
  "السويد": "Sweden", "اليونان": "Greece", "الولايات المتحدة": "United States", "كندا": "Canada",
  "المكسيك": "Mexico", "البرازيل": "Brazil", "الأرجنتين": "Argentina", "أستراليا": "Australia",
  "نيوزيلندا": "New Zealand", "أخرى": "Other",
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HREmployees() {
  const { t, direction, locale, formatNumber } = useI18n();
  const [employees, setEmployees] = useState<EmpFormData[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selected, setSelected] = useState<EmpFormData | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fSearch, setFSearch] = useState("");
  const [fDepartment, setFDepartment] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalColumn, boolean>>({
    englishName: false,
    directorate: true,
    nationality: true,
    nationalId: true,
    hireDate: true,
    phone: true,
    email: true,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [employeeResult, departmentResult] = await Promise.all([
          supabase.from("employees").select("*").order("created_at", { ascending: false }),
          supabase.from("departments").select("id, name").order("name"),
        ]);
        if (!employeeResult.error && employeeResult.data) setEmployees(employeeResult.data.map(mapRowToForm));
        if (!departmentResult.error) setDepartments((departmentResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) })));
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => employees.filter((e) => {
    const keyword = fSearch.trim().toLowerCase();
    if (keyword && ![e.name, e.firstName, e.empId, e.phone, e.email, e.nationalId]
      .some((value) => value.toLowerCase().includes(keyword))) return false;
    if (fDepartment && e.departmentId !== fDepartment && e.directorate !== departments.find((item) => item.id === fDepartment)?.name) return false;
    if (fStatus && e.status !== fStatus) return false;
    return true;
  }), [departments, employees, fSearch, fDepartment, fStatus]);

  useEffect(() => {
    setPage(1);
  }, [fSearch, fDepartment, fStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageData = filtered.slice(pageStart, pageStart + pageSize);
  const visibleColumnCount = 8 + Object.values(visibleColumns).filter(Boolean).length;
  const allPageSelected = pageData.length > 0 && pageData.every((employee) => selectedIds.has(employee.id));

  const exportPreservedEnglishTemplate = async () => {
    if (!filtered.length) {
      toast({ title: t("لا توجد بيانات للتصدير") });
      return;
    }

    const templateUrl = "/api/hr/employee-template";
    const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const containsArabic = (value: string) => /[\u0600-\u06ff]/.test(value);
    const englishValue = (value: string | null | undefined, fallback = "-") => {
      const clean = String(value ?? "").trim();
      if (!clean) return fallback;
      return EXPORT_ENGLISH_VALUES[clean] || (!containsArabic(clean) ? clean : fallback);
    };
    const statusInEnglish: Record<string, string> = {
      "فعال": "Active", "نشط": "Active", active: "Active",
      "غير فعال": "Inactive", "غير نشط": "Inactive",
      "إجازة": "On Leave", "منتهي": "Terminated",
    };

    try {
      const [response, branchResult, departmentResult, jobResult, sectionResult] = await Promise.all([
        fetch(templateUrl),
        supabase.from("branches").select("id, name, name_en"),
        supabase.from("departments").select("id, name, name_en"),
        supabase.from("hr_jobs").select("name, name_en"),
        supabase.from("org_sections").select("id, name"),
      ]);
      if (!response.ok) throw new Error("Unable to download the Excel template");

      const branchesById = new Map((branchResult.data ?? []).map((row) => [
        String(row.id),
        englishValue(String(row.name_en ?? ""), englishValue(String(row.name ?? ""), "Not specified")),
      ]));
      const departmentsById = new Map((departmentResult.data ?? []).map((row) => [
        String(row.id),
        englishValue(String(row.name_en ?? ""), englishValue(String(row.name ?? ""), "Not specified")),
      ]));
      const jobsByName = new Map((jobResult.data ?? []).map((row) => [
        String(row.name ?? "").trim(),
        englishValue(String(row.name_en ?? ""), englishValue(String(row.name ?? ""), "Not specified")),
      ]));
      const sectionsById = new Map((sectionResult.data ?? []).map((row) => [
        String(row.id),
        englishValue(String(row.name ?? ""), "Not specified"),
      ]));

      const workbook = await XlsxPopulate.fromDataAsync(await response.arrayBuffer());
      const worksheet = workbook.sheet(0);
      const values = worksheet.usedRange().value();
      const headerIndex = values.findIndex((row) => row.some((value) => {
        const label = String(value ?? "").toLowerCase();
        return label.includes("employee") && (label.includes("id") || label.includes("name"));
      }));
      if (headerIndex < 0) throw new Error("The employee header row was not found in the template");

      const headers = values[headerIndex].map((value) => String(value ?? "").trim());
      const dataColumnIndex = headers.findIndex((header) => header.toLowerCase() === "data");
      if (dataColumnIndex >= 0) {
        worksheet.column(dataColumnIndex + 1).hidden(true);
        headers.splice(dataColumnIndex, 1);
      }
      const visibleColumnNumbers = values[headerIndex]
        .map((_, index) => index)
        .filter((index) => index !== dataColumnIndex);
      const templateDataRow = Math.min(headerIndex + 2, values.length);
      const templateStyleNames = [
        "bold", "italic", "underline", "strikethrough", "subscript", "superscript",
        "fontSize", "fontFamily", "fontGenericFamily", "fontColor", "fontScheme",
        "horizontalAlignment", "verticalAlignment", "wrapText", "shrinkToFit",
        "textDirection", "textRotation", "indent", "justifyLastLine", "fill",
        "numberFormat", "border", "borderColor", "borderStyle",
        "diagonalBorderDirection",
      ];
      const templateStyles = visibleColumnNumbers.map((columnIndex) =>
        worksheet.cell(templateDataRow, columnIndex + 1).style(templateStyleNames)
      );

      const valueForHeader = (employee: EmpFormData, header: string, index: number): string | number => {
        const key = header.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (["no", "number", "srno", "serial", "sno"].includes(key)) return index + 1;
        if (key.includes("employeeid") || key.includes("employeeno") || key === "id") return employee.empId || employee.accountTitle || "-";
        if (key.includes("arabicname")) return "-";
        if (key.includes("name")) return englishValue(employee.firstName, englishValue(employee.name, employee.empId || "-"));
        if (key.includes("status")) return statusInEnglish[employee.status] || englishValue(employee.status, "Not specified");
        if (key.includes("branch")) return branchesById.get(employee.branchId) || englishValue(employee.branch, "Not specified");
        if (key.includes("management") || key.includes("directorate")) return departmentsById.get(employee.departmentId) || englishValue(employee.directorate, "Not specified");
        if (key.includes("department") || key.includes("section")) return sectionsById.get(employee.sectionId) || englishValue(employee.department, "Not specified");
        if (key.includes("jobtitle") || key.includes("designation") || key.includes("position")) return jobsByName.get(employee.jobTitle.trim()) || englishValue(employee.jobTitle, "Not specified");
        if (key.includes("nationality")) return englishValue(employee.nationality, "Not specified");
        if (key.includes("nationalid") || key.includes("identity")) return employee.nationalId || "-";
        if (key.includes("hiredate") || key.includes("joiningdate")) return employee.hireDate || "-";
        if (key.includes("mobile") || key.includes("phone")) return employee.phone || "-";
        if (key.includes("email")) return englishValue(employee.email);
        return "-";
      };

      const dataStartRow = headerIndex + 2;
      const rowsToClear = Math.max(values.length - headerIndex - 1, filtered.length);
      for (let offset = 0; offset < rowsToClear; offset += 1) {
        visibleColumnNumbers.forEach((columnIndex) => worksheet.cell(dataStartRow + offset, columnIndex + 1).value(null));
      }
      filtered.forEach((employee, employeeIndex) => {
        visibleColumnNumbers.forEach((columnIndex, visibleIndex) => {
          const cell = worksheet.cell(dataStartRow + employeeIndex, columnIndex + 1);
          cell.value(valueForHeader(employee, headers[visibleIndex], employeeIndex));
          if (templateStyles[visibleIndex]) cell.style(templateStyles[visibleIndex]);
        });
      });

      values.slice(0, headerIndex).forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
        const text = String(value ?? "");
        if (text.toLowerCase().includes("employee") && text.toLowerCase().includes("list")) {
          worksheet.cell(rowIndex + 1, columnIndex + 1).value(`EMPLOYEE LIST — ${dayName.toUpperCase()}`);
        }
      }));

      const output = await workbook.outputAsync();
      const url = URL.createObjectURL(output);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Employee_List_${dayName}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      toast({ title: "Excel export failed", description: exportError instanceof Error ? exportError.message : "Unable to generate the employee report", variant: "destructive" });
    }
  };

  const exportExactEnglishTemplate = async () => {
    if (!filtered.length) {
      toast({ title: t("لا توجد بيانات للتصدير") });
      return;
    }

    const templateUrl = "/api/hr/employee-template";
    const reportDate = new Date();
    const dayName = reportDate.toLocaleDateString("en-US", { weekday: "long" });
    const containsArabic = (value: string) => /[\u0600-\u06ff]/.test(value);
    const englishValue = (value: string | null | undefined, fallback = "-") => {
      const clean = String(value ?? "").trim();
      return clean && !containsArabic(clean) ? clean : fallback;
    };
    const statusInEnglish: Record<string, string> = {
      "فعال": "Active", "نشط": "Active", active: "Active",
      "غير فعال": "Inactive", "غير نشط": "Inactive",
      "إجازة": "On Leave", "منتهي": "Terminated",
    };

    try {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error("Unable to download the Excel template");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("The Excel template has no worksheet");

      let headerRowNumber = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (headerRowNumber) return;
        const labels = row.values as unknown[];
        if (labels.some((value) => {
          const label = String(value ?? "").toLowerCase();
          return label.includes("employee") && (label.includes("id") || label.includes("name"));
        })) headerRowNumber = rowNumber;
      });
      if (!headerRowNumber) throw new Error("The employee header row was not found in the template");

      const headerRow = worksheet.getRow(headerRowNumber);
      let dataColumnNumber = 0;
      headerRow.eachCell((cell, columnNumber) => {
        if (String(cell.value ?? "").trim().toLowerCase() === "data") dataColumnNumber = columnNumber;
      });
      if (dataColumnNumber) worksheet.spliceColumns(dataColumnNumber, 1);

      const refreshedHeader = worksheet.getRow(headerRowNumber);
      const templateDataRow = worksheet.getRow(headerRowNumber + 1);
      const templateHeight = templateDataRow.height;
      const templateStyles = Array.from({ length: refreshedHeader.cellCount }, (_, index) => {
        const source = templateDataRow.getCell(index + 1);
        return {
          style: JSON.parse(JSON.stringify(source.style || {})),
          numFmt: source.numFmt,
        };
      });

      if (worksheet.rowCount > headerRowNumber) {
        worksheet.spliceRows(headerRowNumber + 1, worksheet.rowCount - headerRowNumber);
      }

      const valueForHeader = (employee: EmpFormData, header: string, index: number): string | number => {
        const key = header.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (["no", "number", "srno", "serial", "sno"].includes(key)) return index + 1;
        if (key.includes("employeeid") || key.includes("employeeno") || key === "id") return englishValue(employee.empId || employee.accountTitle);
        if (key.includes("arabicname")) return "-";
        if (key.includes("name")) return englishValue(employee.firstName, englishValue(employee.name, employee.empId || "-"));
        if (key.includes("status")) return statusInEnglish[employee.status] || englishValue(employee.status, "Not specified");
        if (key.includes("branch")) return englishValue(employee.branch, "Not specified");
        if (key.includes("directorate")) return englishValue(employee.directorate, "Not specified");
        if (key.includes("department") || key.includes("section")) return englishValue(employee.department, "Not specified");
        if (key.includes("jobtitle") || key.includes("designation") || key.includes("position")) return englishValue(employee.jobTitle, "Not specified");
        if (key.includes("nationality")) return englishValue(employee.nationality, "Not specified");
        if (key.includes("nationalid") || key.includes("identity")) return englishValue(employee.nationalId);
        if (key.includes("hiredate") || key.includes("joiningdate")) return employee.hireDate || "-";
        if (key.includes("mobile") || key.includes("phone")) return employee.phone || "-";
        if (key.includes("email")) return englishValue(employee.email);
        return "-";
      };

      const headers = Array.from({ length: refreshedHeader.cellCount }, (_, index) => String(refreshedHeader.getCell(index + 1).value ?? ""));
      filtered.forEach((employee, employeeIndex) => {
        const row = worksheet.addRow(headers.map((header) => valueForHeader(employee, header, employeeIndex)));
        row.height = templateHeight;
        row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          const templateStyle = templateStyles[columnNumber - 1];
          if (!templateStyle) return;
          cell.style = JSON.parse(JSON.stringify(templateStyle.style));
          cell.numFmt = templateStyle.numFmt;
        });
      });

      worksheet.views = [{ state: "frozen", ySplit: headerRowNumber, rightToLeft: false }];
      worksheet.autoFilter = {
        from: { row: headerRowNumber, column: 1 },
        to: { row: headerRowNumber + filtered.length, column: refreshedHeader.cellCount },
      };
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        if (rowNumber >= headerRowNumber) return;
        row.eachCell((cell) => {
          const value = String(cell.value ?? "");
          if (value.toLowerCase().includes("employee") && value.toLowerCase().includes("list")) {
            cell.value = `EMPLOYEE LIST — ${dayName.toUpperCase()}`;
          }
        });
      });

      const output = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Employee_List_${dayName}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      toast({ title: "Excel export failed", description: exportError instanceof Error ? exportError.message : "Unable to generate the employee report", variant: "destructive" });
    }
  };

  const exportEmployeesExcel = async () => {
    if (!filtered.length) {
      toast({ title: t("لا توجد بيانات للتصدير") });
      return;
    }

    const reportDate = new Date();
    const dayName = reportDate.toLocaleDateString("en-US", { weekday: "long" });
    const templateUrl = "https://cdn.builder.io/o/assets%2Fce04605038104603b965d31c7c18e8db%2Fa317a0e4cc5a46c7aee5892deb5ae568?alt=media&token=5d4d3e42-291d-42f8-b9a6-37c1c39cf412&apiKey=ce04605038104603b965d31c7c18e8db";
    const statusInEnglish: Record<string, string> = {
      "فعال": "Active",
      "نشط": "Active",
      "active": "Active",
      "غير فعال": "Inactive",
      "غير نشط": "Inactive",
      "إجازة": "On Leave",
      "منتهي": "Terminated",
    };
    const headers = [
      "No.", "Employee ID", "Arabic Name", "English Name",
      "Status", "Branch", "Directorate", "Department",
      "Job Title", "Nationality", "National ID",
      "Hire Date", "Mobile Number", "Email Address",
    ];
    const rows = filtered.map((employee, index) => [
      index + 1,
      employee.empId || employee.accountTitle || "—",
      employee.name || "—",
      employee.firstName || "—",
      statusInEnglish[employee.status] || employee.status || "Not specified",
      employee.branch || "—",
      employee.directorate || "—",
      employee.department || "—",
      employee.jobTitle || "—",
      employee.nationality || "—",
      employee.nationalId || "—",
      employee.hireDate || "—",
      employee.phone || "—",
      employee.email || "—",
    ]);
    const activeCount = filtered.filter((employee) => ["فعال", "نشط", "active"].includes(employee.status)).length;

    try {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error("Template download failed");
      const template = XLSX.read(await response.arrayBuffer(), { type: "array", cellStyles: true });
      const worksheet = template.Sheets[template.SheetNames[0]];
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
      const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1, defval: "" });
      const headerRow = rawRows.findIndex((row) => row.some((value) => {
        const label = String(value).trim().toLowerCase();
        return label.includes("employee") && (label.includes("id") || label.includes("name"));
      }));
      if (headerRow < 0) throw new Error("Template header was not found");

      const templateHeaders = rawRows[headerRow].map((value) => String(value).trim());
      const dataColumn = templateHeaders.findIndex((label) => label.toLowerCase() === "data");
      if (dataColumn >= 0) {
        for (let row = range.s.r; row <= range.e.r; row += 1) delete worksheet[XLSX.utils.encode_cell({ r: row, c: dataColumn })];
        worksheet["!cols"]?.splice(dataColumn, 1);
        worksheet["!merges"] = (worksheet["!merges"] || []).filter((merge) => !(merge.s.c <= dataColumn && merge.e.c >= dataColumn));
        range.e.c = Math.max(range.s.c, range.e.c - 1);
        templateHeaders.splice(dataColumn, 1);
      }

      const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
      const employeeValue = (employee: EmpFormData, header: string, index: number) => {
        const key = normalizeHeader(header);
        if (["no", "number", "srno", "serial", "sno"].includes(key)) return index + 1;
        if (key.includes("employeeid") || key.includes("employeeno") || key === "id") return employee.empId || employee.accountTitle || "-";
        if (key.includes("englishname")) return employee.firstName || employee.name || "-";
        if (key.includes("arabicname")) return employee.name || "-";
        if (key === "name" || key.includes("employeename")) return employee.firstName || employee.name || "-";
        if (key.includes("status")) return statusInEnglish[employee.status] || employee.status || "Not specified";
        if (key.includes("branch")) return employee.branch || "-";
        if (key.includes("directorate")) return employee.directorate || "-";
        if (key.includes("department") || key.includes("section")) return employee.department || "-";
        if (key.includes("jobtitle") || key.includes("designation") || key.includes("position")) return employee.jobTitle || "-";
        if (key.includes("nationality")) return employee.nationality || "-";
        if (key.includes("nationalid") || key.includes("identity")) return employee.nationalId || "-";
        if (key.includes("hiredate") || key.includes("joiningdate")) return employee.hireDate || "-";
        if (key.includes("mobile") || key.includes("phone")) return employee.phone || "-";
        if (key.includes("email")) return employee.email || "-";
        return "-";
      };

      const styleSourceRow = Math.min(headerRow + 1, range.e.r);
      const styleByColumn = templateHeaders.map((_, column) => worksheet[XLSX.utils.encode_cell({ r: styleSourceRow, c: column })]?.s);
      for (let row = headerRow + 1; row <= range.e.r; row += 1) {
        for (let column = range.s.c; column <= range.e.c; column += 1) delete worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
      }
      filtered.forEach((employee, employeeIndex) => {
        templateHeaders.forEach((header, column) => {
          const address = XLSX.utils.encode_cell({ r: headerRow + 1 + employeeIndex, c: column });
          const value = employeeValue(employee, header, employeeIndex);
          worksheet[address] = { t: typeof value === "number" ? "n" : "s", v: value, s: styleByColumn[column] };
        });
      });
      range.e.r = headerRow + filtered.length;
      worksheet["!ref"] = XLSX.utils.encode_range(range);
      worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ r: headerRow, c: range.s.c }, { r: range.e.r, c: range.e.c }) };
      worksheet["!freeze"] = { xSplit: 0, ySplit: headerRow + 1 };
      worksheet["!rtl"] = false;
      template.Workbook = { ...(template.Workbook || {}), Views: [{ RTL: false }] };

      rawRows.slice(0, headerRow).forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
        if (typeof value !== "string" || !value.toLowerCase().includes("employee") || !value.toLowerCase().includes("list")) return;
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (worksheet[address]) worksheet[address].v = `EMPLOYEE LIST — ${dayName.toUpperCase()}`;
      }));

      XLSX.writeFile(template, `Employee_List_${dayName}.xlsx`, { compression: true, cellStyles: true });
      return;
    } catch {
      toast({ title: "The exact template could not be loaded", description: "A matching professional English report was generated instead." });
    }

    const reportRows = [
      ["IDARAT AL AYAF FOR CONTRACTING"],
      [`EMPLOYEE LIST REPORT — ${dayName.toUpperCase()}`],
      [`Report Date: ${reportDate.toLocaleDateString("en-GB")}`, "", "", `Total Employees: ${filtered.length}`, "", "", `Active Employees: ${activeCount}`],
      [],
      headers,
      ...rows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(reportRows);
    const lastColumn = headers.length - 1;
    const lastRow = reportRows.length - 1;
    worksheet["!rtl"] = false;
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
    ];
    worksheet["!cols"] = [
      { wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 26 }, { wch: 12 },
      { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 26 }, { wch: 16 },
      { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 30 },
    ];
    worksheet["!rows"] = [{ hpt: 30 }, { hpt: 25 }, { hpt: 22 }, { hpt: 8 }, { hpt: 26 }];
    worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
    worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ r: 4, c: 0 }, { r: lastRow, c: lastColumn }) };
    worksheet["!margins"] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

    const titleStyle = { font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "075F94" } }, alignment: { horizontal: "center", vertical: "center" } };
    const subtitleStyle = { font: { bold: true, sz: 14, color: { rgb: "075F94" } }, alignment: { horizontal: "center", vertical: "center" } };
    const summaryStyle = { font: { bold: true, color: { rgb: "075F94" } }, fill: { fgColor: { rgb: "EAF4FA" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "B8D4E5" } }, bottom: { style: "thin", color: { rgb: "B8D4E5" } }, left: { style: "thin", color: { rgb: "B8D4E5" } }, right: { style: "thin", color: { rgb: "B8D4E5" } } } };
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "075F94" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true }, border: { top: { style: "thin", color: { rgb: "FFFFFF" } }, bottom: { style: "thin", color: { rgb: "FFFFFF" } }, left: { style: "thin", color: { rgb: "FFFFFF" } }, right: { style: "thin", color: { rgb: "FFFFFF" } } } };
    if (worksheet.A1) worksheet.A1.s = titleStyle;
    if (worksheet.A2) worksheet.A2.s = subtitleStyle;
    ["A3", "D3", "G3"].forEach((address) => { if (worksheet[address]) worksheet[address].s = summaryStyle; });
    for (let column = 0; column <= lastColumn; column += 1) {
      const address = XLSX.utils.encode_cell({ r: 4, c: column });
      if (worksheet[address]) worksheet[address].s = headerStyle;
    }
    for (let row = 5; row <= lastRow; row += 1) {
      for (let column = 0; column <= lastColumn; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        if (!worksheet[address]) continue;
        worksheet[address].s = {
          fill: { fgColor: { rgb: row % 2 === 0 ? "F3F8FB" : "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: { bottom: { style: "thin", color: { rgb: "DCE6EC" } } },
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    workbook.Workbook = { Views: [{ RTL: false }] };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, `Employee_List_${dayName}.xlsx`, { compression: true, cellStyles: true });
  };

  const togglePageSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageData.forEach((employee) => allPageSelected ? next.delete(employee.id) : next.add(employee.id));
      return next;
    });
  };

  if (mode === "create") {
    return (
      <EmployeeForm
        mode="create"
        initialData={emptyForm()}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "edit" && selected) {
    return (
      <EmployeeForm
        mode="edit"
        initialData={selected}
        onBack={() => setMode("list")}
        onSaved={() => { setMode("list"); setRefreshKey((k) => k + 1); }}
      />
    );
  }

  if (mode === "view" && selected) {
    return <EmployeeView employee={selected} onBack={() => setMode("list")} onEdit={() => setMode("edit")} />;
  }

  return (
    <Layout>
      <div dir={direction} className="space-y-4">
        {/* ─── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {t("قائمة الموظفين")}
          </h1>
          <button
            onClick={() => setMode("create")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow"
          >
            + {t("إضافة موظف جديد")}
          </button>
        </div>

        {/* ─── Table Card ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" onClick={() => showColumnMenu && setShowColumnMenu(false)}>
          {/* Blue title bar */}
          <div className="bg-blue-700 px-4 py-2.5 flex items-center justify-between text-white">
            <span className="font-semibold text-sm">
              {t("قائمة الموظفين")} — {formatNumber(filtered.length)} {t("موظف")}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => void exportPreservedEnglishTemplate()} title={t("تحميل تقرير الموظفين Excel")} className="p-1.5 rounded hover:bg-white/20 transition"><Download className="h-4 w-4" /></button>
              <button title={t("طباعة")} className="p-1.5 rounded hover:bg-white/20 transition"><Printer className="h-4 w-4" /></button>
              <button onClick={() => setRefreshKey((k) => k + 1)} title={t("تحديث")} className="p-1.5 rounded hover:bg-white/20 transition"><RefreshCw className="h-4 w-4" /></button>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowColumnMenu((v) => !v); }}
                  title={t("إظهار/إخفاء الأعمدة")}
                  className="p-1.5 rounded hover:bg-white/20 transition"
                >
                  <Columns3 className="h-4 w-4" />
                </button>
                {showColumnMenu && (
                  <div
                    className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-semibold text-gray-500 px-2 pb-1">{t("إظهار / إخفاء الأعمدة")}</p>
                    {OPTIONAL_COLUMNS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key]}
                          onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="rounded"
                        />
                        {t(label)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={t("بحث سريع...")}
                value={fSearch}
                onChange={(e) => setFSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white pe-8 ps-3 py-1.5 text-sm text-start focus:outline-none focus:border-blue-400"
              />
            </div>
            <select
              value={fDepartment}
              onChange={(e) => setFDepartment(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
            >
              <option value="">{t("جميع الأقسام")}</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400"
            >
              <option value="">{t("جميع الحالات")}</option>
              {STATUSES.map((s) => <option key={s}>{t(s)}</option>)}
            </select>
            <button
              onClick={() => { setFSearch(""); setFDepartment(""); setFStatus(""); }}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100 transition text-gray-600"
            >
              {t("مسح")}
            </button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                {formatNumber(selectedIds.size)} {t("محدد")}
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" dir={direction}>
              <thead>
                <tr className="bg-slate-100 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-8 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageSelection}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الرقم الوظيفي")}</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600 whitespace-nowrap">{t("إجراءات")}</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الاسم")}</th>
                  {visibleColumns.englishName && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الاسم بالإنجليزية")}</th>}
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الفرع")}</th>
                  {visibleColumns.directorate && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الإدارة")}</th>}
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("القسم")}</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("المسمى الوظيفي")}</th>
                  {visibleColumns.nationality && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الجنسية")}</th>}
                  {visibleColumns.nationalId && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("رقم الهوية")}</th>}
                  {visibleColumns.hireDate && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("تاريخ التعيين")}</th>}
                  {visibleColumns.phone && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("رقم الجوال")}</th>}
                  {visibleColumns.email && <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("البريد الإلكتروني")}</th>}
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("وضع العمل")}</th>
                  <th className="px-3 py-2.5 text-start font-semibold text-gray-600 whitespace-nowrap">{t("الحالة")}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={visibleColumnCount + 2} className="py-12 text-center text-gray-400 text-sm">{t("جاري التحميل...")}</td>
                  </tr>
                )}
                {!loading && pageData.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={cn(
                      "border-b border-gray-100 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                      selectedIds.has(emp.id) && "bg-blue-50",
                      "hover:bg-blue-50/70"
                    )}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp.id)}
                        onChange={() => setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.has(emp.id) ? next.delete(emp.id) : next.add(emp.id);
                          return next;
                        })}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-blue-800 font-semibold whitespace-nowrap">
                      {emp.accountTitle || emp.empId || "—"}
                      {emp.accountTitle && emp.empId && emp.accountTitle !== emp.empId && (
                        <span className="text-[10px] text-gray-400 font-normal block">{emp.empId}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => { setSelected(emp); setMode("view"); }} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title={t("عرض")}><Eye className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setSelected(emp); setMode("edit"); }} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded" title={t("تعديل")}><Edit className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(emp)} className="p-1 text-rose-600 hover:bg-rose-100 rounded" title={t("حذف")}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{locale === "en" ? emp.firstName || emp.name || "—" : emp.name || emp.firstName || "—"}</td>
                    {visibleColumns.englishName && <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.firstName || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.branch || "—"}</td>
                    {visibleColumns.directorate && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.directorate || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.department || "—"}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.jobTitle || "—"}</td>
                    {visibleColumns.nationality && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.nationality || "—"}</td>}
                    {visibleColumns.nationalId && <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{emp.nationalId || "—"}</td>}
                    {visibleColumns.hireDate && <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{emp.hireDate || "—"}</td>}
                    {visibleColumns.phone && <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.phone || "—"}</td>}
                    {visibleColumns.email && <td className="px-3 py-2 text-gray-500 whitespace-nowrap max-w-[160px] truncate">{emp.email || "—"}</td>}
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{emp.employmentType || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                        {emp.status ? t(emp.status) : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumnCount + 2} className="py-14 text-center text-gray-400">{t("لا يوجد موظفون")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: pagination + page size + count */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>{t("عرض")}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{t("من أصل")} {formatNumber(filtered.length)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 text-gray-500">
                {filtered.length > 0
                  ? `${formatNumber(pageStart + 1)} ${t("إلى")} ${formatNumber(Math.min(pageStart + pageSize, filtered.length))} ${t("من")} ${formatNumber(filtered.length)}`
                  : `0 ${t("نتائج")}`}
              </span>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = safePage <= 3 ? i + 1 : safePage + i - 2;
                if (pageNumber < 1 || pageNumber > totalPages) return null;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      "w-6 h-6 rounded border text-[11px] transition",
                      pageNumber === safePage
                        ? "bg-blue-700 text-white border-blue-700 font-bold"
                        : "bg-white border-gray-300 hover:bg-gray-100"
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">{t("العدد")}</span>
              <span className="font-bold text-blue-700">{formatNumber(filtered.length)}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );

  async function handleDelete(emp: EmpFormData) {
    if (!confirm(`${t("هل تريد حذف الموظف")} "${emp.name || emp.firstName}"؟`)) return;
    try {
      const { error } = await supabase.from("employees").delete().eq("id", emp.id);
      if (error) throw error;
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast({ title: t("تم الحذف"), description: `${t("تم حذف الموظف")}: ${emp.name || emp.firstName}` });
    } catch {
      toast({ title: t("خطأ"), description: t("فشل حذف الموظف"), variant: "destructive" });
    }
  }
}

// ─── Employee View ────────────────────────────────────────────────────────────
function EmployeeView({ employee: emp, onBack, onEdit }: { employee: EmpFormData; onBack: () => void; onEdit: () => void }) {
  const { t, direction, locale, formatNumber } = useI18n();

  return (
    <Layout>
      <div dir={direction} className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("بيانات الموظف")}</h1>
          <div className="flex gap-2">
            <button onClick={onBack} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              <ArrowRight className="h-4 w-4" /> {t("رجوع")}
            </button>
            <button onClick={onEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              <Edit className="h-4 w-4" /> {t("تعديل")}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
              {(emp.name || emp.firstName || "م").charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold">{locale === "en" ? emp.firstName || emp.name : emp.name || emp.firstName}</div>
              <div className="text-sm text-gray-500">{emp.empId} | {emp.jobTitle || "—"}</div>
              <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold border mt-1", STATUS_COLORS[emp.status] ?? "bg-gray-100 text-gray-600")}>
                {emp.status ? t(emp.status) : "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <InfoGroup title={t("المعلومات الشخصية")}>
              <InfoRow label={t("الجنسية")} value={emp.nationality} />
              <InfoRow label={t("رقم الهوية")} value={emp.nationalId} />
              <InfoRow label={t("الجنس")} value={emp.gender} />
              <InfoRow label={t("الحالة الاجتماعية")} value={emp.maritalStatus} />
              <InfoRow label={t("الهاتف")} value={emp.phone} />
              <InfoRow label={t("البريد الإلكتروني")} value={emp.email} />
            </InfoGroup>
            <InfoGroup title={t("المعلومات الوظيفية")}>
              <InfoRow label={t("القسم")} value={emp.department} />
              <InfoRow label={t("المسمى الوظيفي")} value={emp.jobTitle} />
              <InfoRow label={t("الفرع")} value={emp.branch} />
              <InfoRow label={t("تاريخ التعيين")} value={emp.hireDate} />
              <InfoRow label={t("المدير المباشر")} value={emp.directManager} />
              <InfoRow label={t("جدول العمل")} value={emp.workSchedule} />
            </InfoGroup>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-blue-700 font-semibold">{t("الراتب الأساسي")}</span>
            <span className="text-2xl font-bold text-blue-700">
              {formatNumber(emp.baseSalary, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t("ر.س")}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value || "—"}</span>
    </div>
  );
}
