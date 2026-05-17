import * as signalR from "@microsoft/signalr";
import { logDevDiagnostic, SIGNALR_ROOMS_HUB_URL } from "../config/runtime";

export function createRoomConnection(token: string) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_ROOMS_HUB_URL, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  connection.onreconnecting((error) => {
    logDevDiagnostic("SignalR reconnecting", {
      hubUrl: SIGNALR_ROOMS_HUB_URL,
      message: error?.message
    });
  });

  connection.onreconnected((connectionId) => {
    logDevDiagnostic("SignalR reconnected", {
      hubUrl: SIGNALR_ROOMS_HUB_URL,
      connectionId
    });
  });

  connection.onclose((error) => {
    logDevDiagnostic("SignalR closed", {
      hubUrl: SIGNALR_ROOMS_HUB_URL,
      message: error?.message
    });
  });

  logDevDiagnostic("SignalR connection configured", { hubUrl: SIGNALR_ROOMS_HUB_URL });

  return connection;
}

export async function startRoomConnection(connection: signalR.HubConnection, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      logDevDiagnostic("SignalR starting", {
        hubUrl: SIGNALR_ROOMS_HUB_URL,
        attempt
      });
      await connection.start();
      logDevDiagnostic("SignalR connected", {
        hubUrl: SIGNALR_ROOMS_HUB_URL,
        connectionId: connection.connectionId
      });
      return;
    } catch (error) {
      lastError = error;
      logDevDiagnostic("SignalR start failed", {
        hubUrl: SIGNALR_ROOMS_HUB_URL,
        attempt,
        message: error instanceof Error ? error.message : String(error)
      });

      if (attempt < attempts) {
        await delay(600 * attempt);
      }
    }
  }

  throw lastError;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export type RoomConnection = signalR.HubConnection;
