"use client";

import { useCallback, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getApiBase } from "../../utils/apiBase";
import { apiPost, apiDelete } from "../../utils/api";
import { LuX } from "react-icons/lu";

interface ShareSessionItem {
  sessionId: string;
  downloadUrl: string;
  createdAt: number;
}

export function ShareSection() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ShareSessionItem[]>([]);
  const [pin, setPin] = useState("");
  const [autoAccept, setAutoAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [modalSession, setModalSession] = useState<ShareSessionItem | null>(null);

  const handleCreateSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, status } = await apiPost("/api/self/v1/create-share-session", {
      files: {},
      pin: pin.trim(),
      autoAccept,
    });
    setLoading(false);
    if (status !== 200) {
      const err = (data as { error?: string })?.error ?? "Failed to create session";
      setError(err);
      return;
    }
    const payload = data as { data?: { sessionId?: string; downloadUrl?: string } };
    const sid = payload?.data?.sessionId;
    const url = payload?.data?.downloadUrl;
    if (!sid) {
      setError("No sessionId");
      return;
    }
    const base = getApiBase();
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : base;
    const downloadUrl = url || (origin ? `${origin}/?session=${sid}` : `/?session=${sid}`);
    const newSession: ShareSessionItem = { sessionId: sid, downloadUrl, createdAt: Date.now() };
    setSessions((prev) => [newSession, ...prev]);
    setError(null);
    setModalSession(newSession);
  }, [pin, autoAccept]);

  const handleCloseSession = useCallback(async (sessionId: string) => {
    const { status } = await apiDelete(
      `/api/self/v1/close-share-session?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (status === 200) {
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      setModalSession((current) => (current?.sessionId === sessionId ? null : current));
    }
  }, []);

  const copyUrl = useCallback((url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopyFeedback(t("share.copied"));
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, [t]);

  return (
    <section id="share" className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
        {t("nav.share")}
      </h2>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {copyFeedback && (
        <p className="text-sm text-green-600 dark:text-green-400">{copyFeedback}</p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("share.createSessionDesc")}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t("share.requiresFilesNote")}
      </p>
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            {t("settings.pin")} ({t("share.optional")})
          </label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t("pin.placeholder")}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm w-32"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="share_auto_accept"
            checked={autoAccept}
            onChange={(e) => setAutoAccept(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="share_auto_accept" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("share.autoAccept")}
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCreateSession}
        disabled={loading}
        className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        {loading ? t("loading") : t("share.createSession")}
      </button>

      {sessions.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t("share.activeSessions")}
          </h3>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <button
                  type="button"
                  onClick={() => setModalSession(s)}
                  className="w-full text-left rounded border border-zinc-200 dark:border-zinc-700 p-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {t("share.downloadLink")}
                  </span>
                  <span className="ml-2 text-zinc-500 dark:text-zinc-400 truncate block">
                    {s.downloadUrl}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal: popup for link content */}
      {modalSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModalSession(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-lg w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t("share.downloadLink")}
              </h3>
              <button
                type="button"
                onClick={() => setModalSession(null)}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label={t("textReceived.close")}
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                readOnly
                value={modalSession.downloadUrl}
                className="flex-1 min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => copyUrl(modalSession.downloadUrl)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {t("share.copy")}
              </button>
              <button
                type="button"
                onClick={() => handleCloseSession(modalSession.sessionId)}
                className="rounded-md border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t("share.closeSession")}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("share.modalHint")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
