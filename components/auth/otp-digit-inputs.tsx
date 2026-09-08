"use client";

import { useRef, type KeyboardEvent, type ClipboardEvent } from "react";
import { cn } from "@/lib/utils";

/** Six single-digit OTP boxes with auto-advance and numeric-only input. */
export function OtpDigitInputs({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, char: string) {
    const next = digits.map((digit, i) => (i === index ? char : digit));
    onChange(next.join("").slice(0, 6));
  }

  function handleChange(index: number, raw: string) {
    const numeric = raw.replace(/\D/g, "");
    if (!numeric) {
      setDigit(index, "");
      return;
    }
    const char = numeric.slice(-1);
    setDigit(index, char);
    if (index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigit(index, "");
        return;
      }
      if (index > 0) {
        setDigit(index - 1, "");
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="One-time passcode">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-10 rounded-xl border bg-white text-center text-lg font-medium text-forest shadow-sm outline-none transition-colors sm:h-12 sm:w-11",
            "focus-visible:ring-1 focus-visible:ring-ring",
            hasError ? "border-destructive focus-visible:ring-destructive" : "border-input",
            disabled && "opacity-60",
          )}
        />
      ))}
    </div>
  );
}
