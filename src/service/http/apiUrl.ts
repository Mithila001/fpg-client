const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000";
const API_PREFIX = "/api/v1/";

const ensureTrailingSlash = (value: string): string => {
  return value.endsWith("/") ? value : `${value}/`;
};

export const createServerUrl = (path: string): string => {
  const browserOrigin =
    typeof window === "undefined" ? undefined : window.location.origin;

  const absoluteBaseUrl = browserOrigin
    ? new URL(ensureTrailingSlash(apiBaseUrl), browserOrigin)
    : new URL(ensureTrailingSlash(apiBaseUrl));

  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.replace(/^\/+/, ""), absoluteBaseUrl).toString();
};

export const createApiUrl = (path: string): string =>
  createServerUrl(`${API_PREFIX}${path.replace(/^\/+/, "")}`);
