"use client";

import { forwardRef } from "react";
import { PK_COUNTRY_DIAL, toPakistanMobileLocal } from "@/lib/phone-format";
import { cn } from "@/lib/utils";

type PakistanPhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type" | "maxLength" | "inputMode"
> & {
  value: string;
  onChange: (localDigits: string) => void;
  hasError?: boolean;
};

/** Fixed +92 prefix; editable portion is digits-only, max 10 (Pakistani mobile). */
export const PakistanPhoneInput = forwardRef<HTMLInputElement, PakistanPhoneInputProps>(
  function PakistanPhoneInput(
    { value, onChange, onBlur, hasError, className, disabled, id, name, ...rest },
    ref,
  ) {
    const local = toPakistanMobileLocal(value);

    return (
      <div
        className={cn(
          "flex h-10 w-full overflow-hidden rounded-xl border border-input bg-white shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
          hasError && "border-destructive focus-within:ring-destructive",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span
          className="inline-flex shrink-0 select-none items-center bg-cream/70 px-3 text-sm font-medium text-forest"
          aria-hidden
        >
          {PK_COUNTRY_DIAL}
        </span>
        <span className="w-px shrink-0 self-stretch bg-forest/15" aria-hidden />
        <input
          {...rest}
          id={id}
          name={name}
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]*"
          maxLength={10}
          disabled={disabled}
          placeholder="300 1234567"
          value={local}
          onBlur={onBlur}
          onChange={(event) => onChange(toPakistanMobileLocal(event.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-base placeholder:text-muted-foreground md:text-sm md:placeholder:text-sm"
          aria-label="Mobile number without country code"
        />
      </div>
    );
  },
);
