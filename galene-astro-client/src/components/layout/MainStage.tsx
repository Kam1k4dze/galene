import React from "react";
import { cn } from "@/lib/utils";

export function MainStage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col bg-zinc-800 text-zinc-200 overflow-hidden relative",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
