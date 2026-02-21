/** WebSocket notify message from server */
export interface NotifyMessage {
  type: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  isTextOnly?: boolean;
}

export interface ConfirmRecvState {
  sessionId: string;
  from: string;
  fileCount: number;
  files: { fileName: string; size?: number; fileType?: string }[];
  totalFiles?: number;
}

export interface ConfirmDownloadState {
  sessionId: string;
  clientKey: string;
  fileCount: number;
  files: { id?: string; fileName?: string; size?: number; fileType?: string }[];
  totalFiles?: number;
  clientIp?: string;
  clientType?: string;
  userAgent?: string;
}

export interface TextReceivedState {
  sessionId: string;
  title: string;
  content: string;
  fileName: string;
}

export interface ReceiveProgressState {
  sessionId: string;
  totalFiles: number;
  completedCount: number;
  currentFileName: string;
}

export interface NotifyState {
  confirmRecv: ConfirmRecvState | null;
  confirmDownload: ConfirmDownloadState | null;
  textReceived: TextReceivedState | null;
  receiveProgress: ReceiveProgressState | null;
  toasts: { id: number; title: string; body: string }[];
}
