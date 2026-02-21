"use client";

import { useLanguage } from "../../context/LanguageContext";
import { useNotify } from "../../context/NotifyContext";
import { LuTrash2, LuX } from "react-icons/lu";

export function ReceiveHistoryPanel() {
  const { t } = useLanguage();
  const ctx = useNotify();
  if (!ctx) return null;
  const { receiveHistory, clearReceiveHistory, deleteReceiveHistoryItem } = ctx;
  const list = receiveHistory ?? [];
  if (list.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("receiveHistory.title")}
        </h2>
        <button
          type="button"
          onClick={clearReceiveHistory}
          className="flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <LuTrash2 className="w-3 h-3" />
          {t("receiveHistory.clear")}
        </button>
      </div>
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {list.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-2 rounded border border-zinc-200 dark:border-zinc-700 p-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {item.title}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {item.isText
                  ? item.textContent?.slice(0, 80) + (item.textContent && item.textContent.length > 80 ? "…" : "")
                  : item.folderPath
                    ? `${item.fileCount} ${t("receiveHistory.files")} · ${item.folderPath}`
                    : `${item.fileCount} ${t("receiveHistory.files")}`}
              </p>
              {!item.isText && item.files.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {item.files.slice(0, 3).join(", ")}
                  {item.files.length > 3 ? ` +${item.files.length - 3}` : ""}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteReceiveHistoryItem(item.id)}
              className="rounded p-1 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
              title={t("receiveHistory.delete")}
            >
              <LuX className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
