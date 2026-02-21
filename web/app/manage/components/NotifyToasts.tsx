"use client";

import { useNotify } from "../../context/NotifyContext";

export function NotifyToasts() {
  const ctx = useNotify();
  if (!ctx) return null;
  const { toasts, removeToast } = ctx;
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
          {t.body && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.body}</p>
          )}
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="mt-1 text-xs underline text-zinc-500"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
