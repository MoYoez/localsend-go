"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { getApiBase } from "../utils/apiBase";
import { LuRefreshCw, LuUpload } from "react-icons/lu";

interface ScanDevice {
  alias?: string;
  ip_address?: string;
  deviceModel?: string;
  deviceType?: string;
  fingerprint?: string;
  port?: number;
  protocol?: string;
}

export default function ManagePage() {
  const { t } = useLanguage();
  const [devices, setDevices] = useState<ScanDevice[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ScanDevice | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    const base = getApiBase();
    if (!base) return;
    try {
      const res = await fetch(`${base}/api/self/v1/scan-current`);
      const data = await res.json();
      if (data?.data) setDevices(data.data as ScanDevice[]);
    } catch {
      setError(t("error.requestFailed"));
    }
  }, [t]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleScan = async () => {
    setScanLoading(true);
    setError(null);
    const base = getApiBase();
    if (!base) {
      setScanLoading(false);
      return;
    }
    try {
      const res = await fetch(`${base}/api/self/v1/scan-now`);
      const data = await res.json();
      if (data?.data) setDevices(data.data as ScanDevice[]);
    } catch {
      setError(t("error.requestFailed"));
    } finally {
      setScanLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedDevice || selectedFiles.length === 0) {
      setError(t("manage.selectDeviceAndFiles"));
      return;
    }
    setUploading(true);
    setError(null);
    const base = getApiBase();
    if (!base) {
      setUploading(false);
      return;
    }
    try {
      const files: Record<string, { id: string; fileName: string; size: number; fileType: string }> = {};
      selectedFiles.forEach((f, i) => {
        const fileId = `f-${i}`;
        files[fileId] = {
          id: fileId,
          fileName: f.name,
          size: f.size,
          fileType: f.type || "application/octet-stream",
        };
      });
      const prepareRes = await fetch(`${base}/api/self/v1/prepare-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTo: selectedDevice.fingerprint, files }),
      });
      if (!prepareRes.ok) {
        const errData = await prepareRes.json().catch(() => ({}));
        throw new Error(errData?.error ?? `Prepare failed: ${prepareRes.status}`);
      }
      const prepareData = await prepareRes.json();
      const sessionId = prepareData?.data?.sessionId;
      const tokens = prepareData?.data?.files ?? {};
      if (!sessionId || typeof tokens !== "object") throw new Error("No sessionId or files");
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileId = `f-${i}`;
        const token = tokens[fileId];
        if (token == null) continue;
        const file = selectedFiles[i];
        const uploadRes = await fetch(
          `${base}/api/self/v1/upload?sessionId=${encodeURIComponent(sessionId)}&fileId=${encodeURIComponent(fileId)}&token=${encodeURIComponent(token)}`,
          { method: "POST", body: await file.arrayBuffer() }
        );
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData?.error ?? `Upload ${file.name} failed`);
        }
      }
      setSelectedFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.requestFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("nav.manage")}</h1>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("manage.devices")}</h2>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanLoading}
            className="flex items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            <LuRefreshCw className={`w-4 h-4 ${scanLoading ? "animate-spin" : ""}`} />
            {scanLoading ? t("loading") : t("manage.scan")}
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {devices.length === 0 && !scanLoading && (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">{t("manage.noDevices")}</li>
          )}
          {devices.map((d) => (
            <li
              key={d.fingerprint ?? d.ip_address}
              onClick={() => setSelectedDevice(d)}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                selectedDevice?.fingerprint === d.fingerprint
                  ? "bg-zinc-200 dark:bg-zinc-700"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {d.alias ?? d.ip_address ?? d.fingerprint ?? "?"}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">{t("manage.files")}</h2>
        <input
          type="file"
          multiple
          onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-4 file:rounded file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-900 dark:file:bg-zinc-800 dark:file:text-zinc-100"
        />
        {selectedFiles.length > 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {selectedFiles.length} {t("manage.filesSelected")}
          </p>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={!selectedDevice || selectedFiles.length === 0 || uploading}
        className="flex items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
      >
        <LuUpload className="w-4 h-4" />
        {uploading ? t("loading") : t("manage.send")}
      </button>
    </div>
  );
}
