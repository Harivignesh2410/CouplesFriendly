export type PlaybackStatus = "Paused" | "Playing" | 0 | 1;

export type PlaybackState = {
  status: PlaybackStatus;
  positionSeconds: number;
  updatedAt: string;
};

export type Participant = {
  userId: string;
  displayName: string;
  joinedAt: string;
};

export type RoomSummary = {
  id: string;
  name: string;
  inviteCode: string;
  inviteUrl: string;
  playback: PlaybackState;
  participants: Participant[];
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  sentAt: string;
};

export type AuthSession = {
  accessToken: string;
  userId: string;
  displayName: string;
};

export type ScreenShareSession = {
  hostConnectionId: string;
  hostUserId: string;
  hostDisplayName: string;
};

export type RoomConnectionReady = {
  connectionId: string;
  activeScreenShare: ScreenShareSession | null;
};

export type ViewerReadyPayload = {
  viewerConnectionId: string;
  roomInviteCode: string;
};

export type WebRtcSignalPayload = {
  senderConnectionId: string;
  roomInviteCode: string;
  payload: string;
};
