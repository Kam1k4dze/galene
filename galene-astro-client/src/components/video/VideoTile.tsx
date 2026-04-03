import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { cn } from "@/lib/utils";
import { MicOff, Shield, Maximize2, Hand, HeadphoneOff } from "lucide-react";
import { ContextMenu } from "../ui/ContextMenu";
import { userVolumes, isDeafened } from "../../stores/state";
import { getAudioContext } from "@/lib/audio";

interface VideoTileProps {
  stream?: MediaStream;
  username: string;
  userId?: string;
  label?: string;
  /** True when this peer has explicitly broadcasted muted state. */
  isMuted?: boolean;
  /** True when this peer has explicitly broadcasted deafened state. */
  isDeafened?: boolean;
  /** True when this peer has raised their hand. */
  isHandRaised?: boolean;
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
  isDeafened: isDeafenedProp,
  isHandRaised,
  isLocal,
  isActive,
  permissions = [],
  hidden = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const volumes = useStore(userVolumes);
  const deafened = useStore(isDeafened);
  const volume = userId ? volumes[userId] ?? 100 : 100;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.error("Error playing video:", e));
    }
  }, [stream]);

  // Web Audio API for volume control + deafen
  useEffect(() => {
    if (!stream || isLocal) return;
    if (stream.getAudioTracks().length === 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch (e) {
      console.error("Failed to create MediaStreamSource:", e);
      return;
    }
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);

    sourceNodeRef.current = source;
    gainNodeRef.current = gain;

    if (videoRef.current) videoRef.current.muted = true;
    if (ctx.state === "suspended") ctx.resume().catch(console.error);

    return () => {
      source.disconnect();
      gain.disconnect();
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
    };
  }, [stream, isLocal]);

  // Apply volume (0 when deafened)
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = deafened ? 0 : volume / 100;
    }
  }, [volume, deafened]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLocal || !userId) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      document.fullscreenElement
        ? document.exitFullscreen()
        : videoRef.current.requestFullscreen();
    }
  };

  const isOp = permissions.includes("op");

  const hasVideo = !!stream && stream.getVideoTracks().length > 0;
  const showPlaceholder = !hasVideo;

  if (hidden) {
    return <video ref={videoRef} autoPlay playsInline muted className="hidden" />;
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
        {/* Hidden audio element always present when stream exists (audio handled via Web Audio) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "h-full w-full object-cover",
            showPlaceholder && "hidden",
            isLocal && label !== "screenshare" && "scale-x-[-1]"
          )}
        />

        {/* Placeholder for audio-only or no-stream users */}
        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-800">
            <div
              className={cn(
                "flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-zinc-200 ring-4 transition-all duration-150",
                isActive ? "ring-green-500 bg-zinc-600" : "ring-transparent bg-zinc-700"
              )}
            >
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-semibold text-zinc-200">
                {username} {isLocal && <span className="text-zinc-400 font-normal text-sm">(You)</span>}
              </span>
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                {isHandRaised && <Hand className="h-3.5 w-3.5 text-yellow-400" />}
                {isDeafenedProp && <HeadphoneOff className="h-3.5 w-3.5 text-zinc-400" />}
                {isMuted && !isDeafenedProp && <MicOff className="h-3.5 w-3.5 text-zinc-400" />}
              </div>
            </div>
          </div>
        )}

        {/* Raised hand badge */}
        {isHandRaised && !showPlaceholder && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-yellow-500/90 px-2 py-0.5 text-xs font-semibold text-black backdrop-blur-sm">
            <Hand className="h-3 w-3" />
            Hand raised
          </div>
        )}

        {/* Bottom info bar — only when video is visible */}
        {hasVideo && (
          <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm z-10">
            {isOp && <Shield className="h-3 w-3 text-yellow-500" />}
            <span>{username} {isLocal && "(You)"}</span>
            {isDeafenedProp && <HeadphoneOff className="h-3 w-3 text-zinc-400" />}
            {isMuted && !isDeafenedProp && <MicOff className="h-3 w-3 text-zinc-400" />}
          </div>
        )}

        {/* Fullscreen button */}
        {hasVideo && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 left-2 rounded bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100 z-10"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {/* Stream label badge */}
        {label && label !== "camera" && label !== "video" && (
          <div className="absolute top-2 right-2 rounded bg-blue-500/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm z-10">
            {label}
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
