"use client";

import type {
  NotifyMessage,
  NotifyState,
} from "../types";

type SetNotifyState = React.Dispatch<React.SetStateAction<NotifyState>>;
type AddToast = (title: string, body: string) => void;

type NotifyHandler = (
  msg: NotifyMessage,
  setState: SetNotifyState,
  addToast: AddToast
) => void;

const handlers: Record<string, NotifyHandler> = {
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
    setState((s) => ({
      ...s,
      textReceived: {
        sessionId: String(d.sessionId ?? ""),
        title: String(d.title ?? msg.title ?? "Text Received"),
        content: String(d.content ?? msg.message ?? ""),
        fileName: String(d.fileName ?? ""),
      },
    }));
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
    setState((s) => ({
      ...s,
      receiveProgress:
        s.receiveProgress?.sessionId === d.sessionId ? null : s.receiveProgress,
    }));
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
