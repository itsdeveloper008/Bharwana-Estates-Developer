import type { Property, PropertyStatus, PropertyStatusHistoryEntry } from "@/lib/types";

export function appendPropertyStatusHistory(
  property: Property,
  entry: Omit<PropertyStatusHistoryEntry, "at"> & { at?: string },
): PropertyStatusHistoryEntry[] {
  const next: PropertyStatusHistoryEntry = {
    status: entry.status,
    reason: entry.reason,
    by: entry.by,
    at: entry.at ?? new Date().toISOString(),
  };
  return [...(property.statusHistory ?? []), next].slice(-12);
}

export function buildStatusChangePatch(
  property: Property,
  input: {
    status: PropertyStatus;
    reason?: string | null;
    by?: string;
    clearRejectionReason?: boolean;
  },
): Partial<Property> {
  const at = new Date().toISOString();
  const history = appendPropertyStatusHistory(property, {
    status: input.status,
    reason: input.reason ?? undefined,
    by: input.by,
    at,
  });

  const patch: Partial<Property> = {
    status: input.status,
    statusUpdatedAt: at,
    statusHistory: history,
  };

  if (input.clearRejectionReason || input.status !== "REJECTED") {
    patch.rejectionReason = undefined;
  } else if (input.reason) {
    patch.rejectionReason = input.reason;
  }

  return patch;
}
