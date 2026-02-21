/** Unified API layer (Decky proxy parity): returns { data, status } without throwing. */
import { getApiBase } from "./apiBase";

export interface ApiResult {
  data: unknown;
  status: number;
}

async function parseResponse(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

/** GET path; returns { data, status }. Does not throw. */
export async function apiGet(path: string): Promise<ApiResult> {
  const base = getApiBase();
  if (!base) return { data: { error: "No API base" }, status: 0 };
  try {
    const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`);
    const data = await parseResponse(res);
    return { data, status: res.status };
  } catch (e) {
    return { data: { error: String(e) }, status: 500 };
  }
}

/** POST path with optional JSON body or raw body; returns { data, status }. Does not throw. */
export async function apiPost(
  path: string,
  json?: object,
  body?: ArrayBuffer | Uint8Array
): Promise<ApiResult> {
  const base = getApiBase();
  if (!base) return { data: { error: "No API base" }, status: 0 };
  try {
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {};
    let reqBody: BodyInit | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/octet-stream";
      reqBody =
        body instanceof ArrayBuffer
          ? body
          : (body.buffer as ArrayBuffer).slice(body.byteOffset, body.byteOffset + body.byteLength);
    } else if (json !== undefined) {
      headers["Content-Type"] = "application/json";
      reqBody = JSON.stringify(json);
    }
    const res = await fetch(url, { method: "POST", headers, body: reqBody });
    const data = await parseResponse(res);
    return { data, status: res.status };
  } catch (e) {
    return { data: { error: String(e) }, status: 500 };
  }
}

/** POST path with FormData (multipart/form-data). Does not set Content-Type so browser sets boundary. */
export async function apiPostForm(path: string, formData: FormData): Promise<ApiResult> {
  const base = getApiBase();
  if (!base) return { data: { error: "No API base" }, status: 0 };
  try {
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, { method: "POST", body: formData });
    const data = await parseResponse(res);
    return { data, status: res.status };
  } catch (e) {
    return { data: { error: String(e) }, status: 500 };
  }
}

/** PATCH path with JSON body; returns { data, status }. Does not throw. */
export async function apiPatch(path: string, json: object): Promise<ApiResult> {
  const base = getApiBase();
  if (!base) return { data: { error: "No API base" }, status: 0 };
  try {
    const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    const data = await parseResponse(res);
    return { data, status: res.status };
  } catch (e) {
    return { data: { error: String(e) }, status: 500 };
  }
}

/** DELETE path; returns { data, status }. Does not throw. */
export async function apiDelete(path: string): Promise<ApiResult> {
  const base = getApiBase();
  if (!base) return { data: { error: "No API base" }, status: 0 };
  try {
    const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "DELETE",
    });
    const data = await parseResponse(res);
    return { data, status: res.status };
  } catch (e) {
    return { data: { error: String(e) }, status: 500 };
  }
}
