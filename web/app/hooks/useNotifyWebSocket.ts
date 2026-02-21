"use client";

import { useEffect, useRef } from "react";
import type { NotifyMessage } from "../types";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

export function useNotifyWebSocket(
  enabled: boolean,
  wsBase: string,
  onMessage: (msg: NotifyMessage) => void
) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled || !wsBase) return;

    const url = `${wsBase.replace(/^http/, "ws")}/api/self/v1/notify-ws`;
    let ws: WebSocket | null = null;
    let reconnectMs = INITIAL_RECONNECT_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function scheduleReconnect() {
      if (cancelled || !enabled) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (cancelled || !enabled) return;
        connect();
      }, reconnectMs);
      reconnectMs = Math.min(reconnectMs * 2, MAX_RECONNECT_MS);
    }

    function connect() {
      if (cancelled || !enabled) return;
      try {
        ws = new WebSocket(url);
        ws.onopen = () => {
          reconnectMs = INITIAL_RECONNECT_MS;
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as NotifyMessage;
            onMessageRef.current(msg);
          } catch {
            // ignore parse errors
          }
        };
        ws.onerror = () => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[useNotifyWebSocket] connection error");
          }
        };
        ws.onclose = () => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[useNotifyWebSocket] connection closed, reconnecting in", reconnectMs, "ms");
          }
          ws = null;
          scheduleReconnect();
        };
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.warn("[useNotifyWebSocket] failed to create WebSocket");
        }
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    };
  }, [enabled, wsBase]);
}
