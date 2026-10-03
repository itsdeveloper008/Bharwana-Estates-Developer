"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckSquare,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/format";
import {
  categoryPluralLabel,
  PROPERTY_CATEGORIES,
  PROPERTY_SUBTYPES,
} from "@/lib/property-taxonomy";
import type { ListingType, PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AREA_UNITS,
  type AreaUnitId,
} from "@/lib/area-units";

/** Price filter dual-handle slider (PKR scale unless overridden). */
export const PRICE_SLIDER_MAX = 2_000_000_000;
export const PRICE_SLIDER_STEP = 100_000;

export { AREA_UNITS, type AreaUnitId };

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
  if (hasMin && hasMax) return `${min}-${max} ${unitLabel}`;
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

function parseRangeNumber(raw: string, fallback: number) {
  if (raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function clampRange(minVal: number, maxVal: number, absoluteMax: number) {
  let min = Math.min(Math.max(0, minVal), absoluteMax);
  let max = Math.min(Math.max(0, maxVal), absoluteMax);
  if (min > max) min = max;
  return { min, max };
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
  /** When set, shows a dual-handle slider synced to the min/max inputs (Price filter). */
  priceSlider,
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
  priceSlider?: {
    absoluteMax?: number;
    step?: number;
    /** Scale from display unit → PKR for formatPrice (1 for PKR). */
    toPkr?: number;
    unitLabel?: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);

  const absoluteMax = priceSlider?.absoluteMax ?? PRICE_SLIDER_MAX;
  const step = priceSlider?.step ?? PRICE_SLIDER_STEP;
  const toPkr = priceSlider?.toPkr ?? 1;

  const sliderValues = useMemo(() => {
    const minVal = parseRangeNumber(draftMin, 0);
    const maxRaw = draftMax.trim() === "" ? absoluteMax : parseRangeNumber(draftMax, absoluteMax);
    const clamped = clampRange(minVal, maxRaw, absoluteMax);
    return [clamped.min, clamped.max] as [number, number];
  }, [draftMin, draftMax, absoluteMax]);

  const rangeLabel = useMemo(() => {
    if (!priceSlider) return null;
    const [lo, hi] = sliderValues;
    const formatDisplay = (n: number) => formatPrice(Math.round(n * toPkr));
    const maxIsAny = draftMax.trim() === "" || hi >= absoluteMax;
    return maxIsAny
      ? `${formatDisplay(lo)} – Any`
      : `${formatDisplay(lo)} – ${formatDisplay(hi)}`;
  }, [priceSlider, sliderValues, draftMax, absoluteMax, toPkr]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftMin(min);
      setDraftMax(max);
    }
    setOpen(next);
  }

  function setMinFromInput(raw: string) {
    setDraftMin(raw);
    if (raw.trim() === "") return;
    const minVal = Number(raw);
    if (!Number.isFinite(minVal)) return;
    const maxVal = draftMax.trim() === "" ? absoluteMax : parseRangeNumber(draftMax, absoluteMax);
    if (minVal > maxVal && draftMax.trim() !== "") {
      setDraftMax(String(Math.min(minVal, absoluteMax)));
    }
  }

  function setMaxFromInput(raw: string) {
    setDraftMax(raw);
    if (raw.trim() === "") return;
    const maxVal = Number(raw);
    if (!Number.isFinite(maxVal)) return;
    const minVal = parseRangeNumber(draftMin, 0);
    if (maxVal < minVal) {
      setDraftMin(String(Math.max(0, maxVal)));
    }
  }

  function onSliderChange(values: number[]) {
    const lo = values[0] ?? 0;
    const hi = values[1] ?? absoluteMax;
    const clamped = clampRange(lo, hi, absoluteMax);
    setDraftMin(String(clamped.min));
    setDraftMax(clamped.max >= absoluteMax ? "" : String(clamped.max));
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
        className={cn(
          "w-[min(100vw-2rem,22rem)] border-forest/10 bg-ivory p-4 shadow-lift",
          priceSlider && "overflow-hidden p-0",
        )}
      >
        {priceSlider ? (
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,_rgba(201,162,77,0.18),_transparent_70%)]"
            />
            <div className="relative space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                    Filter by
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-forest">{title}</p>
                </div>
                <button
                  type="button"
                  onClick={onChangeMeta}
                  className="rounded-full border border-forest/15 bg-white/80 px-3 py-1.5 text-xs font-medium text-forest transition-colors hover:border-gold/40 hover:bg-gold/10"
                >
                  {changeLabel}
                </button>
              </div>

              <div className="rounded-2xl border border-forest/10 bg-white/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-forest/45">
                      Minimum
                    </label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={draftMin}
                      onChange={(event) => setMinFromInput(event.target.value)}
                      className="h-11 rounded-xl border-forest/10 bg-[#FBF9F5] font-medium text-forest focus-visible:border-gold focus-visible:ring-gold/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-forest/45">
                      Maximum
                    </label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Any"
                      value={draftMax}
                      onChange={(event) => setMaxFromInput(event.target.value)}
                      className="h-11 rounded-xl border-forest/10 bg-[#FBF9F5] font-medium text-forest placeholder:text-muted-foreground focus-visible:border-gold focus-visible:ring-gold/30"
                    />
                  </div>
                </div>

                <div className="mt-5 px-1">
                  <Slider
                    min={0}
                    max={absoluteMax}
                    step={step}
                    minStepsBetweenThumbs={0}
                    value={sliderValues}
                    onValueChange={onSliderChange}
                  />
                  <div className="mt-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-forest/40">
                    <span>{formatPrice(0).replace("PKR ", "")}</span>
                    <span>{formatPrice(Math.round(absoluteMax * toPkr)).replace(/^PKR\s*/, "")}+</span>
                  </div>
                </div>

                {rangeLabel ? (
                  <div className="mt-3 rounded-xl bg-forest/[0.04] px-3 py-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-forest/40">
                      Selected range
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-forest">{rangeLabel}</p>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-forest/15 bg-white"
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
                  className="h-11 rounded-xl bg-forest text-ivory shadow-[0_10px_22px_-12px_rgba(15,46,29,0.55)] hover:bg-forest-800"
                  onClick={() => {
                    onApply(draftMin, draftMax);
                    setOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                  onChange={(event) => setMinFromInput(event.target.value)}
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
                  onChange={(event) => setMaxFromInput(event.target.value)}
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
          </>
        )}
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
