"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AdminDetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">{title}</p>
      {children}
    </section>
  );
}

export function AdminDetailField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="text-sm text-forest">{children}</div>
    </div>
  );
}

export function AdminDetailPlaceholder({ children = "Not provided" }: { children?: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export function AdminDetailModal({
  open,
  onOpenChange,
  title,
  badges,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  badges?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden border-forest/10 bg-ivory p-0 sm:rounded-2xl [&>button]:hidden",
          className,
        )}
      >
        <header className="shrink-0 border-b border-forest/10 bg-ivory px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 space-y-2">
              <DialogTitle className="font-serif text-2xl leading-tight text-forest sm:text-3xl">
                {title}
              </DialogTitle>
              {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
            </div>
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-sm text-forest/60 transition-colors hover:text-forest focus:outline-none focus:ring-2 focus:ring-gold/40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-forest/10 bg-ivory px-4 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
