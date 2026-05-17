import { useEffect, useMemo, useRef, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import { ArrowLeft, Loader2, Wifi, WifiOff } from "lucide-react";
import { ChatSidebar } from "../components/room/ChatSidebar";
import { OnlineUsers } from "../components/room/OnlineUsers";
import { ScreenSharePanel } from "../components/room/ScreenSharePanel";
import { VideoPlayer } from "../components/room/VideoPlayer";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useScreenShare } from "../hooks/useScreenShare";
import type { ChatMessage, PlaybackState, RoomConnectionReady, RoomSummary, ScreenShareSession } from "../lib/types";
import { getErrorMessage, joinRoom } from "../services/api";
import { createRoomConnection, startRoomConnection, type RoomConnection } from "../services/realtime";

type RoomPageProps = {
  inviteCode: string;
  navigate: (path: string) => void;
};

export function RoomPage({ inviteCode, navigate }: RoomPageProps) {
  const { session } = useAuth();
  const { notify } = useToast();
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [videoUrl, setVideoUrl] = useState("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<HubConnectionState | "Idle">("Idle");
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [localConnectionId, setLocalConnectionId] = useState<string | null>(null);
  const [activeScreenShare, setActiveScreenShare] = useState<ScreenShareSession | null>(null);
  const connectionRef = useRef<RoomConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteSyncRef = useRef(false);

  const inviteUrl = useMemo(() => `${window.location.origin}/room/${inviteCode}`, [inviteCode]);
  const connected = connectionState === "Connected";
  const screenShare = useScreenShare({
    roomInviteCode: inviteCode,
    connection,
    localConnectionId,
    activeScreenShare,
    onActiveScreenShareChange: setActiveScreenShare,
    notify
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    const token = session.accessToken;
    let disposed = false;

    async function connect() {
      setLoading(true);
      try {
        const snapshot = await joinRoom(inviteCode, token);
        if (disposed) {
          return;
        }

        setRoom(snapshot);
        const connection = createRoomConnection(token);
        connectionRef.current = connection;
        setConnection(connection);

        connection.onreconnecting(() => {
          setConnectionState(HubConnectionState.Reconnecting);
          notify("Connection interrupted. Reconnecting...", "info");
        });
        connection.onreconnected(() => {
          setConnectionState(HubConnectionState.Connected);
          void connection.invoke("JoinRoom", inviteCode);
          notify("Back in sync.", "success");
        });
        connection.onclose(() => setConnectionState(HubConnectionState.Disconnected));
        connection.on("roomConnectionReady", (ready: RoomConnectionReady) => {
          setLocalConnectionId(ready.connectionId);
          setActiveScreenShare(ready.activeScreenShare);
        });
        connection.on("roomSnapshot", (nextRoom: RoomSummary) => setRoom(nextRoom));
        connection.on("chatMessage", (message: ChatMessage) => setMessages((current) => [...current, message]));
        connection.on("playbackSynced", applyPlayback);
        connection.on("toast", (message: string) => notify(message, "info"));

        await startRoomConnection(connection);
        setConnectionState(connection.state);
        await connection.invoke("JoinRoom", inviteCode);
        notify(`Joined ${snapshot.name}.`, "success");
      } catch (error) {
        notify(getErrorMessage(error), "error");
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    void connect();

    return () => {
      disposed = true;
      void connectionRef.current?.stop();
      setConnection(null);
    };
  }, [inviteCode, session?.accessToken]);

  function applyPlayback(playback: PlaybackState) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const status = playback.status;
    const shouldPlay = status === "Playing" || status === 1;
    remoteSyncRef.current = true;

    if (Math.abs(video.currentTime - playback.positionSeconds) > 0.4) {
      video.currentTime = playback.positionSeconds;
    }

    const action = shouldPlay ? video.play() : Promise.resolve(video.pause());
    void action.finally(() => {
      window.setTimeout(() => {
        remoteSyncRef.current = false;
      }, 250);
    });
  }

  async function broadcastPlayback(playing: boolean) {
    if (remoteSyncRef.current || !connectionRef.current || !connected || !room) {
      return;
    }

    try {
      await connectionRef.current.invoke("SyncPlayback", room.inviteCode, {
        status: playing ? 1 : 0,
        positionSeconds: videoRef.current?.currentTime ?? 0
      });
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  async function sendChat(message: string) {
    if (!connectionRef.current || !connected || !room) {
      notify("Chat is unavailable until the room reconnects.", "error");
      return;
    }

    try {
      await connectionRef.current.invoke("SendChat", room.inviteCode, message);
    } catch (error) {
      notify(getErrorMessage(error), "error");
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      notify("Invite link copied.", "success");
    } catch {
      notify(inviteUrl, "info");
    }
  }

  return (
    <main className="min-h-screen bg-[#050509] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090f]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button className="icon-button" onClick={() => navigate("/")} title="Back to lobby">
              <ArrowLeft size={19} />
            </button>
            <div>
              <p className="text-sm font-semibold text-[#e50914]">Room {inviteCode}</p>
              <h1 className="line-clamp-1 text-xl font-black md:text-2xl">{room?.name ?? "Loading room"}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
            <span className={`status-pill ${connected ? "online" : "offline"}`}>
              {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
              {connectionState}
            </span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1">{session?.displayName}</span>
          </div>
        </div>
      </header>

      {loading ? (
        <section className="grid min-h-[70vh] place-items-center px-5">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4 text-white/75">
            <Loader2 className="animate-spin" size={20} />
            Joining room...
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <VideoPlayer
              videoRef={videoRef}
              videoUrl={videoUrl}
              onVideoUrlChange={setVideoUrl}
              onPlay={() => void broadcastPlayback(true)}
              onPause={() => void broadcastPlayback(false)}
              onSeek={() => void broadcastPlayback(!videoRef.current?.paused)}
              onCopyInvite={copyInvite}
              isConnected={connected}
            />
            <ScreenSharePanel
              localVideoRef={localShareVideoRef}
              remoteVideoRef={remoteShareVideoRef}
              localStream={screenShare.localStream}
              remoteStream={screenShare.remoteStream}
              activeScreenShare={activeScreenShare}
              isSharing={screenShare.isSharing}
              isViewing={screenShare.isViewing}
              isStartingShare={screenShare.isStartingShare}
              peerState={screenShare.peerState}
              iceState={screenShare.iceState}
              remoteTrackCount={screenShare.remoteTrackCount}
              remoteStreamTimedOut={screenShare.remoteStreamTimedOut}
              onStartSharing={screenShare.startSharing}
              onStopSharing={screenShare.stopSharing}
            />
            <div className="lg:hidden">
              <OnlineUsers participants={room?.participants ?? []} />
            </div>
          </div>
          <aside className="grid gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
            <div className="hidden lg:block">
              <OnlineUsers participants={room?.participants ?? []} />
            </div>
            <ChatSidebar messages={messages} onSend={sendChat} disabled={!connected} />
          </aside>
        </section>
      )}
    </main>
  );
}
