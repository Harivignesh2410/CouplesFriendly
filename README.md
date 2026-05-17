# Movie Sync App

Movie Sync is a clean-architecture starter for synchronized video rooms with chat and invite links.

## Stack

- Frontend: React, Tailwind, Vite, SignalR client
- Backend: ASP.NET Core Web API, SignalR
- Auth: HMAC-signed JWT-style bearer tokens for guest users
- Storage: in-memory room repository

## Structure

- `server/src/MovieSync.Domain` contains room entities and playback state.
- `server/src/MovieSync.Application` contains DTOs, contracts, and use-case services.
- `server/src/MovieSync.Infrastructure` contains auth/token infrastructure and in-memory persistence.
- `server/src/MovieSync.Api` exposes REST endpoints and the SignalR hub.
- `client` contains the React + Tailwind app.

## Run

Backend:

```powershell
dotnet run --project server\src\MovieSync.Api\MovieSync.Api.csproj --urls http://localhost:5000
```

Frontend:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

The frontend reads `VITE_API_URL` for both REST API calls and the SignalR hub.

For Vercel production, set:

```text
VITE_API_URL=https://couplesfriendly.onrender.com
```

When running Vite locally without `VITE_API_URL`, the frontend uses the local development API at `http://localhost:5000`.

## API

- `POST /api/auth/guest` creates a guest token.
- `POST /api/rooms` creates a room.
- `GET /api/rooms/{inviteCode}` joins and returns a room.
- `GET /api/rooms` lists rooms.
- `/hubs/rooms` handles `JoinRoom`, `SendChat`, and `SyncPlayback`.

## Screen Sharing

Rooms support one active screen share at a time.

- Media streams use browser WebRTC peer connections.
- SignalR is used only for signaling: offers, answers, ICE candidates, viewer requests, and share start/stop events.
- Presenters can share a screen, window, or browser tab.
- Browser tab audio or system audio is included when the browser and operating system expose it through the screen picker.
