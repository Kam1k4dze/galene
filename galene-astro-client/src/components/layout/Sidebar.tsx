import React from "react";
import { cn } from "@/lib/utils";

export function Sidebar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-60 flex-col bg-zinc-900 text-zinc-400",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
