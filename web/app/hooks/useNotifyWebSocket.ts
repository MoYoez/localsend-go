"use client";

import { useEffect, useRef } from "react";

export interface NotifyMessage {
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  isTextOnly?: boolean;
}

export function useNotifyWebSocket(
  enabled: boolean,
  wsBase: string,
  onMessage: (msg: NotifyMessage) => void
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !wsBase) return;
    const url = `${wsBase.replace(/^http/, "ws")}/api/self/v1/notify-ws`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as NotifyMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore parse errors
        }
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch {
      // ignore
    }
    return () => {
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [enabled, wsBase]);
}
