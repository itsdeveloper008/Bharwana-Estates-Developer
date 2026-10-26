import { resolveListingArea, type AreaUnitId } from "@/lib/area-units";
import type { CommissionStatus, InquiryStatus, ListingType, PropertyStatus } from "./types";

/** Pakistani lakh/crore grouping: 65000000 → "6,50,00,000". */
export function formatPkrNumber(amount: number): string {
  return Math.trunc(amount).toLocaleString("en-IN");
}

export function formatPrice(amount: number) {
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    const value = Number.isInteger(crore) ? crore.toFixed(0) : crore.toFixed(2);
    return `PKR ${value.replace(/\.00$/, "")} Cr`;
  }
  if (amount >= 100_000) {
    const lakh = amount / 100_000;
    const value = Number.isInteger(lakh) ? lakh.toFixed(0) : lakh.toFixed(1);
    return `PKR ${value.replace(/\.0$/, "")} Lakh`;
  }
  return `PKR ${formatPkrNumber(amount)}`;
}

export function formatPriceFull(amount: number) {
  return `PKR ${formatPkrNumber(amount)}`;
}

/**
 * Display area for a listing — always "X sqft (Y Marla)" from canonical sqft
 * (1 Marla = 225 sqft). Works for legacy docs and new listings in any unit.
 */
export function formatArea(
  sqft: number,
  options?: { areaValue?: number; areaUnit?: AreaUnitId | string },
) {
  const resolved = resolveListingArea({
    areaSqft: sqft,
    areaValue: options?.areaValue,
    areaUnit: options?.areaUnit,
  });
  const canonical = resolved.areaSqft;
  if (!Number.isFinite(canonical) || canonical <= 0) return "—";

  const marla = canonical / 225;
  const marlaLabel =
    Number.isInteger(marla) || Math.abs(marla - Math.round(marla)) < 0.05
      ? marla.toFixed(0)
      : marla.toFixed(1).replace(/\.0$/, "");
  return `${canonical.toLocaleString("en-PK")} sqft (${marlaLabel} Marla)`;
}

export function listingBadge(type: ListingType) {
  return type === "DIRECT_OWNER" ? "Direct from Owner" : "Dealer Verified";
}

export function statusLabel(status: PropertyStatus) {
  const labels: Partial<Record<PropertyStatus, string>> = {
    PENDING_APPROVAL: "Pending Review",
    REJECTED: "Rejected",
  };
  if (labels[status]) return labels[status]!;
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inquiryChannelLabel(channel: "PLATFORM_ASSISTED" | "DIRECT_TO_SELLER") {
  return channel === "PLATFORM_ASSISTED" ? "Platform Assisted" : "Direct Contact";
}

export function inquiryStatusLabel(status: InquiryStatus) {
  const labels: Record<InquiryStatus, string> = {
    NEW: "New",
    ASSIGNED: "Assigned",
    CONTACTED: "Contacted",
    SITE_VISIT: "Site Visit",
    NEGOTIATION: "Negotiation",
    CLOSED_WON: "Won",
    CLOSED_LOST: "Lost",
  };
  return labels[status];
}

export function commissionStatusLabel(status: CommissionStatus) {
  const labels: Record<CommissionStatus, string> = {
    PENDING: "Pending",
    INVOICED: "Invoiced",
    PAID: "Paid",
  };
  return labels[status];
}

export function formatCommissionRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatDate(iso: string) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
