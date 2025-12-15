import React from "react";
import { useStore } from "@nanostores/react";
import { fileTransfers } from "../../stores/state";
import { Button } from "../ui/button";
import { Download, X } from "lucide-react";

export function FileTransferList() {
  const transfers = useStore(fileTransfers);
  const list = Object.values(transfers);

  if (list.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-50 w-80 space-y-2 pointer-events-auto">
      {list.map((ft) => (
        <div
          key={ft.id}
          className="bg-zinc-800 p-3 rounded shadow-lg border border-zinc-700 text-white"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="font-bold text-sm">
              {ft.up ? "Sending" : "Receiving"} {ft.name}
            </span>
            <button
              onClick={() => ft.handle.cancel()}
              className="text-zinc-400 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="text-xs text-zinc-400 mb-2">
            From: {ft.sender || "Unknown"} | Size: {(ft.size / 1024).toFixed(1)}{" "}
            KB
          </div>
          <div className="text-xs mb-2">Status: {ft.status}</div>

          {!ft.up && ft.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  ft.handle.receive();
                }}
                disabled={ft.status !== "pending"}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} className="mr-2" /> Accept
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
