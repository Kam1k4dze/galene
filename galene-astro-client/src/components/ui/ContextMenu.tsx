import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@nanostores/react";
import { galene } from "../../stores/galene";
import { localPermissions, userVolumes } from "../../stores/state";
import {
  Shield,
  ShieldAlert,
  MicOff,
  UserX,
  MonitorUp,
  MonitorOff,
  Volume2,
} from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  userId: string;
  username: string;
  permissions?: string[];
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  userId,
  username,
  permissions = [],
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const myPerms = useStore(localPermissions);
  const isOp = myPerms.includes("op");
  const volumes = useStore(userVolumes);
  const volume = volumes[userId] ?? 100;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const isTargetOp = permissions.includes("op");
  const isTargetPresent = permissions.includes("present");

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] overflow-hidden rounded-md border border-zinc-800 bg-[#111214] p-1 shadow-xl text-zinc-200"
      style={{ top: y, left: x }}
    >
      <div className="px-2 py-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {username}
      </div>

      <div className="h-px bg-zinc-800 my-1" />

      {/* Volume Control */}
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-400">
          <Volume2 className="h-3 w-3" />
          <span>User Volume</span>
          <span className="ml-auto">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          value={volume}
          onChange={(e) => galene.setVolume(userId, parseInt(e.target.value))}
          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#5865F2]"
        />
      </div>

      {isOp && (
        <>
          <div className="h-px bg-zinc-800 my-1" />

          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#5865F2] hover:text-white transition-colors"
            onClick={() => {
              galene.setOp(userId, !isTargetOp);
              onClose();
            }}
          >
            {isTargetOp ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            {isTargetOp ? "Remove Op" : "Make Op"}
          </button>

          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#5865F2] hover:text-white transition-colors"
            onClick={() => {
              galene.setPresenting(userId, !isTargetPresent);
              onClose();
            }}
          >
            {isTargetPresent ? (
              <MonitorOff className="h-4 w-4" />
            ) : (
              <MonitorUp className="h-4 w-4" />
            )}
            {isTargetPresent ? "Revoke Present" : "Allow Present"}
          </button>

          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[#5865F2] hover:text-white transition-colors"
            onClick={() => {
              galene.muteUser(userId);
              onClose();
            }}
          >
            <MicOff className="h-4 w-4" />
            Mute User
          </button>

          <div className="h-px bg-zinc-800 my-1" />

          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            onClick={() => {
              galene.kickUser(userId);
              onClose();
            }}
          >
            <UserX className="h-4 w-4" />
            Kick User
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
