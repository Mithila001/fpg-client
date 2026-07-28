const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL is required.");
}

const ensureTrailingSlash = (value: string): string => {
  return value.endsWith("/") ? value : `${value}/`;
};

export const createApiUrl = (path: string): string => {
  const browserOrigin =
    typeof window === "undefined" ? undefined : window.location.origin;

  const absoluteBaseUrl = browserOrigin
    ? new URL(ensureTrailingSlash(apiBaseUrl), browserOrigin)
    : new URL(ensureTrailingSlash(apiBaseUrl));

  return new URL(path.replace(/^\/+/, ""), absoluteBaseUrl).toString();
};
