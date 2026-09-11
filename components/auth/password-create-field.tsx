"use client";

import { useState, type Ref } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import { cn } from "@/lib/utils";

type FieldBag = {
  value: string;
  onChange: (...args: unknown[]) => void;
  onBlur: () => void;
  name: string;
  ref: Ref<HTMLInputElement>;
};

/** Password field for account creation — live requirement checklist. */
export function PasswordCreateField({
  field,
  fieldState,
}: {
  field: FieldBag;
  fieldState: { error?: { message?: string } };
}) {
  const [show, setShow] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [focused, setFocused] = useState(false);
  const value = field.value ?? "";
  const showChecklist = focused || value.length > 0;

  return (
    <FormItem className="space-y-1">
      <FormLabel>Password</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            placeholder="Password"
            readOnly={!unlocked}
            value={value}
            name={field.name}
            ref={field.ref}
            onFocus={() => {
              setUnlocked(true);
              setFocused(true);
            }}
            onBlur={() => {
              setFocused(false);
              field.onBlur();
            }}
            onChange={field.onChange}
            className={cn(
              "bg-white pr-10",
              fieldState.error && "border-destructive focus-visible:ring-destructive",
            )}
            aria-describedby="password-requirements"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/50 transition-colors duration-200 hover:text-forest"
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FormControl>
      {showChecklist ? (
        <ul
          id="password-requirements"
          className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2"
          aria-live="polite"
        >
          {PASSWORD_REQUIREMENTS.map((item) => {
            const met = item.test(value);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] leading-tight",
                  met ? "text-forest" : "text-muted-foreground",
                )}
              >
                {met ? (
                  <Check className="h-3 w-3 shrink-0 text-[#2F6B4F]" aria-hidden />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
                )}
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {fieldState.error ? <FormMessage /> : null}
    </FormItem>
  );
}
