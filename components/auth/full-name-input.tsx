"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  FULL_NAME_MAX_LENGTH,
  sanitizePersonName,
} from "@/lib/person-name";
import { cn } from "@/lib/utils";

export type FullNameInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange" | "maxLength"
> & {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

/**
 * Full name field that only accepts English letters and spaces.
 * Digits and symbols are stripped on type/paste.
 */
export const FullNameInput = React.forwardRef<HTMLInputElement, FullNameInputProps>(
  function FullNameInput(
    { value, onChange, maxLength = FULL_NAME_MAX_LENGTH, className, autoComplete = "name", ...props },
    ref,
  ) {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="text"
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        className={cn(className)}
        onChange={(event) => {
          onChange(sanitizePersonName(event.target.value).slice(0, maxLength));
        }}
        {...props}
      />
    );
  },
);
