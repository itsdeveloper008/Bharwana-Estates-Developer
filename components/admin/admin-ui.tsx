import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared Admin content chrome — page title block used across modules. */
export function AdminPageHeader({
  eyebrow,
  title,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <p className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-gold-800">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight text-forest sm:text-4xl">
          {title}
        </h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Pill filter tabs (Pending / Approved / …). */
export function adminTabClass(active: boolean) {
  return cn(
    "rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors",
    active
      ? "border-gold bg-gold text-forest"
      : "border-gold/50 bg-transparent text-forest hover:border-gold hover:bg-gold/10",
  );
}

/** Bordered table shell matching the cream admin content area. */
export function AdminTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-sm border border-forest/12 bg-white/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const adminTableHeadClass =
  "h-11 px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.16em] text-forest/70";

export const adminEmptyCellClass =
  "py-12 text-center font-serif text-sm italic text-forest/50";
