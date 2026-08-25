import type { CommissionStatus, InquiryStatus, ListingType, PropertyStatus } from "./types";

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
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function formatPriceFull(amount: number) {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

export function formatArea(sqft: number) {
  return `${sqft.toLocaleString("en-PK")} sqft`;
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
