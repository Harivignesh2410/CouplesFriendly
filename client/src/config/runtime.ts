const localDevelopmentApiUrl = "http://localhost:5000";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function resolveApiBaseUrl() {
  const configuredApiUrl = import.meta.env.VITE_API_URL;

  if (configuredApiUrl?.trim()) {
    return normalizeBaseUrl(configuredApiUrl);
  }

  if (import.meta.env.DEV) {
    return localDevelopmentApiUrl;
  }

  throw new Error("Missing VITE_API_URL. Set it to https://couplesfriendly.onrender.com in the production frontend environment.");
}

export const API_BASE_URL = resolveApiBaseUrl();
export const SIGNALR_ROOMS_HUB_URL = `${API_BASE_URL}/hubs/rooms`;
export const IS_DEVELOPMENT = import.meta.env.DEV;

export function logDevDiagnostic(message: string, details?: unknown) {
  if (!IS_DEVELOPMENT) {
    return;
  }

  if (details === undefined) {
    console.info(`[MovieSync] ${message}`);
    return;
  }

  console.info(`[MovieSync] ${message}`, details);
}
