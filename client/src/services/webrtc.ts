import type { RoomConnection } from "./realtime";
import { logDevDiagnostic } from "../config/runtime";

const rtcConfiguration: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export type PeerRole = "host" | "viewer";

export type PeerConnectionOptions = {
  roomInviteCode: string;
  targetConnectionId: string;
  connection: RoomConnection;
  role: PeerRole;
  localStream?: MediaStream;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
};

export class ScreenSharePeer {
  private readonly peer: RTCPeerConnection;
  private readonly remoteStream = new MediaStream();

  constructor(private readonly options: PeerConnectionOptions) {
    this.peer = new RTCPeerConnection(rtcConfiguration);

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        void this.options.connection.invoke(
          "SendIceCandidate",
          this.options.roomInviteCode,
          this.options.targetConnectionId,
          JSON.stringify(event.candidate)
        );
      }
    };

    this.peer.onconnectionstatechange = () => {
      logDevDiagnostic("WebRTC connection state changed", {
        role: this.options.role,
        targetConnectionId: this.options.targetConnectionId,
        connectionState: this.peer.connectionState
      });
      this.options.onConnectionStateChange?.(this.peer.connectionState);
    };

    this.peer.oniceconnectionstatechange = () => {
      logDevDiagnostic("WebRTC ICE connection state changed", {
        role: this.options.role,
        targetConnectionId: this.options.targetConnectionId,
        iceConnectionState: this.peer.iceConnectionState
      });
      this.options.onIceConnectionStateChange?.(this.peer.iceConnectionState);
    };

    this.peer.ontrack = (event) => {
      const incomingTracks = event.streams[0]?.getTracks() ?? [event.track];

      logDevDiagnostic("WebRTC ontrack received", {
        role: this.options.role,
        targetConnectionId: this.options.targetConnectionId,
        trackId: event.track.id,
        trackKind: event.track.kind,
        trackReadyState: event.track.readyState,
        streamCount: event.streams.length,
        incomingTrackCount: incomingTracks.length
      });

      incomingTracks.forEach((track) => this.addRemoteTrack(track));

      logDevDiagnostic("WebRTC remote stream updated", {
        targetConnectionId: this.options.targetConnectionId,
        audioTracks: this.remoteStream.getAudioTracks().length,
        videoTracks: this.remoteStream.getVideoTracks().length,
        totalTracks: this.remoteStream.getTracks().length
      });

      this.options.onRemoteStream?.(this.remoteStream);
    };

    this.options.localStream?.getTracks().forEach((track) => {
      logDevDiagnostic("WebRTC adding local track to peer", {
        role: this.options.role,
        targetConnectionId: this.options.targetConnectionId,
        trackId: track.id,
        trackKind: track.kind,
        trackReadyState: track.readyState
      });
      this.peer.addTrack(track, this.options.localStream!);
    });
  }

  async createOffer() {
    const offer = await this.peer.createOffer({
      offerToReceiveAudio: this.options.role === "viewer",
      offerToReceiveVideo: this.options.role === "viewer"
    });
    await this.peer.setLocalDescription(offer);
    await this.options.connection.invoke(
      "SendWebRtcOffer",
      this.options.roomInviteCode,
      this.options.targetConnectionId,
      JSON.stringify(offer)
    );
  }

  async acceptOffer(payload: string) {
    const offer = JSON.parse(payload) as RTCSessionDescriptionInit;
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    await this.options.connection.invoke(
      "SendWebRtcAnswer",
      this.options.roomInviteCode,
      this.options.targetConnectionId,
      JSON.stringify(answer)
    );
  }

  async acceptAnswer(payload: string) {
    const answer = JSON.parse(payload) as RTCSessionDescriptionInit;
    await this.peer.setRemoteDescription(answer);
  }

  async addIceCandidate(payload: string) {
    await this.peer.addIceCandidate(JSON.parse(payload) as RTCIceCandidateInit);
  }

  close() {
    this.peer.onicecandidate = null;
    this.peer.ontrack = null;
    this.peer.onconnectionstatechange = null;
    this.peer.oniceconnectionstatechange = null;
    this.peer.close();
  }

  private addRemoteTrack(track: MediaStreamTrack) {
    if (this.remoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
      return;
    }

    this.remoteStream.addTrack(track);

    track.addEventListener("ended", () => {
      logDevDiagnostic("WebRTC remote track ended", {
        targetConnectionId: this.options.targetConnectionId,
        trackId: track.id,
        trackKind: track.kind
      });
    });
  }
}

export async function getScreenShareStream() {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getDisplayMedia) {
    throw new Error("Screen sharing is not supported by this browser.");
  }

  const stream = await mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 30, max: 60 }
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });

  logDevDiagnostic("Screen share capture stream created", {
    audioTracks: stream.getAudioTracks().length,
    videoTracks: stream.getVideoTracks().length,
    totalTracks: stream.getTracks().length
  });

  return stream;
}
