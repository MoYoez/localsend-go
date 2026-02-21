"use client";

import { useLanguage } from "../../context/LanguageContext";
import { useNotify } from "../../context/NotifyContext";

export function ReceiveProgressPanel() {
  const { t } = useLanguage();
  const ctx = useNotify();
  if (!ctx) return null;
  const { receiveProgress } = ctx;
  if (!receiveProgress) return null;

  const { totalFiles, completedCount, currentFileName } = receiveProgress;
  const percent = totalFiles > 0 ? Math.min(100, Math.round((completedCount / totalFiles) * 100)) : 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {t("receiveProgress.receiving")}
      </p>
      <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
        {t("receiveProgress.filesCount")
          .replace("{current}", String(completedCount))
          .replace("{total}", String(totalFiles))}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {currentFileName && (
        <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
          {currentFileName}
        </p>
      )}
    </div>
  );
}
