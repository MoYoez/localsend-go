"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getApiBase, getWsBase } from "../utils/apiBase";
import { apiGet } from "../utils/api";
import { useNotifyWebSocket } from "../hooks/useNotifyWebSocket";
import type { NotifyMessage, NotifyState, ReceiveHistoryItem, ScanDevice } from "../types";
import { createNotifyMessageDispatcher } from "./notifyMessageHandlers";

const RECEIVE_HISTORY_KEY = "localsend_receive_history";
const RECEIVE_HISTORY_MAX = 100;

function loadReceiveHistory(): ReceiveHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECEIVE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReceiveHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveReceiveHistory(items: ReceiveHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECEIVE_HISTORY_KEY, JSON.stringify(items.slice(-RECEIVE_HISTORY_MAX)));
  } catch {
    // ignore
  }
}

interface NotifyContextValue extends NotifyState {
  dismissConfirmRecv: () => void;
  dismissConfirmDownload: () => void;
  dismissTextReceived: () => void;
  confirmRecvResponse: (confirmed: boolean) => Promise<void>;
  confirmDownloadResponse: (confirmed: boolean) => Promise<void>;
  textReceivedDismiss: () => Promise<void>;
  removeToast: (id: number) => void;
  clearReceiveHistory: () => void;
  deleteReceiveHistoryItem: (id: string) => void;
  setDevices: (value: ScanDevice[] | ((prev: ScanDevice[]) => ScanDevice[])) => void;
  notifyWsEnabled: boolean;
  /** True after the first /api/self/v1/status request has completed. */
  notifyStatusFetched: boolean;
}

const NotifyContext = createContext<NotifyContextValue | null>(null);

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [notifyWsEnabled, setNotifyWsEnabled] = useState(false);
  const [notifyStatusFetched, setNotifyStatusFetched] = useState(false);
  const [state, setState] = useState<NotifyState>(() => ({
    confirmRecv: null,
    confirmDownload: null,
    textReceived: null,
    receiveProgress: null,
    toasts: [],
    receiveHistory: loadReceiveHistory(),
    devices: [],
  }));
  const nextToastIdRef = useRef(0);

  useEffect(() => {
    saveReceiveHistory(state.receiveHistory ?? []);
  }, [state.receiveHistory]);

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/self/v1/status").then(({ data, status }) => {
      if (cancelled) return;
      setNotifyStatusFetched(true);
      if (status === 200 && data && typeof data === "object") {
        const d = data as { notify_ws_enabled?: boolean };
        if (d.notify_ws_enabled) setNotifyWsEnabled(true);
      }
    });
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

  const dispatchMessage = useMemo(
    () => createNotifyMessageDispatcher(setState, addToast),
    [addToast]
  );
  const onMessage = useCallback(
    (msg: NotifyMessage) => dispatchMessage(msg),
    [dispatchMessage]
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

  const confirmRecvResponse = useCallback(
    async (confirmed: boolean) => {
      if (!state.confirmRecv) return;
      const { sessionId } = state.confirmRecv;
      await apiGet(
        `/api/self/v1/confirm-recv?sessionId=${encodeURIComponent(sessionId)}&confirmed=${confirmed}`
      );
      dismissConfirmRecv();
    },
    [state.confirmRecv, dismissConfirmRecv]
  );
  const confirmDownloadResponse = useCallback(
    async (confirmed: boolean) => {
      if (!state.confirmDownload) return;
      const { sessionId, clientKey } = state.confirmDownload;
      await apiGet(
        `/api/self/v1/confirm-download?sessionId=${encodeURIComponent(sessionId)}&clientKey=${encodeURIComponent(clientKey)}&confirmed=${confirmed}`
      );
      dismissConfirmDownload();
    },
    [state.confirmDownload, dismissConfirmDownload]
  );
  const textReceivedDismiss = useCallback(async () => {
    if (!state.textReceived) return;
    const { sessionId } = state.textReceived;
    if (sessionId) {
      await apiGet(
        `/api/self/v1/text-received-dismiss?sessionId=${encodeURIComponent(sessionId)}`
      );
    }
    dismissTextReceived();
  }, [state.textReceived, dismissTextReceived]);

  const clearReceiveHistory = useCallback(() => {
    setState((s) => ({ ...s, receiveHistory: [] }));
  }, []);
  const deleteReceiveHistoryItem = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      receiveHistory: (s.receiveHistory ?? []).filter((it) => it.id !== id),
    }));
  }, []);

  const setDevices = useCallback((value: ScanDevice[] | ((prev: ScanDevice[]) => ScanDevice[])) => {
    setState((s) => ({
      ...s,
      devices: typeof value === "function" ? value(s.devices ?? []) : value,
    }));
  }, []);

  const value: NotifyContextValue = {
    ...state,
    dismissConfirmRecv,
    dismissConfirmDownload,
    dismissTextReceived,
    confirmRecvResponse,
    confirmDownloadResponse,
    textReceivedDismiss,
    removeToast,
    clearReceiveHistory,
    deleteReceiveHistoryItem,
    setDevices,
    notifyWsEnabled,
    notifyStatusFetched,
  };

  return (
    <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>
  );
}

export function useNotify(): NotifyContextValue | null {
  return useContext(NotifyContext);
}
