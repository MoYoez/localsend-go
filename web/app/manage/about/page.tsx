"use client";

import { useLanguage } from "../../context/LanguageContext";
import Link from "next/link";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {t("nav.about")}
      </h1>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p>LocalSend Go – Web management UI.</p>
        <p>
          <Link href="/" className="text-zinc-900 dark:text-zinc-100 underline">
            {t("nav.download")}
          </Link>{" "}
          – Download files via session link.
        </p>
        <p>
          <Link href="/manage" className="text-zinc-900 dark:text-zinc-100 underline">
            {t("nav.manage")}
          </Link>{" "}
          – Scan devices, send files, manage settings (when notify WebSocket is enabled).
        </p>
      </div>
    </div>
  );
}
