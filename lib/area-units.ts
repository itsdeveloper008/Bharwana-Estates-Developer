/** Pakistani listing area units. Canonical compare unit is always sqft. */

export const AREA_UNITS = [
  { id: "sqft", label: "Sq. Ft.", shortLabel: "sqft", toSqft: 1 },
  /** Punjab / Lahore standard (already used across filters). */
  { id: "marla", label: "Marla", shortLabel: "Marla", toSqft: 225 },
  { id: "kanal", label: "Kanal", shortLabel: "Kanal", toSqft: 4500 },
  { id: "sq_yard", label: "Sq. Yard", shortLabel: "sq yd", toSqft: 9 },
  /** Local convention: 1 acre = 8 kanal. */
  { id: "acre", label: "Acre", shortLabel: "Acre", toSqft: 36_000 },
] as const;

export type AreaUnitId = (typeof AREA_UNITS)[number]["id"];

export const DEFAULT_AREA_UNIT: AreaUnitId = "sqft";

const UNIT_IDS = new Set<string>(AREA_UNITS.map((item) => item.id));

export function isAreaUnitId(value: unknown): value is AreaUnitId {
  return typeof value === "string" && UNIT_IDS.has(value);
}

export function areaUnitMeta(unit: AreaUnitId | string | undefined) {
  const id = isAreaUnitId(unit) ? unit : DEFAULT_AREA_UNIT;
  return AREA_UNITS.find((item) => item.id === id) ?? AREA_UNITS[0]!;
}

export function toAreaSqft(value: number, unit: AreaUnitId | string | undefined): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * areaUnitMeta(unit).toSqft);
}

export function fromAreaSqft(sqft: number, unit: AreaUnitId | string | undefined): number {
  const scale = areaUnitMeta(unit).toSqft;
  if (!Number.isFinite(sqft) || scale <= 0) return 0;
  const converted = sqft / scale;
  return Number.isInteger(converted) ? converted : Number(converted.toFixed(4));
}

/**
 * Resolve display/storage fields for a listing.
 * Legacy docs only have areaSqft → treat as sqft.
 */
export function resolveListingArea(input: {
  areaSqft?: number;
  areaValue?: number;
  areaUnit?: string;
}): { areaValue: number; areaUnit: AreaUnitId; areaSqft: number } {
  const unit = isAreaUnitId(input.areaUnit) ? input.areaUnit : DEFAULT_AREA_UNIT;
  const sqft = Number(input.areaSqft);
  const hasValue = input.areaValue != null && Number.isFinite(Number(input.areaValue));

  if (hasValue) {
    const areaValue = Number(input.areaValue);
    return {
      areaValue,
      areaUnit: unit,
      areaSqft: Number.isFinite(sqft) && sqft > 0 ? sqft : toAreaSqft(areaValue, unit),
    };
  }

  const safeSqft = Number.isFinite(sqft) ? sqft : 0;
  return {
    areaValue: unit === "sqft" ? safeSqft : fromAreaSqft(safeSqft, unit),
    areaUnit: unit,
    areaSqft: safeSqft,
  };
}

export function formatAreaValue(value: number, unit: AreaUnitId | string | undefined): string {
  const meta = areaUnitMeta(unit);
  const nice =
    Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.05
      ? String(Math.round(value))
      : value.toFixed(2).replace(/\.?0+$/, "");
  return `${nice} ${meta.shortLabel}`;
}
