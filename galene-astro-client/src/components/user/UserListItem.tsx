import { MicOff, Headphones, Hand, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserListItemProps {
  username: string;
  isSelf?: boolean;
  isOp?: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isHandRaised?: boolean;
  isActive?: boolean;
}

export function UserListItem({
  username,
  isSelf,
  isOp,
  isMuted,
  isDeafened,
  isHandRaised,
  isActive,
}: UserListItemProps) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50 cursor-pointer group">
      {/* Avatar with speaking ring */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 text-xs font-bold ring-2 transition-all duration-150",
            isActive ? "ring-green-500" : "ring-transparent"
          )}
        >
          {username.slice(0, 2).toUpperCase()}
        </div>
        {/* Online dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-zinc-900" />
      </div>

      {/* Name */}
      <span
        className={cn(
          "flex-1 truncate text-sm font-medium",
          isSelf ? "text-indigo-400" : "text-zinc-300",
          isOp && "text-yellow-400"
        )}
      >
        {username}
        {isSelf && <span className="ml-1 text-xs font-normal text-zinc-500">(You)</span>}
      </span>

      {/* Status icons */}
      <div className="flex items-center gap-1 text-zinc-500">
        {isHandRaised && <Hand className="h-3.5 w-3.5 text-yellow-400" />}
        {isOp && <Shield className="h-3.5 w-3.5 text-yellow-500" />}
        {isDeafened && <Headphones className="h-3.5 w-3.5" />}
        {isMuted && !isDeafened && <MicOff className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}
