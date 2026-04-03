import React from "react";
import { useStore } from "@nanostores/react";
import { fileTransfers } from "../../stores/state";
import { Button } from "../ui/button";
import { Download, X, Upload } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, string> = {
  inviting: "Waiting for recipient…",
  connecting: "Connecting…",
  connected: "Transferring…",
  done: "Done",
  cancelled: "Cancelled",
  pending: "Incoming — waiting for you",
};

export function FileTransferList() {
  const transfers = useStore(fileTransfers);
  const list = Object.values(transfers);

  if (list.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-50 w-80 space-y-2 pointer-events-auto">
      {list.map((ft) => {
        const pct =
          ft.size > 0 && ft.progress > 0
            ? Math.min(100, Math.round((ft.progress / ft.size) * 100))
            : 0;
        const isTransferring = ft.status === "connected";
        const label = STATUS_LABELS[ft.status] ?? ft.status;

        return (
          <div
            key={ft.id}
            className="bg-zinc-800 p-3 rounded shadow-lg border border-zinc-700 text-white"
          >
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {ft.up ? (
                  <Upload className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-green-400 shrink-0" />
                )}
                <span
                  className="font-semibold text-sm truncate"
                  title={ft.name}
                >
                  {ft.name}
                </span>
              </div>
              <button
                onClick={() => ft.handle.cancel()}
                className="text-zinc-400 hover:text-white ml-2 shrink-0"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>

            <div className="text-xs text-zinc-400 mb-2">
              {ft.up ? "To all" : `From: ${ft.sender || "Unknown"}`} ·{" "}
              {formatBytes(ft.size)}
            </div>

            {/* Progress bar */}
            {isTransferring && ft.size > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>{label}</span>
                  <span>
                    {formatBytes(ft.progress)} / {formatBytes(ft.size)} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {!isTransferring && (
              <div className="text-xs text-zinc-400 mb-2">{label}</div>
            )}

            {/* Accept button for incoming pending transfers */}
            {!ft.up && ft.status === "pending" && (
              <Button
                size="sm"
                onClick={() => ft.handle.receive()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Download size={14} className="mr-2" /> Accept
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
