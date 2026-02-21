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
import { useNotifyWebSocket } from "../hooks/useNotifyWebSocket";
import type { NotifyMessage, NotifyState } from "../types";
import { createNotifyMessageDispatcher } from "./notifyMessageHandlers";

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
