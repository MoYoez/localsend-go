"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useNotify } from "../context/NotifyContext";
import { apiGet, apiPost, apiDelete } from "../utils/api";
import { LuRefreshCw, LuUpload, LuScan, LuPlus, LuX, LuHeart } from "react-icons/lu";
import { ShareSection } from "./components/ShareSection";
import type { ScanDevice } from "../types";

interface FavoriteDevice {
  favorite_fingerprint: string;
  favorite_alias: string;
}

type SelectedItem =
  | { type: "file"; id: string; file: File }
  | { type: "text"; id: string; fileName: string; textContent: string };

export default function ManagePage() {
  const { t } = useLanguage();
  const notifyCtx = useNotify();
  const devices = useMemo(() => notifyCtx?.devices ?? [], [notifyCtx?.devices]);
  const setDevices = useMemo(() => notifyCtx?.setDevices ?? (() => {}), [notifyCtx?.setDevices]);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ScanDevice | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteDevice[]>([]);
  const [sendProgress, setSendProgress] = useState<{
    sessionId: string;
    total: number;
    completed: number;
  } | null>(null);
  const [pinPrompt, setPinPrompt] = useState<string | null>(null);
  const [addTextOpen, setAddTextOpen] = useState(false);
  const [addTextValue, setAddTextValue] = useState("");
  const [addFavoriteOpen, setAddFavoriteOpen] = useState(false);
  const [addFavoriteAlias, setAddFavoriteAlias] = useState("");
  const addFavoriteDeviceRef = useRef<ScanDevice | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ running: boolean; notify_ws_enabled?: boolean }>({ running: false });
  const [networkInfo, setNetworkInfo] = useState<{ interface_name: string; ip_address: string; number?: string }[]>([]);
  const [deviceAlias, setDeviceAlias] = useState("");
  const [devicePort, setDevicePort] = useState(53317);

  const fetchDevices = useCallback(async () => {
    const { data, status } = await apiGet("/api/self/v1/scan-current");
    if (status === 200 && data && typeof data === "object" && "data" in data) {
      setDevices((data as { data: ScanDevice[] }).data);
    }
  }, [setDevices]);

  const fetchFavorites = useCallback(async () => {
    const { data, status } = await apiGet("/api/self/v1/favorites");
    if (status === 200 && data && typeof data === "object" && "data" in data) {
      const list = (data as { data: FavoriteDevice[] }).data;
      setFavorites(Array.isArray(list) ? list : []);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    fetchFavorites();
  }, [fetchDevices, fetchFavorites]);

  useEffect(() => {
    apiGet("/api/self/v1/status").then(({ data, status }) => {
      if (status === 200 && data && typeof data === "object") {
        const d = data as { running?: boolean; notify_ws_enabled?: boolean };
        setBackendStatus({ running: !!d.running, notify_ws_enabled: !!d.notify_ws_enabled });
      }
    });
    apiGet("/api/self/v1/get-network-info").then(({ data, status }) => {
      if (status === 200 && data && typeof data === "object" && "data" in data) {
        const list = (data as { data: { interface_name: string; ip_address: string; number?: string }[] }).data;
        setNetworkInfo(Array.isArray(list) ? list : []);
      }
    });
    apiGet("/api/localsend/v2/info").then(({ data, status }) => {
      if (status === 200 && data && typeof data === "object" && "alias" in data) {
        const info = data as { alias?: string; port?: number };
        setDeviceAlias(String(info.alias ?? ""));
        if (typeof info.port === "number") setDevicePort(info.port);
      }
    });
  }, []);

  const handleRefresh = async () => {
    setRefreshLoading(true);
    setError(null);
    await fetchDevices();
    setRefreshLoading(false);
  };

  const handleScan = async () => {
    setScanLoading(true);
    setError(null);
    setDevices([]);
    setSelectedDevice(null);
    try {
      const { data, status } = await apiGet("/api/self/v1/scan-now");
      if (status === 200 && data && typeof data === "object" && "data" in data) {
        setDevices((data as { data: ScanDevice[] }).data);
      } else {
        setError(t("error.requestFailed"));
      }
    } catch {
      setError(t("error.requestFailed"));
    } finally {
      setScanLoading(false);
    }
  };

  const handleAddText = () => {
    if (!addTextValue.trim()) return;
    const id = `text-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setSelectedItems((prev) => [
      ...prev,
      {
        type: "text",
        id,
        fileName: `text-${Date.now()}.txt`,
        textContent: addTextValue.trim(),
      },
    ]);
    setAddTextValue("");
    setAddTextOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newItems: SelectedItem[] = files.map((file, i) => ({
      type: "file" as const,
      id: `f-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}`,
      file,
    }));
    setSelectedItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.id !== id));
  };

  const getOnlineFavorites = useCallback(() => {
    return favorites.map((fav) => {
      const device = devices.find((d) => d.fingerprint === fav.favorite_fingerprint);
      return { ...fav, online: !!device, device };
    });
  }, [favorites, devices]);

  const doPrepare = useCallback(
    async (targetFingerprint: string, pin?: string): Promise<{ sessionId: string; tokens: Record<string, string> } | null> => {
      const files: Record<string, { id: string; fileName: string; size: number; fileType: string }> = {};
      selectedItems.forEach((it) => {
        if (it.type === "file") {
          files[it.id] = {
            id: it.id,
            fileName: it.file.name,
            size: it.file.size,
            fileType: it.file.type || "application/octet-stream",
          };
        } else {
          const bytes = new TextEncoder().encode(it.textContent).length;
          files[it.id] = {
            id: it.id,
            fileName: it.fileName,
            size: bytes,
            fileType: "text/plain",
          };
        }
      });
      const path = pin
        ? `/api/self/v1/prepare-upload?pin=${encodeURIComponent(pin)}`
        : "/api/self/v1/prepare-upload";
      const prepareResult = await apiPost(path, {
        targetTo: targetFingerprint,
        files,
      });
      if (prepareResult.status === 401) {
        setPinPrompt(targetFingerprint);
        return null;
      }
      if (prepareResult.status !== 200) {
        const err = (prepareResult.data as { error?: string })?.error;
        throw new Error(err ?? `Prepare failed: ${prepareResult.status}`);
      }
      const payload = prepareResult.data as { data?: { sessionId?: string; files?: Record<string, string> } };
      const sessionId = payload?.data?.sessionId;
      const tokens = payload?.data?.files ?? {};
      if (!sessionId || typeof tokens !== "object") throw new Error("No sessionId or files");
      return { sessionId, tokens };
    },
    [selectedItems]
  );

  const doUpload = useCallback(
    async (sessionId: string, tokens: Record<string, string>): Promise<void> => {
      let completed = 0;
      const total = selectedItems.length;
      setSendProgress({ sessionId, total, completed });

      for (const it of selectedItems) {
        const token = tokens[it.id];
        if (token == null) continue;
        const url = `/api/self/v1/upload?sessionId=${encodeURIComponent(sessionId)}&fileId=${encodeURIComponent(it.id)}&token=${encodeURIComponent(token)}`;
        let body: ArrayBuffer | Uint8Array;
        if (it.type === "file") {
          body = await it.file.arrayBuffer();
        } else {
          body = new TextEncoder().encode(it.textContent);
        }
        const uploadResult = await apiPost(url, undefined, body);
        completed += 1;
        setSendProgress((p) => (p ? { ...p, completed } : null));
        if (uploadResult.status !== 200) {
          const err = (uploadResult.data as { error?: string })?.error;
          throw new Error(err ?? "Upload failed");
        }
      }
      setSendProgress(null);
      setSelectedItems([]);
    },
    [selectedItems]
  );

  const runSend = useCallback(
    async (device: ScanDevice) => {
      if (selectedItems.length === 0) {
        setError(t("manage.selectDeviceAndFiles"));
        return;
      }
      setUploading(true);
      setError(null);
      try {
        const prep = await doPrepare(device.fingerprint!);
        if (!prep) return;
        await doUpload(prep.sessionId, prep.tokens);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error.requestFailed"));
      } finally {
        setUploading(false);
        setSendProgress(null);
      }
    },
    [selectedItems, doPrepare, doUpload, t]
  );

  const handleSend = async () => {
    if (!selectedDevice) {
      setError(t("manage.selectDeviceAndFiles"));
      return;
    }
    await runSend(selectedDevice);
  };

  const handlePinSubmit = async (pin: string) => {
    if (!selectedDevice?.fingerprint) return;
    const prep = await doPrepare(selectedDevice.fingerprint, pin);
    if (!prep) return;
    setPinPrompt(null);
    setUploading(true);
    setError(null);
    try {
      await doUpload(prep.sessionId, prep.tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error.requestFailed"));
    } finally {
      setUploading(false);
      setSendProgress(null);
    }
  };

  const handleCancelSend = async () => {
    if (!sendProgress?.sessionId) return;
    await apiPost(`/api/self/v1/cancel?sessionId=${encodeURIComponent(sendProgress.sessionId)}`, {});
    setSendProgress(null);
    setUploading(false);
  };

  const handleAddToFavorites = (device: ScanDevice) => {
    addFavoriteDeviceRef.current = device;
    setAddFavoriteAlias(device.alias ?? "");
    setAddFavoriteOpen(true);
  };

  const confirmAddFavorite = async () => {
    const device = addFavoriteDeviceRef.current;
    if (!device?.fingerprint) return;
    const alias = addFavoriteAlias.trim() || device.alias || device.fingerprint.slice(0, 8);
    const { status } = await apiPost("/api/self/v1/favorites", {
      favorite_fingerprint: device.fingerprint,
      favorite_alias: alias,
    });
    if (status === 200) {
      await fetchFavorites();
      setAddFavoriteOpen(false);
      setAddFavoriteAlias("");
      addFavoriteDeviceRef.current = null;
    } else {
      setError(t("error.requestFailed"));
    }
  };

  const handleRemoveFavorite = async (fingerprint: string) => {
    const { status } = await apiDelete(`/api/self/v1/favorites/${encodeURIComponent(fingerprint)}`);
    if (status === 200) await fetchFavorites();
  };

  const onlineFavorites = getOnlineFavorites();
  const hasSelection = selectedItems.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t("nav.manage")}</h1>

      {/* Status & network info */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("status.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{t("status.backend")}:</span>{" "}
            {backendStatus.running ? t("status.running") : t("status.stopped")}
          </p>
          {backendStatus.notify_ws_enabled != null && (
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{t("status.notifyWs")}:</span>{" "}
              {backendStatus.notify_ws_enabled ? t("status.enabled") : t("status.disabled")}
            </p>
          )}
          <p className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{t("status.deviceName")}:</span>{" "}
            {deviceAlias || "-"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{t("status.port")}:</span> {devicePort}
          </p>
        </div>
        {networkInfo.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t("status.network")}</p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
              {networkInfo.map((info, i) => (
                <li key={`${info.interface_name}-${i}`}>
                  {info.number ?? info.interface_name}: {info.ip_address}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Devices */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("manage.devices")}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <LuRefreshCw className={`w-4 h-4 ${refreshLoading ? "animate-spin" : ""}`} />
            {refreshLoading ? t("loading") : t("manage.refresh")}
          </button>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanLoading}
            className="flex items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            <LuScan className={`w-4 h-4 ${scanLoading ? "animate-spin" : ""}`} />
            {scanLoading ? t("loading") : t("manage.scan")}
          </button>
        </div>
        <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {devices.length === 0 && !scanLoading && (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">{t("manage.noDevices")}</li>
          )}
          {devices.map((d) => {
            const isFav = favorites.some((f) => f.favorite_fingerprint === d.fingerprint);
            return (
              <li
                key={d.fingerprint ?? d.ip_address}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                  selectedDevice?.fingerprint === d.fingerprint
                    ? "bg-zinc-200 dark:bg-zinc-700"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 text-left cursor-pointer"
                  onClick={() => setSelectedDevice(d)}
                >
                  {d.alias ?? d.ip_address ?? d.fingerprint ?? "?"}
                </button>
                <button
                  type="button"
                  onClick={() => (isFav ? handleRemoveFavorite(d.fingerprint!) : handleAddToFavorites(d))}
                  className={`ml-2 rounded p-1 ${isFav ? "text-red-500 fill-red-500 hover:bg-red-100 dark:hover:bg-red-900/30" : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}
                  title={isFav ? t("favorites.remove") : t("favorites.add")}
                >
                  <LuHeart className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Favorites quick send */}
      {hasSelection && favorites.length > 0 && (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("favorites.quickSend")}</h2>
          <div className="flex flex-wrap gap-2">
            {onlineFavorites.map((fav) => (
              <button
                key={fav.favorite_fingerprint}
                type="button"
                disabled={!fav.online || uploading}
                onClick={() => fav.device && runSend(fav.device!)}
                className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-3 py-2 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                {fav.favorite_alias || fav.favorite_fingerprint.slice(0, 8)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Files & send */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">{t("manage.files")}</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="manage-file-input"
          />
          <label
            htmlFor="manage-file-input"
            className="flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("manage.chooseFiles")}
          </label>
          <button
            type="button"
            onClick={() => setAddTextOpen(true)}
            disabled={uploading}
            className="flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <LuPlus className="w-4 h-4" />
            {t("manage.addText")}
          </button>
        </div>
        {selectedItems.length > 0 && (
          <>
            <ul className="max-h-40 overflow-y-auto space-y-1 mb-3">
              {selectedItems.map((it) => (
                <li key={it.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    {it.type === "file" ? it.file.name : it.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={uploading}
                    className="ml-2 rounded p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    <LuX className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              {selectedItems.length} {t("manage.filesSelected")}
            </p>
          </>
        )}

        {sendProgress && (
          <div className="mb-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {t("sendProgress.sending")} {sendProgress.completed} / {sendProgress.total}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 mb-2">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                style={{
                  width: `${sendProgress.total ? (sendProgress.completed / sendProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleCancelSend}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              {t("sendProgress.cancel")}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={!selectedDevice || selectedItems.length === 0 || uploading}
            className="flex items-center gap-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            <LuUpload className="w-4 h-4" />
            {uploading ? t("loading") : t("manage.send")}
          </button>
          {selectedDevice && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              → {selectedDevice.alias ?? selectedDevice.ip_address ?? selectedDevice.fingerprint}
            </span>
          )}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Share link section at bottom of manage page; content shown in modal */}
      <ShareSection />

      {/* PIN prompt */}
      {pinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("pin.title")}</p>
            <input
              type="text"
              autoFocus
              placeholder={t("pin.placeholder")}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePinSubmit((e.target as HTMLInputElement).value);
                }
                if (e.key === "Escape") setPinPrompt(null);
              }}
              id="pin-input"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const v = document.getElementById("pin-input") as HTMLInputElement;
                  if (v) handlePinSubmit(v.value);
                }}
                className="flex-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium"
              >
                {t("pin.continue")}
              </button>
              <button
                type="button"
                onClick={() => setPinPrompt(null)}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium"
              >
                {t("textReceived.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add text modal */}
      {addTextOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("manage.addText")}</p>
            <textarea
              value={addTextValue}
              onChange={(e) => setAddTextValue(e.target.value)}
              placeholder={t("manage.addTextPlaceholder")}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-h-[100px] mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddText}
                disabled={!addTextValue.trim()}
                className="flex-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {t("pin.continue")}
              </button>
              <button
                type="button"
                onClick={() => { setAddTextOpen(false); setAddTextValue(""); }}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium"
              >
                {t("textReceived.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add favorite modal */}
      {addFavoriteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t("favorites.add")}</p>
            <input
              type="text"
              value={addFavoriteAlias}
              onChange={(e) => setAddFavoriteAlias(e.target.value)}
              placeholder={t("favorites.aliasPlaceholder")}
              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmAddFavorite}
                className="flex-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium"
              >
                {t("pin.continue")}
              </button>
              <button
                type="button"
                onClick={() => { setAddFavoriteOpen(false); addFavoriteDeviceRef.current = null; }}
                className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium"
              >
                {t("textReceived.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
