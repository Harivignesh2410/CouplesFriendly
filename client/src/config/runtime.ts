const fallbackApiBaseUrl = "http://localhost:5000";

function normalizeBaseUrl(value: string | undefined) {
  const candidate = value?.trim() || fallbackApiBaseUrl;
  return candidate.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
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
