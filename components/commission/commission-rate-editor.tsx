"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCommissionRate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Validate a percent input (0–100). Returns fraction (0–1) or null. */
export function parseCommissionPercent(raw: string): number | null {
  const pct = Number.parseFloat(raw.trim());
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  return pct / 100;
}

export function CommissionRateEditor({
  rate,
  onSave,
  disabled,
  className,
  label = "Commission rate (%)",
  compact,
}: {
  /** Stored fraction, e.g. 0.025 = 2.5%. */
  rate: number;
  onSave: (nextRate: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState((rate * 100).toFixed(1));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft((rate * 100).toFixed(1));
  }, [rate]);

  async function handleSave() {
    const next = parseCommissionPercent(draft);
    if (next == null) {
      toast.error("Enter a commission rate between 0 and 100%.");
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      toast.success(`Commission rate saved (${formatCommissionRate(next)}).`);
    } catch (error) {
      console.error(error);
      toast.error("Could not save commission rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn(compact ? "flex flex-wrap items-end gap-2" : "space-y-2", className)}>
      {!compact && (
        <Label htmlFor="commission-rate-input" className="text-forest">
          {label}
        </Label>
      )}
      <div className={cn("flex items-center gap-2", compact && "min-w-0")}>
        {compact && (
          <span className="sr-only" id="commission-rate-label">
            {label}
          </span>
        )}
        <Input
          id="commission-rate-input"
          aria-labelledby={compact ? "commission-rate-label" : undefined}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.1}
          value={draft}
          disabled={disabled || saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSave();
            }
          }}
          className={cn("h-9 w-[5.5rem]", compact && "h-8 w-20 text-sm")}
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          variant={compact ? "outline" : "default"}
          disabled={disabled || saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Current: {formatCommissionRate(rate)}. Changes sync for Admin and Dealer instantly.
        </p>
      )}
    </div>
  );
}
