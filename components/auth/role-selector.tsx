"use client";

import { Briefcase, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const ROLE_OPTIONS = [
  {
    id: "INDIVIDUAL" as const,
    label: "Individual",
    hint: "Buy, save, inquire, and list your own property",
    icon: UserRound,
  },
  {
    id: "DEALER" as const,
    label: "Dealer",
    hint: "List inventory, earn through Bharwana",
    icon: Briefcase,
  },
];

export type SelectableRole = (typeof ROLE_OPTIONS)[number]["id"];

/** Segmented role control — same pill shell as AuthMethodToggle (Email/Phone). */
export function RoleSelector({
  value,
  onChange,
  compact = false,
}: {
  value: SelectableRole;
  onChange: (role: SelectableRole) => void;
  /** Kept for call-site compatibility; segments stay compact either way. */
  compact?: boolean;
}) {
  void compact;

  return (
    <div
      className="flex rounded-xl bg-[#EDEBE6] p-1"
      role="radiogroup"
      aria-label="I am a"
    >
      {ROLE_OPTIONS.map((option) => {
        const active = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 transition-colors duration-200 sm:gap-1.5 sm:px-3 sm:py-3",
              active
                ? "bg-gold/15 text-forest shadow-sm ring-1 ring-inset ring-gold/55"
                : "text-forest/55 hover:text-forest",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0", active ? "text-gold-700" : "text-forest/40")}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="max-w-full text-center text-[11px] font-semibold leading-tight tracking-wide sm:text-xs">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
