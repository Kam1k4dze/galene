import React from "react";

interface ChatMessageProps {
  username: string;
  message: string;
  time: Date;
  isSystem?: boolean;
}

export function ChatMessage({
  username,
  message,
  time,
  isSystem,
}: ChatMessageProps) {
  if (isSystem) {
    return <div className="py-1 text-xs text-zinc-500 italic">{message}</div>;
  }

  return (
    <div className="group flex gap-3 py-1 hover:bg-zinc-800/30 -mx-2 px-2 rounded">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-indigo-400 hover:underline cursor-pointer">
            {username}
          </span>
          <span className="text-[10px] text-zinc-500">
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-sm text-zinc-300 wrap-break-word whitespace-pre-wrap">
          {message}
        </p>
      </div>
    </div>
  );
}
