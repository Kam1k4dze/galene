import React from "react";
import { useStore } from "@nanostores/react";
import { localPermissions } from "../../stores/state";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import TokenManager from "./TokenManager";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const perms = useStore(localPermissions);
  const isAdmin = perms.includes("op");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-100">Admin Controls</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isAdmin ? (
          <TokenManager />
        ) : (
          <div className="text-red-400 p-4 bg-red-400/10 rounded">
            You do not have permission to access admin controls.
          </div>
        )}
      </div>
    </div>
  );
}
