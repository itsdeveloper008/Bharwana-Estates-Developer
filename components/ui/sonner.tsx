"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Global toast host (sonner). Top-center keeps toasts clear of the WhatsApp FAB
 * (bottom-right) and admin page actions like "Add Property" (top-right).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      offset={{ top: 88 }}
      mobileOffset={{ top: 72 }}
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
          success:
            "group-[.toaster]:border-forest/25 group-[.toaster]:bg-ivory group-[.toaster]:text-forest",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
