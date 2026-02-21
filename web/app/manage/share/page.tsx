"use client";

import { useCallback, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getApiBase } from "../../utils/apiBase";

export default function SharePage() {
  const { t } = useLanguage();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = useCallback(async () => {
    const base = getApiBase();
    if (!base) return;
    setLoading(true);
    setError(null);
    setSessionId(null);
    setDownloadUrl(null);
    try {
      const res = await fetch(`${base}/api/self/v1/create-share-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to create session");
      }
      const data = await res.json();
      const sid = data?.data?.sessionId;
      if (!sid) throw new Error("No sessionId");
      setSessionId(sid);
      const origin = typeof window !== "undefined" ? window.location.origin : base;
      setDownloadUrl(`${origin}/?session=${sid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.requestFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const copyUrl = useCallback(() => {
    if (downloadUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(downloadUrl);
    }
  }, [downloadUrl]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {t("nav.share")}
      </h1>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("share.createSessionDesc")}
        </p>
        <button
          type="button"
          onClick={handleCreateSession}
          disabled={loading}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? t("loading") : t("share.createSession")}
        </button>
        {downloadUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("share.downloadLink")}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={downloadUrl}
                className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium"
              >
                {t("share.copy")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
