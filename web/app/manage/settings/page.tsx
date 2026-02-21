"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getApiBase } from "../../utils/apiBase";

interface ConfigResponse {
  alias: string;
  download_folder: string;
  pin: string;
  auto_save: boolean;
  auto_save_from_favorites: boolean;
  skip_notify: boolean;
  use_https: boolean;
  network_interface: string;
  scan_timeout: number;
  use_download: boolean;
  do_not_make_session_folder: boolean;
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const base = getApiBase();
    if (!base) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/self/v1/config`);
      if (!res.ok) throw new Error("Failed to load config");
      const data = await res.json();
      setConfig(data);
    } catch {
      setError(t("error.requestFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (updates: Partial<ConfigResponse>) => {
    if (!config) return;
    const base = getApiBase();
    if (!base) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${base}/api/self/v1/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to save");
      }
      setMessage(t("settings.saved"));
      setConfig((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.requestFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400">{t("loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {t("nav.settings")}
      </h1>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.alias")}
          </label>
          <input
            type="text"
            value={config.alias}
            onChange={(e) => setConfig((c) => (c ? { ...c, alias: e.target.value } : null))}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== config.alias) handleSave({ alias: v });
            }}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.downloadFolder")}
          </label>
          <input
            type="text"
            value={config.download_folder}
            onChange={(e) => setConfig((c) => (c ? { ...c, download_folder: e.target.value } : null))}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== config.download_folder) handleSave({ download_folder: v });
            }}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.pin")}
          </label>
          <input
            type="text"
            value={config.pin}
            onChange={(e) => setConfig((c) => (c ? { ...c, pin: e.target.value } : null))}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== config.pin) handleSave({ pin: v });
            }}
            placeholder={t("pin.placeholder")}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_save"
            checked={config.auto_save}
            onChange={(e) => {
              const v = e.target.checked;
              setConfig((c) => (c ? { ...c, auto_save: v } : null));
              handleSave({ auto_save: v });
            }}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="auto_save" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.autoSave")}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_https"
            checked={config.use_https}
            onChange={(e) => {
              const v = e.target.checked;
              setConfig((c) => (c ? { ...c, use_https: v } : null));
              handleSave({ use_https: v });
            }}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="use_https" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.useHttps")}
          </label>
        </div>
      </section>
      {saving && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("loading")}</p>
      )}
    </div>
  );
}
