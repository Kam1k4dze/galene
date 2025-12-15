import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { globalError } from "../../stores/state";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErrorToast() {
  const error = useStore(globalError);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => globalError.set(null), 300); // Clear after animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!error && !visible) return null;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex w-full max-w-sm items-start gap-3 rounded-lg bg-red-500/10 p-4 text-red-200 shadow-lg backdrop-blur-md border border-red-500/20 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      )}
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
      <div className="flex-1 text-sm">
        <h3 className="font-semibold text-red-400">Error</h3>
        <p className="mt-1 text-red-200/80">{error}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 rounded-full p-1 hover:bg-red-500/20 text-red-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
