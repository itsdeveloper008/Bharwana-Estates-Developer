"use client";

import { useEffect, useState } from "react";
import { toast, Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

let errorDurationPatched = false;

/** Errors linger ~6s; success/info keep the Toaster default (~4s). Pause-on-hover is built into sonner. */
function patchErrorDuration() {
  if (errorDurationPatched || typeof window === "undefined") return;
  errorDurationPatched = true;
  const original = toast.error.bind(toast);
  toast.error = ((message, data) =>
    original(message, { duration: 6000, ...data })) as typeof toast.error;
}

/**
 * Global toast host (sonner). Viewport-fixed under the site header so toasts
 * never sit over form fields / filter chips. Close control sits inside the
 * toast box via globals.css ([data-sonner-toast] [data-close-button]).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    patchErrorDuration();
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Sonner
      theme="light"
      className="toaster group"
      position={mobile ? "top-center" : "top-right"}
      offset={
        mobile
          ? { top: "calc(var(--site-header-height, 96px) + 12px)", right: 12, left: 12 }
          : { top: "calc(var(--site-header-height, 96px) + 12px)", right: 16 }
      }
      mobileOffset={{ top: "calc(var(--site-header-height, 96px) + 12px)", right: 12, left: 12 }}
      duration={4000}
      gap={10}
      richColors
      closeButton
      visibleToasts={3}
      expand
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-ivory group-[.toaster]:text-forest group-[.toaster]:border-gold/30 group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-gold group-[.toast]:text-forest",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "bharwana-toast-close group-[.toast]:border-forest/15 group-[.toast]:bg-ivory group-[.toast]:text-forest/70",
          success:
            "group-[.toaster]:border-forest/25 group-[.toaster]:bg-ivory group-[.toaster]:text-forest",
          error: "group-[.toaster]:border-destructive/30",
        },
      }}
      style={
        {
          ["--width" as string]: "min(380px, calc(100vw - 24px))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
