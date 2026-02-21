"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { apiGet, apiPatch } from "../../utils/api";
import { LuPlus, LuX } from "react-icons/lu";

interface FavoriteDeviceEntry {
  favorite_fingerprint: string;
  favorite_alias: string;
}

/** Full config from config.yaml (GET/PATCH /api/self/v1/config). */
interface ConfigResponse {
  alias: string;
  version: string;
  device_model: string;
  device_type: string;
  fingerprint: string;
  port: number;
  protocol: string;
  download: boolean;
  announce: boolean;
  cert_pem: string;
  key_pem: string;
  auto_save_from_favorites: boolean;
  favorite_devices: FavoriteDeviceEntry[];
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, status } = await apiGet("/api/self/v1/config");
    if (status === 200 && data && typeof data === "object") {
      const c = data as ConfigResponse;
      if (!Array.isArray(c.favorite_devices)) c.favorite_devices = [];
      setConfig(c);
    } else {
      setError(t("error.requestFailed"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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

  const updateFavorite = (index: number, field: "favorite_fingerprint" | "favorite_alias", value: string) => {
    setConfig((c) => {
      if (!c) return c;
      const list = [...(c.favorite_devices || [])];
      if (!list[index]) list[index] = { favorite_fingerprint: "", favorite_alias: "" };
      list[index] = { ...list[index], [field]: value };
      return { ...c, favorite_devices: list };
    });
  };
  const addFavorite = () => {
    setConfig((c) => (c ? { ...c, favorite_devices: [...(c.favorite_devices || []), { favorite_fingerprint: "", favorite_alias: "" }] } : null));
  };
  const removeFavorite = (index: number) => {
    setConfig((c) => {
      if (!c) return c;
      const list = (c.favorite_devices || []).filter((_, i) => i !== index);
      return { ...c, favorite_devices: list };
    });
  };

  if (loading || !config) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400">{t("loading")}</div>
    );
  }

  const favorites = config.favorite_devices || [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {t("nav.settings")}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("settings.configYamlOnly")}
      </p>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.basicConfig")}
        </h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.alias")}</label>
          <input
            type="text"
            value={config.alias}
            onChange={(e) => setConfig((c) => (c ? { ...c, alias: e.target.value } : null))}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.version")}</label>
          <input
            type="text"
            value={config.version}
            onChange={(e) => setConfig((c) => (c ? { ...c, version: e.target.value } : null))}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.deviceModel")}</label>
            <input
              type="text"
              value={config.device_model}
              onChange={(e) => setConfig((c) => (c ? { ...c, device_model: e.target.value } : null))}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.deviceType")}</label>
            <input
              type="text"
              value={config.device_type}
              onChange={(e) => setConfig((c) => (c ? { ...c, device_type: e.target.value } : null))}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.fingerprint")}</label>
          <input
            type="text"
            value={config.fingerprint}
            onChange={(e) => setConfig((c) => (c ? { ...c, fingerprint: e.target.value } : null))}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.port")}</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={config.port}
              onChange={(e) => setConfig((c) => (c ? { ...c, port: parseInt(e.target.value, 10) || 53317 } : null))}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.protocol")}</label>
            <select
              value={config.protocol}
              onChange={(e) => setConfig((c) => (c ? { ...c, protocol: e.target.value } : null))}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="http">http</option>
              <option value="https">https</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.autoSaveSection")}
        </h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="download"
              checked={config.download}
              onChange={(e) => setConfig((c) => (c ? { ...c, download: e.target.checked } : null))}
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <label htmlFor="download" className="text-sm text-zinc-700 dark:text-zinc-300">{t("settings.useDownload")}</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="announce"
              checked={config.announce}
              onChange={(e) => setConfig((c) => (c ? { ...c, announce: e.target.checked } : null))}
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <label htmlFor="announce" className="text-sm text-zinc-700 dark:text-zinc-300">{t("settings.announce")}</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_save_from_favorites"
              checked={config.auto_save_from_favorites}
              onChange={(e) => setConfig((c) => (c ? { ...c, auto_save_from_favorites: e.target.checked } : null))}
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <label htmlFor="auto_save_from_favorites" className="text-sm text-zinc-700 dark:text-zinc-300">{t("settings.autoSaveFromFavorites")}</label>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          TLS
        </h2>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.certPem")}</label>
          <textarea
            value={config.cert_pem}
            onChange={(e) => setConfig((c) => (c ? { ...c, cert_pem: e.target.value } : null))}
            rows={6}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t("settings.keyPem")}</label>
          <textarea
            value={config.key_pem}
            onChange={(e) => setConfig((c) => (c ? { ...c, key_pem: e.target.value } : null))}
            rows={4}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 pb-2">
          {t("settings.favoriteDevices")}
        </h2>
        <div className="space-y-2">
          {favorites.map((fav, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center rounded border border-zinc-200 dark:border-zinc-700 p-2">
              <input
                type="text"
                placeholder="fingerprint"
                value={fav.favorite_fingerprint}
                onChange={(e) => updateFavorite(i, "favorite_fingerprint", e.target.value)}
                className="flex-1 min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm font-mono"
              />
              <input
                type="text"
                placeholder="alias"
                value={fav.favorite_alias}
                onChange={(e) => updateFavorite(i, "favorite_alias", e.target.value)}
                className="flex-1 min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => removeFavorite(i)}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                aria-label={t("receiveHistory.delete")}
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFavorite}
          className="flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <LuPlus className="w-4 h-4" />
          {t("favorites.add")}
        </button>
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
