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

/** True when the current page is from the same origin as the API (not opened from another link). */
export function isSameOriginAsApi(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return new URL(getApiBase()).origin === window.location.origin;
  } catch {
    return false;
  }
}
