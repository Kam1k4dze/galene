import React from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserListItemProps {
  username: string;
  isSelf?: boolean;
  isOp?: boolean;
}

export function UserListItem({ username, isSelf, isOp }: UserListItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer group">
      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-zinc-300">
          <User className="h-4 w-4" />
        </div>
        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-zinc-900" />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "text-sm font-medium",
            isSelf ? "text-indigo-400" : "text-zinc-300",
            isOp && "text-yellow-500"
          )}
        >
          {username} {isSelf && "(You)"}
        </span>
        <span className="text-xs text-zinc-500">Online</span>
      </div>
    </div>
  );
}
