import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Upload, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormSchema, FormField } from "./formSchemas";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: FormSchema | null;
  employeeInfo?: {
    empId: string;
    name: string;
  };
}

export default function DynamicRequestForm({ open, onOpenChange, schema, employeeInfo }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  if (!schema) return null;

  const handleSubmit = async () => {
    if (!schema) return;

    const requiredFields = schema.fields.filter((f) => f.required);
    const missingRequired = requiredFields.find((f) => {
      const value = formData[f.name];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missingRequired) {
      toast.error(`يرجى تعبئة الحقل الإلزامي: ${missingRequired.label}`);
      return;
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const startDate =
      formData.start_date ||
      formData.date ||
      formData.from_date ||
      formData.return_date ||
      formData.transfer_date ||
      formData.proposed_date ||
      formData.last_day ||
      today;

    const endDate =
      formData.end_date ||
      formData.to_date ||
      formData.date ||
      formData.last_day ||
      startDate;

    const empId = employeeInfo?.empId || "EMP-001";
    const empName = employeeInfo?.name || "موظف";

    setLoading(true);
    try {
      const { error } = await supabase.from("leave_requests").insert([
        {
          emp_id: empId,
          emp_name: empName,
          leave_type: schema.title,
          start_date: startDate,
          end_date: endDate,
          status: "معلق",
          notes: JSON.stringify(formData),
        },
      ]);

      if (error) throw error;

      toast.success("تم إرسال الطلب بنجاح");
      setFormData({});
      onOpenChange(false);
    } catch {
      toast.error("تعذر إرسال الطلب، تحقق من إعدادات قاعدة البيانات");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const commonClass = "w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white";
    
    switch (field.type) {
      case "text":
      case "number":
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className={commonClass}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case "date":
        return (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                className={cn(commonClass, "pr-10")}
                value={formData[field.name] || ""}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="هجري (اختياري)"
                className={cn(commonClass, "pr-10 bg-gray-50/50")}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        );
      case "time":
        return (
          <input
            type="time"
            className={commonClass}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case "select":
        return (
          <select
            className={cn(commonClass, "appearance-none")}
            style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"%239CA3AF\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/></svg>')", backgroundPosition: "left 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          >
            <option value="" disabled></option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right resize-none"
            value={formData[field.name] || ""}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case "radio":
        return (
          <div className="flex items-center gap-6 h-10 px-3 bg-white border border-gray-200 rounded-lg justify-end">
            {field.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-700">{opt.label}</span>
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={formData[field.name] === opt.value}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        );
      case "table":
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden mt-1">
            <div className="bg-[#004e89] text-white text-[13px] font-medium flex justify-between px-4 py-2">
              {field.tableColumns?.map((c, i) => (
                <div key={i} className="flex-1 text-center">{c}</div>
              ))}
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-sm text-gray-500 bg-gray-50/50 min-h-[100px]">
              لا يوجد شيء للعرض
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-white" dir="rtl">
        <DialogHeader className="bg-white px-6 py-4 border-b border-gray-100 flex flex-row justify-between items-center space-y-0 text-right">
          <DialogTitle className="text-xl font-bold text-gray-800">{schema.title}</DialogTitle>
        </DialogHeader>

        <div className="p-6 bg-white max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {schema.fields.map((field) => (
              <div
                key={field.name}
                className={cn(
                  "space-y-2",
                  field.colSpan === 2 ? "col-span-2" : "col-span-1"
                )}
              >
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-8">
            <label className="text-sm font-medium text-gray-700 flex justify-end">المرفق</label>
            <button className="w-full py-3 border border-blue-200 rounded-lg text-blue-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
              <span>إضافة مرفقات</span>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "px-8 py-2 bg-[#004e89] hover:bg-[#003d6d] text-white font-medium rounded-lg text-sm transition-colors",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? "جاري الإرسال..." : "إرسال"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
