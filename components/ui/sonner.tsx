"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-ivory group-[.toaster]:text-forest group-[.toaster]:border-gold/30 group-[.toaster]:shadow-lift",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-gold group-[.toast]:text-forest",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
