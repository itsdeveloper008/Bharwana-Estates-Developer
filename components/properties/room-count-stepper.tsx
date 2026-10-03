"use client";

import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ROOM_COUNT_TEN_PLUS,
  roomCountToSelectValue,
  selectValueToRoomCount,
} from "@/lib/room-count";
import { cn } from "@/lib/utils";

export function RoomCountStepper({
  value,
  onChange,
  onBlur,
  name,
  icon: Icon,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  name?: string;
  icon: LucideIcon;
  placeholder: string;
  className?: string;
}) {
  const display = roomCountToSelectValue(value);
  const [text, setText] = useState(display);
  const atMax = display === "10+";
  const atMin = !display;

  useEffect(() => {
    setText(roomCountToSelectValue(value));
  }, [value]);

  function step(delta: 1 | -1) {
    if (delta === 1) {
      if (!display) {
        onChange(1);
        return;
      }
      if (display === "10+") return;
      const n = Number(display);
      if (n >= 10) onChange(ROOM_COUNT_TEN_PLUS);
      else onChange(n + 1);
      return;
    }
    // decrease
    if (!display) return;
    if (display === "10+") {
      onChange(10);
      return;
    }
    const n = Number(display);
    if (n <= 1) {
      onChange(undefined);
      return;
    }
    onChange(n - 1);
  }

  function commitText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(undefined);
      setText("");
      return;
    }
    if (trimmed === "10+") {
      onChange(ROOM_COUNT_TEN_PLUS);
      setText("10+");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 1) {
      setText(display);
      return;
    }
    if (n > 10) {
      onChange(ROOM_COUNT_TEN_PLUS);
      setText("10+");
      return;
    }
    const next = Math.trunc(n);
    onChange(next);
    setText(String(next));
  }

  return (
    <div className={cn("relative", className)}>
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40"
        strokeWidth={1.5}
      />
      <input
        type="text"
        inputMode="numeric"
        name={name}
        value={text}
        placeholder={placeholder}
        onBlur={() => {
          commitText(text);
          onBlur?.();
        }}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "" || raw === "10+" || /^\d{0,3}$/.test(raw)) {
            setText(raw);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            step(-1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            commitText(text);
          }
        }}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] py-2 pl-9 pr-10 text-sm text-forest shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35",
        )}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-forest/15 bg-[#FBF9F5]">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          disabled={atMax}
          onClick={() => step(1)}
          className={cn(
            "flex h-4 w-7 items-center justify-center text-forest transition hover:bg-gold/20 hover:text-forest",
            atMax && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-forest",
          )}
        >
          <ChevronUp className="h-3 w-3 text-gold" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={atMin}
          onClick={() => step(-1)}
          className={cn(
            "flex h-4 w-7 items-center justify-center border-t border-forest/10 text-forest transition hover:bg-gold/20 hover:text-forest",
            atMin && "cursor-not-allowed opacity-35 hover:bg-transparent hover:text-forest",
          )}
        >
          <ChevronDown className="h-3 w-3 text-gold" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/** Re-export for callers that still convert string select values. */
export { selectValueToRoomCount, roomCountToSelectValue };
