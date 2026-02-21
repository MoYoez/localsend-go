/** Base URL for self API (same origin when served from backend, or localhost:53317 in dev). */
export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:53317";
  }
  return window.location.origin;
}

export function getWsBase(): string {
  const base = getApiBase();
  return base.replace(/^http/, "ws");
}
