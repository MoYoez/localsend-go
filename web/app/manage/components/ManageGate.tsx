"use client";

import Link from "next/link";
import { useNotify } from "../../context/NotifyContext";
import { useLanguage } from "../../context/LanguageContext";
import { isSameOriginAsApi } from "../../utils/apiBase";

export function ManageGate({ children }: { children: React.ReactNode }) {
  const notify = useNotify();
  const { t } = useLanguage();

  if (!notify) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-600 dark:text-zinc-400">{t("manage.loading")}</p>
      </div>
    );
  }

  if (!notify.notifyStatusFetched) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-600 dark:text-zinc-400">{t("manage.loading")}</p>
      </div>
    );
  }

  const allowed = notify.notifyWsEnabled && isSameOriginAsApi();
  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          {t("manage.unavailable")}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center max-w-md">
          {t("manage.unavailableHint")}
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600"
        >
          {t("nav.download")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
