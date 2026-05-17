import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import type { RoomConnection } from "../services/realtime";
import { getScreenShareStream, ScreenSharePeer } from "../services/webrtc";
import type { ScreenShareSession, ViewerReadyPayload, WebRtcSignalPayload } from "../lib/types";

type UseScreenShareOptions = {
  roomInviteCode: string;
  connection: RoomConnection | null;
  localConnectionId: string | null;
  activeScreenShare: ScreenShareSession | null;
  onActiveScreenShareChange: (session: ScreenShareSession | null) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

export function useScreenShare({
  roomInviteCode,
  connection,
  localConnectionId,
  activeScreenShare,
  onActiveScreenShareChange,
  notify
}: UseScreenShareOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isStartingShare, setIsStartingShare] = useState(false);
  const [peerState, setPeerState] = useState<RTCPeerConnectionState>("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState>("new");
  const [remoteStreamTimedOut, setRemoteStreamTimedOut] = useState(false);
  const [remoteTrackCount, setRemoteTrackCount] = useState(0);
  const peersRef = useRef(new Map<string, ScreenSharePeer>());
  const localStreamRef = useRef<MediaStream | null>(null);

  const isSharing = Boolean(localStream && activeScreenShare?.hostConnectionId === localConnectionId);
  const hasActiveRemoteShare = Boolean(activeScreenShare && activeScreenShare.hostConnectionId !== localConnectionId);
  const isViewing = hasActiveRemoteShare;

  const closePeer = useCallback((connectionId: string) => {
    peersRef.current.get(connectionId)?.close();
    peersRef.current.delete(connectionId);
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    setPeerState("closed");
  }, []);

  const stopTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const stopShareLocally = useCallback(() => {
    stopTracks(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteTrackCount(0);
    setRemoteStreamTimedOut(false);
    closeAllPeers();
    setPeerState("closed");
    setIceState("closed");
  }, [closeAllPeers, stopTracks]);

  const requestShareIfNeeded = useCallback(async () => {
    if (!connection || connection.state !== HubConnectionState.Connected || !hasActiveRemoteShare) {
      return;
    }

    await connection.invoke("RequestScreenShare", roomInviteCode);
  }, [connection, hasActiveRemoteShare, roomInviteCode]);

  useEffect(() => {
    if (!connection) {
      return;
    }

    const handleShareStarted = (session: ScreenShareSession) => {
      onActiveScreenShareChange(session);
      if (session.hostConnectionId !== localConnectionId) {
        setRemoteStream(null);
        setRemoteTrackCount(0);
        setRemoteStreamTimedOut(false);
        notify(`${session.hostDisplayName} is sharing their screen`, "info");
        void connection.invoke("RequestScreenShare", roomInviteCode);
      }
    };

    const handleShareStopped = (hostConnectionId: string) => {
      if (activeScreenShare?.hostConnectionId === hostConnectionId) {
        onActiveScreenShareChange(null);
      }
      stopShareLocally();
      notify("Screen share ended", "info");
    };

    const handleViewerReady = async (payload: ViewerReadyPayload) => {
      if (!localStreamRef.current) {
        return;
      }

      closePeer(payload.viewerConnectionId);
      const peer = new ScreenSharePeer({
        roomInviteCode,
        targetConnectionId: payload.viewerConnectionId,
        connection,
        role: "host",
        localStream: localStreamRef.current,
        onConnectionStateChange: setPeerState,
        onIceConnectionStateChange: setIceState
      });
      peersRef.current.set(payload.viewerConnectionId, peer);
      await peer.createOffer();
    };

    const handleOffer = async (signal: WebRtcSignalPayload) => {
      closePeer(signal.senderConnectionId);
      const peer = new ScreenSharePeer({
        roomInviteCode,
        targetConnectionId: signal.senderConnectionId,
        connection,
        role: "viewer",
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
          setRemoteTrackCount(stream.getTracks().length);
          setRemoteStreamTimedOut(false);
        },
        onConnectionStateChange: setPeerState,
        onIceConnectionStateChange: setIceState
      });
      peersRef.current.set(signal.senderConnectionId, peer);
      await peer.acceptOffer(signal.payload);
    };

    const handleAnswer = async (signal: WebRtcSignalPayload) => {
      await peersRef.current.get(signal.senderConnectionId)?.acceptAnswer(signal.payload);
    };

    const handleIce = async (signal: WebRtcSignalPayload) => {
      await peersRef.current.get(signal.senderConnectionId)?.addIceCandidate(signal.payload);
    };

    const handleViewerLeft = (viewerConnectionId: string) => {
      closePeer(viewerConnectionId);
    };

    connection.on("screenShareStarted", handleShareStarted);
    connection.on("screenShareStopped", handleShareStopped);
    connection.on("screenShareViewerReady", handleViewerReady);
    connection.on("webRtcOffer", handleOffer);
    connection.on("webRtcAnswer", handleAnswer);
    connection.on("webRtcIceCandidate", handleIce);
    connection.on("screenShareViewerLeft", handleViewerLeft);

    return () => {
      connection.off("screenShareStarted", handleShareStarted);
      connection.off("screenShareStopped", handleShareStopped);
      connection.off("screenShareViewerReady", handleViewerReady);
      connection.off("webRtcOffer", handleOffer);
      connection.off("webRtcAnswer", handleAnswer);
      connection.off("webRtcIceCandidate", handleIce);
      connection.off("screenShareViewerLeft", handleViewerLeft);
    };
  }, [activeScreenShare?.hostConnectionId, closePeer, connection, localConnectionId, notify, onActiveScreenShareChange, roomInviteCode, stopShareLocally]);

  useEffect(() => {
    void requestShareIfNeeded();
  }, [requestShareIfNeeded]);

  useEffect(() => {
    if (!hasActiveRemoteShare || remoteTrackCount > 0) {
      setRemoteStreamTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemoteStreamTimedOut(true);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [hasActiveRemoteShare, remoteTrackCount]);

  const startSharing = useCallback(async () => {
    if (!connection || connection.state !== HubConnectionState.Connected) {
      notify("Connect to the room before sharing.", "error");
      return;
    }

    if (!localConnectionId) {
      notify("Room connection is still preparing. Try again in a moment.", "error");
      return;
    }

    if (activeScreenShare && activeScreenShare.hostConnectionId !== localConnectionId) {
      notify("Someone else is already sharing in this room.", "error");
      return;
    }

    setIsStartingShare(true);
    try {
      const stream = await getScreenShareStream();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPeerState("new");
      setIceState("new");
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        void connection.invoke("StopScreenShare", roomInviteCode);
        stopShareLocally();
        onActiveScreenShareChange(null);
      }, { once: true });

      await connection.invoke("StartScreenShare", roomInviteCode);
      notify("Screen sharing started. Tab audio streams when the browser exposes it.", "success");
    } catch (error) {
      stopShareLocally();
      notify(error instanceof Error ? error.message : "Unable to start screen sharing.", "error");
    } finally {
      setIsStartingShare(false);
    }
  }, [activeScreenShare, connection, localConnectionId, notify, onActiveScreenShareChange, roomInviteCode, stopShareLocally]);

  const stopSharing = useCallback(async () => {
    if (connection?.state === HubConnectionState.Connected) {
      await connection.invoke("StopScreenShare", roomInviteCode);
    }

    stopShareLocally();
    onActiveScreenShareChange(null);
  }, [connection, onActiveScreenShareChange, roomInviteCode, stopShareLocally]);

  const value = useMemo(() => ({
    localStream,
    remoteStream,
    isSharing,
    isViewing,
    isStartingShare,
    peerState,
    iceState,
    remoteTrackCount,
    remoteStreamTimedOut,
    startSharing,
    stopSharing,
    requestShareIfNeeded
  }), [iceState, isSharing, isStartingShare, isViewing, localStream, peerState, remoteStream, remoteStreamTimedOut, remoteTrackCount, requestShareIfNeeded, startSharing, stopSharing]);

  return value;
}
