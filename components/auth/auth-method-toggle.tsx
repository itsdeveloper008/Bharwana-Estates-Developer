"use client";

import { cn } from "@/lib/utils";

export type AuthMethod = "email" | "phone";

const OPTIONS: { id: AuthMethod; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
];

export function AuthMethodToggle({
  value,
  onChange,
}: {
  value: AuthMethod;
  onChange: (value: AuthMethod) => void;
}) {
  return (
    <div
      className="flex rounded-full border border-forest/10 bg-cream/50 p-1"
      role="tablist"
      aria-label="Sign-in method"
    >
      {OPTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200",
            value === item.id
              ? "bg-gold/25 text-forest shadow-sm"
              : "text-forest/55 hover:text-forest",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
