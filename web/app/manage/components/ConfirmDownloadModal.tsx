"use client";

import { useLanguage } from "../../context/LanguageContext";
import { useNotify } from "../../context/NotifyContext";

export function ConfirmDownloadModal() {
  const { t } = useLanguage();
  const ctx = useNotify();
  if (!ctx) return null;
  const { confirmDownload, confirmDownloadResponse } = ctx;
  if (!confirmDownload) return null;

  const handleConfirm = (confirmed: boolean) => {
    confirmDownloadResponse(confirmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {t("confirmDownload.title")}
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {confirmDownload.fileCount} {t("confirmReceive.files")}
        </p>
        {confirmDownload.files.length > 0 && (
          <ul className="mb-4 max-h-40 overflow-y-auto text-sm text-zinc-600 dark:text-zinc-400">
            {confirmDownload.files.slice(0, 10).map((f, i) => (
              <li key={i}>{f.fileName}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            {t("confirmReceive.reject")}
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t("confirmReceive.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
