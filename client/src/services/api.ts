import axios from "axios";
import type { AuthSession, RoomSummary } from "../lib/types";
import { API_BASE_URL, logDevDiagnostic } from "../config/runtime";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  logDevDiagnostic("API request", {
    method: config.method?.toUpperCase(),
    baseURL: config.baseURL,
    url: config.url
  });

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      logDevDiagnostic("API request failed", {
        message: error.message,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
    }

    return Promise.reject(error);
  }
);

export async function guestLogin(displayName: string): Promise<AuthSession> {
  return withRetry(async () => {
    const response = await api.post<AuthSession>("/api/auth/guest", { displayName });
    return response.data;
  });
}

export async function createRoom(name: string, token: string): Promise<RoomSummary> {
  return withRetry(async () => {
    const response = await api.post<RoomSummary>(
      "/api/rooms",
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  });
}

export async function joinRoom(inviteCode: string, token: string): Promise<RoomSummary> {
  return withRetry(async () => {
    const response = await api.get<RoomSummary>(`/api/rooms/${encodeURIComponent(inviteCode.trim())}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  });
}

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return `Request timed out while connecting to ${API_BASE_URL}.`;
    }

    if (error.message === "Network Error") {
      return `Network Error: frontend could not reach ${API_BASE_URL}. Check that the backend is running over HTTP and CORS allows the frontend origin.`;
    }

    if (typeof error.response?.data === "string" && error.response.data.trim()) {
      return error.response.data;
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === attempts) {
        break;
      }

      await delay(350 * attempt);
    }
  }

  throw lastError;
}

function shouldRetry(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.message === "Network Error"
    || error.code === "ECONNABORTED"
    || error.response?.status === 502
    || error.response?.status === 503
    || error.response?.status === 504;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export { API_BASE_URL };
