import { RefObject, useEffect, useState } from "react";
import { MonitorUp, ScreenShareOff } from "lucide-react";
import { LoadingButton } from "../ui/LoadingButton";
import type { ScreenShareSession } from "../../lib/types";
import { logDevDiagnostic } from "../../config/runtime";

type ScreenSharePanelProps = {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  activeScreenShare: ScreenShareSession | null;
  isSharing: boolean;
  isViewing: boolean;
  isStartingShare: boolean;
  peerState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
  remoteTrackCount: number;
  remoteStreamTimedOut: boolean;
  onStartSharing: () => Promise<void>;
  onStopSharing: () => Promise<void>;
};

export function ScreenSharePanel({
  localVideoRef,
  remoteVideoRef,
  localStream,
  remoteStream,
  activeScreenShare,
  isSharing,
  isViewing,
  isStartingShare,
  peerState,
  iceState,
  remoteTrackCount,
  remoteStreamTimedOut,
  onStartSharing,
  onStopSharing
}: ScreenSharePanelProps) {
  const [remotePlaybackBlocked, setRemotePlaybackBlocked] = useState(false);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video) {
      return;
    }

    video.muted = false;
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = remoteStream;

    logDevDiagnostic("Viewer video srcObject assigned", {
      hasStream: Boolean(remoteStream),
      audioTracks: remoteStream?.getAudioTracks().length ?? 0,
      videoTracks: remoteStream?.getVideoTracks().length ?? 0,
      totalTracks: remoteStream?.getTracks().length ?? 0,
      muted: video.muted,
      autoplay: video.autoplay,
      playsInline: video.playsInline
    });

    if (remoteStream && remoteStream.getTracks().length > 0) {
      setRemotePlaybackBlocked(false);
      void video.play().then(() => {
        logDevDiagnostic("Viewer video playback started", {
          readyState: video.readyState,
          paused: video.paused
        });
      }).catch((error: unknown) => {
        setRemotePlaybackBlocked(true);
        logDevDiagnostic("Viewer video autoplay blocked", {
          message: error instanceof Error ? error.message : String(error)
        });
      });
    }
  }, [remoteStream, remoteVideoRef]);

  async function retryRemotePlayback() {
    const video = remoteVideoRef.current;
    if (!video) {
      return;
    }

    try {
      await video.play();
      setRemotePlaybackBlocked(false);
    } catch (error) {
      logDevDiagnostic("Viewer video manual playback failed", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-bold">
            <MonitorUp size={19} />
            Screen Share
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {activeScreenShare
              ? `${activeScreenShare.hostDisplayName} is presenting`
              : "Share a screen, window, or browser tab with room audio when available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSharing && (
            <LoadingButton type="button" isLoading={isStartingShare} className="secondary-button" disabled={Boolean(activeScreenShare)} onClick={() => void onStartSharing()}>
              <MonitorUp size={18} />
              Start Sharing
            </LoadingButton>
          )}
          {isSharing && (
            <button type="button" className="ghost-button" onClick={() => void onStopSharing()}>
              <ScreenShareOff size={18} />
              Stop Sharing
            </button>
          )}
        </div>
      </div>

      <div className="bg-black">
        {isSharing && (
          <video ref={localVideoRef} className="aspect-video w-full bg-black object-contain" muted autoPlay playsInline />
        )}
        {isViewing && (
          <div className="relative">
            <video
              ref={remoteVideoRef}
              className="aspect-video w-full bg-black object-contain"
              autoPlay
              playsInline
              controls
              muted={false}
            />
            {remotePlaybackBlocked && (
              <div className="absolute inset-0 grid place-items-center bg-black/68 px-5 text-center backdrop-blur-sm">
                <div>
                  <p className="text-sm font-semibold text-white">Playback needs a tap</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-white/55">
                    Your browser blocked autoplay with audio. Start playback manually to hear the shared tab or system audio.
                  </p>
                  <button type="button" className="primary-button mt-4" onClick={() => void retryRemotePlayback()}>
                    Play shared screen
                  </button>
                </div>
              </div>
            )}
            {remoteStreamTimedOut && remoteTrackCount === 0 && (
              <div className="absolute inset-0 grid place-items-center bg-black/76 px-5 text-center backdrop-blur-sm">
                <div>
                  <p className="text-sm font-semibold text-white">No media received yet</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-white/55">
                    The peer is connected, but no screen-share tracks arrived within 10 seconds. Ask the presenter to stop and start sharing again.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {!isSharing && !isViewing && (
          <div className="grid aspect-video place-items-center px-5 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-white/[0.06] text-white/55">
                <MonitorUp size={26} />
              </div>
              <p className="mt-4 text-sm font-semibold text-white/70">
                {activeScreenShare ? "Viewer mode is connecting..." : "No active screen share"}
              </p>
              <p className="mt-1 max-w-md text-sm leading-6 text-white/42">
                Browser tab audio is included when the presenter chooses a tab and enables audio in the browser picker.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#111118] px-4 py-3 text-sm text-white/52">
        <span>Mode: {isSharing ? "Presenter" : isViewing ? "Viewer" : "Idle"}</span>
        <span>Peer: {peerState}</span>
        <span>ICE: {iceState}</span>
        <span>Tracks: {remoteTrackCount}</span>
      </div>
    </section>
  );
}
