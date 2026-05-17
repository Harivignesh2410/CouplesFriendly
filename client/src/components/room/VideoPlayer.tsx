import { RefObject } from "react";
import { Copy, Pause, Play } from "lucide-react";

type VideoPlayerProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: () => void;
  onCopyInvite: () => void;
  isConnected: boolean;
};

export function VideoPlayer({ videoRef, videoUrl, onVideoUrlChange, onPlay, onPause, onSeek, onCopyInvite, isConnected }: VideoPlayerProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-black/40">
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black object-contain"
          src={videoUrl}
          controls
          playsInline
          onPlay={onPlay}
          onPause={onPause}
          onSeeked={onSeek}
        />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur">
          {isConnected ? "Live Sync" : "Connecting"}
        </div>
      </div>
      <div className="grid gap-3 border-t border-white/10 bg-[#111118] p-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="text-sm font-medium text-white/60" htmlFor="video-url">
            Video URL
          </label>
          <input id="video-url" className="field mt-2" value={videoUrl} onChange={(event) => onVideoUrlChange(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ghost-button" onClick={() => void videoRef.current?.play()}>
            <Play size={18} />
            Play
          </button>
          <button type="button" className="ghost-button" onClick={() => videoRef.current?.pause()}>
            <Pause size={18} />
            Pause
          </button>
          <button type="button" className="primary-button" onClick={onCopyInvite}>
            <Copy size={18} />
            Copy Invite
          </button>
        </div>
      </div>
    </section>
  );
}
