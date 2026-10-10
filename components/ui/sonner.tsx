"use client";

import { useEffect } from "react";
import { toast, Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

let errorDurationPatched = false;

/** Errors linger 6s; success/info keep Toaster default (4s). Pause-on-hover is built into sonner. */
function patchErrorDuration() {
  if (errorDurationPatched || typeof window === "undefined") return;
  errorDurationPatched = true;
  const original = toast.error.bind(toast);
  toast.error = ((message, data) =>
    original(message, { duration: 6000, ...data })) as typeof toast.error;
}

/**
 * Single global toast host (sonner) for admin + public.
 * Fixed bottom-center viewport layer — never in page flow.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  useEffect(() => {
    patchErrorDuration();
  }, []);

  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-center"
      offset={{ bottom: 24 }}
      mobileOffset={{
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: 16,
        right: 16,
      }}
      duration={4000}
      gap={8}
      richColors
      closeButton
      visibleToasts={3}
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast bharwana-toast group-[.toaster]:bg-ivory group-[.toaster]:text-forest group-[.toaster]:border-gold/30 group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-gold group-[.toast]:text-forest",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "bharwana-toast-close group-[.toast]:border-forest/15 group-[.toast]:bg-ivory group-[.toast]:text-forest/70",
          success:
            "group-[.toaster]:border-forest/25 group-[.toaster]:bg-ivory group-[.toaster]:text-forest",
          error: "group-[.toaster]:border-destructive/30",
          info: "group-[.toaster]:border-forest/20 group-[.toaster]:bg-ivory group-[.toaster]:text-forest",
        },
      }}
      style={
        {
          ["--width" as string]: "min(420px, calc(100vw - 32px))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
