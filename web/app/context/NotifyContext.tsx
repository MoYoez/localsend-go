"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getApiBase, getWsBase } from "../utils/apiBase";
import { useNotifyWebSocket, type NotifyMessage } from "../hooks/useNotifyWebSocket";

interface ConfirmRecvState {
  sessionId: string;
  from: string;
  fileCount: number;
  files: { fileName: string; size?: number; fileType?: string }[];
  totalFiles?: number;
}

interface ConfirmDownloadState {
  sessionId: string;
  clientKey: string;
  fileCount: number;
  files: { id?: string; fileName?: string; size?: number; fileType?: string }[];
  totalFiles?: number;
  clientIp?: string;
  clientType?: string;
  userAgent?: string;
}

interface TextReceivedState {
  sessionId: string;
  title: string;
  content: string;
  fileName: string;
}

interface ReceiveProgressState {
  sessionId: string;
  totalFiles: number;
  completedCount: number;
  currentFileName: string;
}

interface NotifyState {
  confirmRecv: ConfirmRecvState | null;
  confirmDownload: ConfirmDownloadState | null;
  textReceived: TextReceivedState | null;
  receiveProgress: ReceiveProgressState | null;
  toasts: { id: number; title: string; body: string }[];
}

interface NotifyContextValue extends NotifyState {
  dismissConfirmRecv: () => void;
  dismissConfirmDownload: () => void;
  dismissTextReceived: () => void;
  confirmRecvResponse: (confirmed: boolean) => Promise<void>;
  confirmDownloadResponse: (confirmed: boolean) => Promise<void>;
  textReceivedDismiss: () => Promise<void>;
  removeToast: (id: number) => void;
  notifyWsEnabled: boolean;
}

const NotifyContext = createContext<NotifyContextValue | null>(null);

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [notifyWsEnabled, setNotifyWsEnabled] = useState(false);
  const [state, setState] = useState<NotifyState>({
    confirmRecv: null,
    confirmDownload: null,
    textReceived: null,
    receiveProgress: null,
    toasts: [],
  });
  const nextToastIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();
    if (!base) return;
    fetch(`${base}/api/self/v1/status`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.notify_ws_enabled) setNotifyWsEnabled(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const addToast = useCallback((title: string, body: string) => {
    const id = nextToastIdRef.current++;
    setState((s) => ({
      ...s,
      toasts: [...s.toasts, { id, title, body }].slice(-10),
    }));
  }, []);

  const removeToast = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  const onMessage = useCallback(
    (msg: NotifyMessage) => {
      const d = msg.data ?? {};
      switch (msg.type) {
        case "confirm_recv":
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
          return;
        case "confirm_download":
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
          return;
        case "text_received":
          setState((s) => ({
            ...s,
            textReceived: {
              sessionId: String(d.sessionId ?? ""),
              title: String(d.title ?? msg.title ?? "Text Received"),
              content: String(d.content ?? msg.message ?? ""),
              fileName: String(d.fileName ?? ""),
            },
          }));
          return;
        case "upload_start":
          setState((s) => ({
            ...s,
            receiveProgress: {
              sessionId: String(d.sessionId ?? ""),
              totalFiles: Number(d.totalFiles ?? 0),
              completedCount: 0,
              currentFileName: "",
            },
          }));
          return;
        case "upload_progress":
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
          return;
        case "upload_end":
          setState((s) => ({
            ...s,
            receiveProgress:
              s.receiveProgress?.sessionId === d.sessionId ? null : s.receiveProgress,
          }));
          return;
        case "upload_cancelled":
          setState((s) => ({
            ...s,
            receiveProgress:
              s.receiveProgress?.sessionId === d.sessionId ? null : s.receiveProgress,
          }));
          addToast(msg.title ?? "Upload cancelled", msg.message ?? "");
          return;
        case "pin_required":
          addToast(msg.title ?? "PIN required", msg.message ?? "");
          return;
        case "send_finished":
          addToast(msg.title ?? "Send finished", msg.message ?? "");
          return;
        default:
          if (msg.title || msg.message) addToast(msg.title ?? "Notification", msg.message ?? "");
      }
    },
    [addToast]
  );

  useNotifyWebSocket(notifyWsEnabled, getWsBase(), onMessage);

  const dismissConfirmRecv = useCallback(() => {
    setState((s) => ({ ...s, confirmRecv: null }));
  }, []);
  const dismissConfirmDownload = useCallback(() => {
    setState((s) => ({ ...s, confirmDownload: null }));
  }, []);
  const dismissTextReceived = useCallback(() => {
    setState((s) => ({ ...s, textReceived: null }));
  }, []);

  const base = getApiBase();
  const confirmRecvResponse = useCallback(
    async (confirmed: boolean) => {
      if (!state.confirmRecv || !base) return;
      const { sessionId } = state.confirmRecv;
      await fetch(
        `${base}/api/self/v1/confirm-recv?sessionId=${encodeURIComponent(sessionId)}&confirmed=${confirmed}`
      );
      dismissConfirmRecv();
    },
    [state.confirmRecv, base, dismissConfirmRecv]
  );
  const confirmDownloadResponse = useCallback(
    async (confirmed: boolean) => {
      if (!state.confirmDownload || !base) return;
      const { sessionId, clientKey } = state.confirmDownload;
      await fetch(
        `${base}/api/self/v1/confirm-download?sessionId=${encodeURIComponent(sessionId)}&clientKey=${encodeURIComponent(clientKey)}&confirmed=${confirmed}`
      );
      dismissConfirmDownload();
    },
    [state.confirmDownload, base, dismissConfirmDownload]
  );
  const textReceivedDismiss = useCallback(async () => {
    if (!state.textReceived || !base) return;
    const { sessionId } = state.textReceived;
    if (sessionId) {
      await fetch(
        `${base}/api/self/v1/text-received-dismiss?sessionId=${encodeURIComponent(sessionId)}`
      );
    }
    dismissTextReceived();
  }, [state.textReceived, base, dismissTextReceived]);

  const value: NotifyContextValue = {
    ...state,
    dismissConfirmRecv,
    dismissConfirmDownload,
    dismissTextReceived,
    confirmRecvResponse,
    confirmDownloadResponse,
    textReceivedDismiss,
    removeToast,
    notifyWsEnabled,
  };

  return (
    <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>
  );
}

export function useNotify(): NotifyContextValue | null {
  return useContext(NotifyContext);
}
