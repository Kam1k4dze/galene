import React from "react";
import { cn } from "@/lib/utils";

export function ControlBar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-14 items-center justify-between bg-zinc-950 px-4 text-zinc-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
