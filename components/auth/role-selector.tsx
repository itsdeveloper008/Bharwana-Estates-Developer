"use client";

import { Briefcase, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const ROLE_OPTIONS = [
  { id: "BUYER" as const, label: "Buyer", hint: "Browse and inquire", icon: UserRound },
  { id: "HOUSE_OWNER" as const, label: "House Owner", hint: "List your residence", icon: Home },
  { id: "DEALER" as const, label: "Dealer", hint: "List inventory, earn through Bharwana", icon: Briefcase },
];

export function RoleSelector({
  value,
  onChange,
  compact = false,
}: {
  value: "BUYER" | "HOUSE_OWNER" | "DEALER";
  onChange: (role: "BUYER" | "HOUSE_OWNER" | "DEALER") => void;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ROLE_OPTIONS.map((option) => {
        const active = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "min-w-0 rounded-2xl border text-left transition-colors duration-200",
              compact ? "px-2 py-2 sm:px-2.5" : "px-2.5 py-3 sm:px-3",
              active
                ? "border-gold bg-gold/10 text-forest"
                : "border-forest/15 bg-white text-forest hover:border-gold/45",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-gold-700" : "text-forest/45")} strokeWidth={1.5} />
            <span className={cn("mt-1.5 block font-medium leading-snug", compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm")}>
              {option.label}
            </span>
            {!compact ? (
              <span className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground sm:block sm:text-[11px]">
                {option.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
