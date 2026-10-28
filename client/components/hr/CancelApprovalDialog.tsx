import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { useI18n } from "@/i18n";

/**
 * HR-24: نافذة إلغاء الاعتماد بعد الاعتماد النهائي، بسبب إلزامي (السلف والساعات الإضافية والجزاءات).
 * title وdescription نص عربي يُترجم هنا. onConfirm يستقبل السبب بعد إزالة المسافات.
 */
export default function CancelApprovalDialog({
  open,
  title,
  description,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const { t, direction } = useI18n();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  if (!open) return null;
  const trimmed = note.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" dir={direction} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            {t(title)}
          </h2>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title={t("إغلاق")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <p className="text-gray-700">{t(description)}</p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("سبب إلغاء الاعتماد (إلزامي)")}
            rows={3}
            maxLength={1000}
            className={`w-full resize-none rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${trimmed ? "border-gray-200" : "border-red-300"}`}
          />
        </div>
        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <button type="button" disabled={busy} onClick={onClose} className="rounded border px-4 py-2 text-sm">{t("تراجع")}</button>
          <button type="button" disabled={busy || !trimmed} onClick={() => onConfirm(trimmed)} className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {t("تأكيد إلغاء الاعتماد")}
          </button>
        </div>
      </div>
    </div>
  );
}
