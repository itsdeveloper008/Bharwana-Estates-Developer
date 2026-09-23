import type { Developer, DeveloperStatus, DeveloperStatusHistoryEntry } from "@/lib/types";

export function appendDeveloperStatusHistory(
  developer: Developer,
  entry: Omit<DeveloperStatusHistoryEntry, "at"> & { at?: string },
): DeveloperStatusHistoryEntry[] {
  const next: DeveloperStatusHistoryEntry = {
    status: entry.status,
    at: entry.at ?? new Date().toISOString(),
  };
  if (entry.reason) next.reason = entry.reason;
  if (entry.by) next.by = entry.by;
  return [...(developer.statusHistory ?? []), next].slice(-12);
}

export function buildDeveloperStatusChangePatch(
  developer: Developer,
  input: {
    status: DeveloperStatus;
    reason?: string | null;
    by?: string;
    clearRejectionReason?: boolean;
  },
): Partial<Developer> {
  const at = new Date().toISOString();
  const history = appendDeveloperStatusHistory(developer, {
    status: input.status,
    reason: input.reason ?? undefined,
    by: input.by,
    at,
  });

  const patch: Partial<Developer> = {
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
