"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { apiGet, apiPatch } from "../../utils/api";

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

interface NetworkInterfaceOption {
  interface_name: string;
  ip_address: string;
  number?: string;
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterfaceOption[]>([]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, status } = await apiGet("/api/self/v1/config");
    if (status === 200 && data && typeof data === "object") {
      setConfig(data as ConfigResponse);
    } else {
      setError(t("error.requestFailed"));
    }
    setLoading(false);
  }, [t]);

  const fetchNetworkInterfaces = useCallback(async () => {
    const { data, status } = await apiGet("/api/self/v1/get-network-interfaces");
    if (status === 200 && data && typeof data === "object" && "data" in data) {
      const list = (data as { data: NetworkInterfaceOption[] }).data;
      setNetworkInterfaces(Array.isArray(list) ? list : []);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchNetworkInterfaces();
  }, [fetchConfig, fetchNetworkInterfaces]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const { data, status } = await apiPatch("/api/self/v1/config", config as object);
    if (status === 200) {
      setMessage(t("settings.saved"));
    } else {
      const err = (data as { error?: string })?.error;
      setError(err ?? t("error.requestFailed"));
    }
    setSaving(false);
  };

  if (loading || !config) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400">{t("loading")}</div>
    );
  }

  const networkOptions = [
    { value: "*", label: t("settings.networkInterfaceAll") },
    ...networkInterfaces.map((iface) => ({
      value: iface.interface_name,
      label: `${iface.interface_name} (${iface.ip_address})`,
    })),
  ];

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

      {/* Basic */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.basicConfig")}
        </h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.alias")}
          </label>
          <input
            type="text"
            value={config.alias}
            onChange={(e) => setConfig((c) => (c ? { ...c, alias: e.target.value } : null))}
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
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
      </section>

      {/* Auto save */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.autoSaveSection")}
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_save"
            checked={config.auto_save}
            onChange={(e) => setConfig((c) => (c ? { ...c, auto_save: e.target.checked } : null))}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="auto_save" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.autoSave")}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto_save_from_favorites"
            checked={config.auto_save_from_favorites}
            onChange={(e) => setConfig((c) => (c ? { ...c, auto_save_from_favorites: e.target.checked } : null))}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="auto_save_from_favorites" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.autoSaveFromFavorites")}
          </label>
        </div>
      </section>

      {/* Network */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.networkConfig")}
        </h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.networkInterface")}
          </label>
          <select
            value={config.network_interface}
            onChange={(e) => setConfig((c) => (c ? { ...c, network_interface: e.target.value } : null))}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          >
            {networkOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.scanTimeout")}
          </label>
          <input
            type="number"
            min={0}
            value={config.scan_timeout}
            onChange={(e) => setConfig((c) => (c ? { ...c, scan_timeout: parseInt(e.target.value, 10) || 0 } : null))}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("settings.scanTimeoutDesc")}</p>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.securityConfig")}
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="skip_notify"
            checked={config.skip_notify}
            disabled
            title={t("settings.skipNotifyReadOnly")}
            className="rounded border-zinc-300 dark:border-zinc-600 opacity-70"
          />
          <label htmlFor="skip_notify" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.skipNotify")}
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t("settings.pin")}
          </label>
          <input
            type="text"
            value={config.pin}
            onChange={(e) => setConfig((c) => (c ? { ...c, pin: e.target.value } : null))}
            placeholder={t("pin.placeholder")}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_https"
            checked={config.use_https}
            onChange={(e) => setConfig((c) => (c ? { ...c, use_https: e.target.checked } : null))}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="use_https" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.useHttps")}
          </label>
        </div>
      </section>

      {/* Advanced */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.advancedConfig")}
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_download"
            checked={config.use_download}
            onChange={(e) => setConfig((c) => (c ? { ...c, use_download: e.target.checked } : null))}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="use_download" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.useDownload")}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="do_not_make_session_folder"
            checked={config.do_not_make_session_folder}
            onChange={(e) => setConfig((c) => (c ? { ...c, do_not_make_session_folder: e.target.checked } : null))}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <label htmlFor="do_not_make_session_folder" className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("settings.doNotMakeSessionFolder")}
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? t("loading") : t("settings.saveButton")}
        </button>
        {saving && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("loading")}</span>
        )}
      </div>
    </div>
  );
}
