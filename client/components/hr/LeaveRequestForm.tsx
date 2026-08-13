import { useState, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from "@/lib/supabaseClient";
import { Calendar, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeSignatureField, { EmployeeSignature } from "./EmployeeSignatureField";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeaveRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeInfo?: {
    empId: string;
    name: string;
  };
}

export default function LeaveRequestForm({ open, onOpenChange, employeeInfo }: LeaveRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<EmployeeSignature | null>(null);
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    address: "",
    substituteId: "",
    phone: "",
    reason: "",
  });

  const duration = useMemo(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end >= start) {
        return differenceInDays(end, start) + 1;
      }
    }
    return 0;
  }, [formData.startDate, formData.endDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Validate
      if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.phone || !formData.reason || !formData.substituteId || !formData.address) {
        alert("يرجى تعبئة جميع الحقول الإلزامية");
        setLoading(false);
        return;
      }

      const empId = employeeInfo?.empId;
      const empName = employeeInfo?.name;
      if (!empId || !empName) {
        alert("تعذر تحديد بيانات الموظف مقدم الطلب");
        setLoading(false);
        return;
      }

      if (!signature) {
        alert("يجب إنشاء وحفظ توقيعك الإلكتروني قبل إرسال الطلب");
        setLoading(false);
        return;
      }

      const leaveTypeMap: Record<string, string> = {
        annual: "إجازة سنوية",
        sick: "إجازة مرضية",
        emergency: "إجازة اضطرارية",
        unpaid: "إجازة بدون راتب",
      };

      const { error } = await supabase.from("leave_requests").insert({
        emp_id: empId,
        emp_name: empName,
        leave_type: leaveTypeMap[formData.leaveType] || formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        status: "معلق",
        signature_data: signature.signatureData,
        signed_at: new Date().toISOString(),
        notes: `مدة الإجازة: ${duration} يوم | العنوان: ${formData.address} | البديل: ${formData.substituteId} | الهاتف: ${formData.phone} | السبب: ${formData.reason}`,
      });

      if (error) throw error;
      
      alert("تم إرسال الطلب بنجاح");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Leave request submission failed:", error);
      alert(error?.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden" dir="rtl">
        {/* Header */}
        <DialogHeader className="bg-white px-6 py-4 border-b border-gray-100 flex flex-row justify-between items-center space-y-0 text-right">
          <DialogTitle className="text-xl font-bold text-gray-800">الإجازات</DialogTitle>
        </DialogHeader>

        {/* Form Body */}
        <div className="p-6 bg-white space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {/* Right Column */}
            <div className="space-y-6">
              {/* Leave Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> نوع الإجازة
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right appearance-none"
                  style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"%239CA3AF\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/></svg>')", backgroundPosition: "left 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                >
                  <option value="" disabled></option>
                  <option value="annual">إجازة سنوية</option>
                  <option value="sick">إجازة مرضية</option>
                  <option value="emergency">إجازة اضطرارية</option>
                  <option value="unpaid">إجازة بدون راتب</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> تاريخ البداية
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="هجري (اختياري)"
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-10 bg-gray-50/50"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">مدة الإجازة</label>
                <div className="w-full h-10 px-3 border border-gray-200 rounded-lg bg-gray-100 flex items-center justify-end text-sm text-gray-500">
                  {duration > 0 ? `${duration} يوم` : ""}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> الهاتف
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Left Column */}
            <div className="space-y-6 pt-[72px]">
              {/* Note: the pt-[72px] is to align with the start date row, leaving the first row blank as in screenshot */}
              
              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> تاريخ الانتهاء
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="هجري (اختياري)"
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-10 bg-gray-50/50"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Address During Leave */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> عنوان الموظف أثناء الإجازة
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>

              {/* Substitute Employee */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-end">
                  <span className="text-red-500 ml-1">*</span> الموظف البديل
                </label>
                <select
                  name="substituteId"
                  value={formData.substituteId}
                  onChange={handleChange}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right appearance-none"
                  style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"%239CA3AF\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/></svg>')", backgroundPosition: "left 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                >
                  <option value="" disabled></option>
                  <option value="1">عبدالمجيد شودري</option>
                  <option value="2">محمد أحمد</option>
                  <option value="3">علي محمود</option>
                </select>
              </div>
            </div>
          </div>

          {/* Full Width Fields */}
          <div className="space-y-6 pt-4">
            
            {/* Additional Data Button */}
            <button className="w-full py-3 border border-blue-200 rounded-lg text-blue-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
              <span>بيانات إضافية</span>
              <Plus className="h-4 w-4" />
            </button>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex justify-end">
                <span className="text-red-500 ml-1">*</span> السبب
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right resize-none"
              />
            </div>

            <EmployeeSignatureField onChange={setSignature} />

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex justify-end">المرفق</label>
              <button className="w-full py-3 border border-blue-200 rounded-lg text-blue-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
                <span>إضافة مرفقات</span>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
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
