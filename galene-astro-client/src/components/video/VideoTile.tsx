import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { cn } from "@/lib/utils";
import { MicOff, Shield, Maximize2 } from "lucide-react";
import { ContextMenu } from "../ui/ContextMenu";
import { userVolumes } from "../../stores/state";
import { getAudioContext } from "@/lib/audio";

interface VideoTileProps {
  stream?: MediaStream;
  username: string;
  userId?: string;
  label?: string;
  isMuted?: boolean;
  isLocal?: boolean;
  isActive?: boolean;
  permissions?: string[];
  hidden?: boolean;
}

export function VideoTile({
  stream,
  username,
  userId,
  label,
  isMuted,
  isLocal,
  isActive,
  permissions = [],
  hidden = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const volumes = useStore(userVolumes);
  const volume = userId ? volumes[userId] ?? 100 : 100;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .catch((e) => console.error("Error playing video:", e));
    }
  }, [stream]);

  // Web Audio API for volume control (allows boosting > 100%)
  useEffect(() => {
    if (!stream || isLocal) return;

    // Check if stream has audio tracks to avoid DOMException
    if (stream.getAudioTracks().length === 0) {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    // Create nodes
    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch (e) {
      console.error("Failed to create MediaStreamSource:", e);
      return;
    }
    const gain = ctx.createGain();

    // Connect
    source.connect(gain);
    gain.connect(ctx.destination);

    // Store refs
    sourceNodeRef.current = source;
    gainNodeRef.current = gain;

    // Mute the video element to avoid double audio
    if (videoRef.current) {
      videoRef.current.muted = true;
    }

    // Ensure the audio context is running (it might be suspended by browser policy)
    if (ctx.state === "suspended") {
      ctx
        .resume()
        .catch((e) => console.error("Failed to resume audio context:", e));
    }

    return () => {
      source.disconnect();
      gain.disconnect();
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
    };
  }, [stream, isLocal]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLocal || !userId) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const isOp = permissions.includes("op");
  // const canPresent = permissions.includes("present");

  if (hidden) {
    return (
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-900 ring-2 transition-all duration-200 group",
          isActive
            ? "ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            : "ring-zinc-800 hover:ring-zinc-700"
        )}
        onContextMenu={handleContextMenu}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // Muted because we use Web Audio API for audio
          className={cn(
            "h-full w-full object-cover",
            isLocal && label !== "screenshare" && "scale-x-[-1]" // Mirror local video, but not screenshare
          )}
        />

        {/* Overlay info */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm z-10">
          {isOp && <Shield className="h-3 w-3 text-yellow-500" />}
          <span>
            {username} {isLocal && "(You)"}
          </span>
          {isMuted && <MicOff className="h-3 w-3 text-red-400" />}
        </div>

        {/* Fullscreen Button */}
        {stream && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 left-2 rounded bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 z-10"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Stream Label Badge */}
        {label && label !== "camera" && label !== "video" && (
          <div className="absolute top-2 right-2 rounded bg-blue-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm z-10">
            {label}
          </div>
        )}

        {/* Placeholder if no video */}
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold text-zinc-300">
              {username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {contextMenu && userId && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          userId={userId}
          username={username}
          permissions={permissions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
