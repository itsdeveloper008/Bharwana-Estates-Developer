"use client";

import { useState } from "react";
import {
  Building2,
  CheckSquare,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  categoryPluralLabel,
  PROPERTY_CATEGORIES,
  PROPERTY_SUBTYPES,
} from "@/lib/property-taxonomy";
import type { ListingType, PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PURPOSE_OPTIONS = [
  { id: "buy", label: "Buy" },
  { id: "rent", label: "Rent" },
] as const;

export type PurposeId = (typeof PURPOSE_OPTIONS)[number]["id"];

export const SOURCE_OPTIONS = [
  { id: "owner", label: "Owner", listingType: "DIRECT_OWNER" as ListingType },
  { id: "dealer", label: "Dealer", listingType: "BUSINESS" as ListingType },
] as const;

export type SourceId = (typeof SOURCE_OPTIONS)[number]["id"] | "ALL";

export const AREA_UNITS = [
  { id: "sqft", label: "sqft", toSqft: 1 },
  { id: "marla", label: "Marla", toSqft: 225 },
  { id: "kanal", label: "Kanal", toSqft: 4500 },
] as const;

export type AreaUnitId = (typeof AREA_UNITS)[number]["id"];

export const CURRENCIES = [
  { id: "PKR", label: "PKR", toPkr: 1 },
  { id: "USD", label: "USD", toPkr: 280 },
] as const;

export type CurrencyId = (typeof CURRENCIES)[number]["id"];

const ALL_ICONS = {
  HOME: LayoutGrid,
  PLOTS: CheckSquare,
  COMMERCIAL: Building2,
} as const;

export function rangeTriggerLabel(
  kind: "Area" | "Price",
  unitLabel: string,
  min: string,
  max: string,
) {
  const hasMin = Number(min) > 0;
  const hasMax = max.trim() !== "" && Number.isFinite(Number(max));
  if (!hasMin && !hasMax) return `${kind} (${unitLabel})`;
  if (hasMin && hasMax) return `${min}–${max} ${unitLabel}`;
  if (hasMin) return `${min}+ ${unitLabel}`;
  return `Up to ${max} ${unitLabel}`;
}

export function toScaledAmount(value: string, scale: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * scale);
}

export function fromScaledAmount(sqftOrPkr: number | undefined, scale: number) {
  if (sqftOrPkr == null || !Number.isFinite(sqftOrPkr) || scale <= 0) return "";
  const converted = sqftOrPkr / scale;
  return Number.isInteger(converted) ? String(converted) : converted.toFixed(2).replace(/\.?0+$/, "");
}

export function PillToggleGroup({
  options,
  value,
  onChange,
  allowDeselect,
}: {
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  allowDeselect?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-ivory p-1 shadow-lift ring-1 ring-forest/10">
      {options.map((item) => {
        const isActive = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (allowDeselect && value === item.id) onChange("ALL");
              else onChange(item.id);
            }}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-forest text-ivory shadow-[0_8px_20px_-10px_rgba(15,46,29,0.45)]"
                : "text-forest/80 hover:bg-forest/[0.07] hover:text-forest",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function RangeFilterPopover({
  title,
  changeLabel,
  onChangeMeta,
  triggerLabel,
  min,
  max,
  onApply,
  onReset,
  accentBorder,
}: {
  title: string;
  changeLabel: string;
  onChangeMeta: () => void;
  triggerLabel: string;
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
  onReset: () => void;
  accentBorder?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftMin(min);
      setDraftMax(max);
    }
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left text-sm text-forest transition-colors",
            accentBorder ? "border-gold/50" : "border-input",
            open && "border-forest/30",
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-forest/45 transition-transform", open && "rotate-180")}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(100vw-2rem,20rem)] border-forest/10 bg-ivory p-4 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-forest">{title}</p>
          <button
            type="button"
            onClick={onChangeMeta}
            className="text-sm font-medium text-forest transition-colors hover:text-forest-800"
          >
            {changeLabel}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Minimum</label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value)}
              className="h-11 rounded-xl bg-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Maximum</label>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Any"
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value)}
              className="h-11 rounded-xl bg-white placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => {
              setDraftMin("0");
              setDraftMax("");
              onReset();
              setOpen(false);
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="h-11 bg-forest text-ivory hover:bg-forest-800"
            onClick={() => {
              onApply(draftMin, draftMax);
              setOpen(false);
            }}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PropertyTypePicker({
  category,
  subtype,
  onChange,
  triggerClassName,
  align = "end",
}: {
  category: PropertyCategory;
  subtype: string | "ALL";
  onChange: (next: { category: PropertyCategory; subtype: string | "ALL" }) => void;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PropertyCategory>(category);
  const AllIcon = ALL_ICONS[activeTab];
  const options = PROPERTY_SUBTYPES[activeTab];
  const triggerLabel =
    subtype === "ALL"
      ? categoryPluralLabel(category)
      : PROPERTY_SUBTYPES[category].find((item) => item.id === subtype)?.label ??
        categoryPluralLabel(category);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setActiveTab(category);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 text-left text-sm text-forest outline-none",
            triggerClassName,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-forest/50 transition-transform", open && "rotate-180")}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[min(100vw-2rem,22rem)] border-forest/10 bg-ivory p-0 shadow-lift"
      >
        <div className="flex border-b border-forest/10">
          {PROPERTY_CATEGORIES.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative flex-1 px-3 py-3 text-sm font-medium transition-colors",
                  active ? "text-forest" : "text-muted-foreground hover:text-forest",
                )}
              >
                {item.pluralLabel}
                {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 bg-forest" /> : null}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <button
            type="button"
            onClick={() => {
              onChange({ category: activeTab, subtype: "ALL" });
              setOpen(false);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              category === activeTab && subtype === "ALL"
                ? "border-forest bg-forest text-ivory"
                : "border-forest/15 text-forest/80 hover:border-forest/30",
            )}
          >
            <AllIcon
              className={cn(
                "h-4 w-4 shrink-0",
                category === activeTab && subtype === "ALL" ? "text-ivory" : "text-forest/45",
              )}
              strokeWidth={1.5}
            />
            All {PROPERTY_CATEGORIES.find((item) => item.id === activeTab)?.pluralLabel}
          </button>
          {options.map((option) => {
            const Icon = option.icon;
            const selected = category === activeTab && subtype === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange({ category: activeTab, subtype: option.id });
                  setOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  selected
                    ? "border-forest bg-forest text-ivory"
                    : "border-forest/15 text-forest/80 hover:border-forest/30",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", selected ? "text-ivory" : "text-forest/45")}
                  strokeWidth={1.5}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
