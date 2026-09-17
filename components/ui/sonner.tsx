"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global toast host (sonner). Position/duration defaults live here so every
 * toast.success / toast.error / toast.message across the app stays consistent.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      // Clear the WhatsApp FAB (bottom-5 + ~56px) and keep a side gutter.
      offset={{ bottom: 96, right: 20 }}
      mobileOffset={{ bottom: 96, right: 16 }}
      duration={3500}
      richColors
      closeButton
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-ivory group-[.toaster]:text-forest group-[.toaster]:border-gold/30 group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-gold group-[.toast]:text-forest",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-forest/15 group-[.toast]:bg-ivory group-[.toast]:text-forest/70",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
