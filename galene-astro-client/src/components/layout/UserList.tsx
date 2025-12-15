import React from "react";
import { cn } from "@/lib/utils";

export function UserList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-60 flex-col bg-zinc-900 text-zinc-400 border-l border-zinc-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
