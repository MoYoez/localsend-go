"use client";

import { useLanguage } from "../../context/LanguageContext";
import { useNotify } from "../../context/NotifyContext";

export function TextReceivedModal() {
  const { t } = useLanguage();
  const ctx = useNotify();
  if (!ctx) return null;
  const { textReceived, textReceivedDismiss } = ctx;
  if (!textReceived) return null;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textReceived.content);
    }
    textReceivedDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {textReceived.title}
        </h2>
        <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">{textReceived.fileName}</p>
        <pre className="mb-4 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          {textReceived.content.slice(0, 2000)}
          {textReceived.content.length > 2000 ? "…" : ""}
        </pre>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
          >
            {t("textReceived.copy")}
          </button>
          <button
            type="button"
            onClick={() => textReceivedDismiss()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {t("textReceived.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
