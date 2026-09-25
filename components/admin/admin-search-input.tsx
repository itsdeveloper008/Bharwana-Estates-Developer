"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Shared admin list search — place above the table, below filter tabs. */
export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative mb-4 max-w-md", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/45"
        strokeWidth={1.75}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 border-forest/15 bg-white pl-9 pr-9 text-forest placeholder:text-forest/45"
        aria-label={placeholder}
      />
      {value.trim() ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-forest/45 transition hover:bg-forest/5 hover:text-forest"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}
