"use client";

import type {
  NotifyMessage,
  NotifyState,
  ReceiveHistoryItem,
  ScanDevice,
} from "../types";

type SetNotifyState = React.Dispatch<React.SetStateAction<NotifyState>>;
type AddToast = (title: string, body: string) => void;

type NotifyHandler = (
  msg: NotifyMessage,
  setState: SetNotifyState,
  addToast: AddToast
) => void;

function mergeDeviceIntoList(list: ScanDevice[], device: ScanDevice): ScanDevice[] {
  const fp = device.fingerprint;
  if (!fp) return list;
  const next: ScanDevice = {
    fingerprint: device.fingerprint,
    alias: device.alias,
    ip_address: device.ip_address,
    port: device.port,
    protocol: device.protocol,
    deviceType: device.deviceType,
    deviceModel: device.deviceModel,
  };
  const idx = list.findIndex((d) => d.fingerprint === fp);
  if (idx >= 0) {
    const out = [...list];
    out[idx] = { ...out[idx], ...next };
    return out;
  }
  return [...list, next];
}

const handlers: Record<string, NotifyHandler> = {
  device_discovered(msg, setState, _addToast) {
    const d = (msg.data ?? {}) as ScanDevice;
    setState((s) => ({ ...s, devices: mergeDeviceIntoList(s.devices ?? [], d) }));
  },
  device_updated(msg, setState, _addToast) {
    const d = (msg.data ?? {}) as ScanDevice;
    setState((s) => ({ ...s, devices: mergeDeviceIntoList(s.devices ?? [], d) }));
  },
  confirm_recv(msg, setState, _addToast) {
    const d = msg.data ?? {};
    setState((s) => ({
      ...s,
      confirmRecv: {
        sessionId: String(d.sessionId ?? ""),
        from: String(d.from ?? ""),
        fileCount: Number(d.fileCount ?? 0),
        files: Array.isArray(d.files) ? d.files : [],
        totalFiles: d.totalFiles != null ? Number(d.totalFiles) : undefined,
      },
    }));
  },

  confirm_download(msg, setState, _addToast) {
    const d = msg.data ?? {};
    setState((s) => ({
      ...s,
      confirmDownload: {
        sessionId: String(d.sessionId ?? ""),
        clientKey: String(d.clientKey ?? ""),
        fileCount: Number(d.fileCount ?? 0),
        files: Array.isArray(d.files) ? d.files : [],
        totalFiles: d.totalFiles != null ? Number(d.totalFiles) : undefined,
        clientIp: d.clientIp != null ? String(d.clientIp) : undefined,
        clientType: d.clientType != null ? String(d.clientType) : undefined,
        userAgent: d.userAgent != null ? String(d.userAgent) : undefined,
      },
    }));
  },

  text_received(msg, setState, _addToast) {
    const d = msg.data ?? {};
    const title = String(d.title ?? msg.title ?? "Text Received");
    const content = String(d.content ?? msg.message ?? "");
    const fileName = String(d.fileName ?? "");
    setState((s) => {
      const textReceived = {
        sessionId: String(d.sessionId ?? ""),
        title,
        content,
        fileName,
      };
      const historyItem: ReceiveHistoryItem = {
        id: `rh-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        timestamp: Date.now(),
        title,
        folderPath: "",
        fileCount: 1,
        files: [fileName],
        isText: true,
        textContent: content,
      };
      const list = [...(s.receiveHistory ?? []), historyItem].slice(-100);
      return { ...s, textReceived, receiveHistory: list };
    });
  },

  upload_start(msg, setState, _addToast) {
    const d = msg.data ?? {};
    setState((s) => ({
      ...s,
      receiveProgress: {
        sessionId: String(d.sessionId ?? ""),
        totalFiles: Number(d.totalFiles ?? 0),
        completedCount: 0,
        currentFileName: "",
      },
    }));
  },

  upload_progress(msg, setState, _addToast) {
    const d = msg.data ?? {};
    setState((s) => {
      if (!s.receiveProgress || String(d.sessionId) !== s.receiveProgress.sessionId)
        return s;
      return {
        ...s,
        receiveProgress: {
          ...s.receiveProgress,
          completedCount: Number(d.successFiles ?? 0) + Number(d.failedFiles ?? 0),
          currentFileName: String(d.currentFileName ?? ""),
        },
      };
    });
  },

  upload_end(msg, setState, _addToast) {
    const d = msg.data ?? {};
    const sessionId = String(d.sessionId ?? "");
    const uploadFolder = String((d as { uploadFolder?: string }).uploadFolder ?? "");
    const savedFileNamesRaw = (d as { savedFileNames?: string[] | unknown[] }).savedFileNames;
    const savedFileNames = Array.isArray(savedFileNamesRaw)
      ? (savedFileNamesRaw as unknown[]).map((x) => String(x))
      : [];
    const totalFiles = Number(d.totalFiles ?? 0);
    const isTextOnly = !!(msg as { isTextOnly?: boolean }).isTextOnly;
    setState((s) => {
      const receiveProgress =
        s.receiveProgress?.sessionId === sessionId ? null : s.receiveProgress;
      if (isTextOnly || (totalFiles === 0 && savedFileNames.length === 0)) {
        return { ...s, receiveProgress };
      }
      const historyItem: ReceiveHistoryItem = {
        id: `rh-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        timestamp: Date.now(),
        title: (msg.title as string) || "File Received",
        folderPath: uploadFolder,
        fileCount: totalFiles || savedFileNames.length,
        files: savedFileNames,
      };
      const list = [...(s.receiveHistory ?? []), historyItem].slice(-100);
      return { ...s, receiveProgress, receiveHistory: list };
    });
  },

  upload_cancelled(msg, setState, addToast) {
    const d = msg.data ?? {};
    setState((s) => ({
      ...s,
      receiveProgress:
        s.receiveProgress?.sessionId === d.sessionId ? null : s.receiveProgress,
    }));
    addToast(msg.title ?? "Upload cancelled", msg.message ?? "");
  },

  pin_required(msg, _setState, addToast) {
    addToast(msg.title ?? "PIN required", msg.message ?? "");
  },

  send_finished(msg, _setState, addToast) {
    addToast(msg.title ?? "Send finished", msg.message ?? "");
  },
};

function defaultHandler(msg: NotifyMessage, _setState: SetNotifyState, addToast: AddToast) {
  if (msg.title || msg.message) {
    addToast(msg.title ?? "Notification", msg.message ?? "");
  }
}

/** Returns a single dispatch function that routes NotifyMessage by type to the handler map. */
export function createNotifyMessageDispatcher(
  setState: SetNotifyState,
  addToast: AddToast
): (msg: NotifyMessage) => void {
  return (msg: NotifyMessage) => {
    const handler = handlers[msg.type];
    if (handler) {
      handler(msg, setState, addToast);
    } else {
      defaultHandler(msg, setState, addToast);
    }
  };
}
