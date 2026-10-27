"use client";

import { createContext, useContext } from "react";
import type { TeamMember } from "@/lib/mock-data/team";

/** Lightweight team hook — no Firebase import. Provider lives in `@/lib/team-store`. */
export type TeamMemberInput = Omit<TeamMember, "id">;

export interface TeamStoreContextValue {
  members: TeamMember[];
  isReady: boolean;
  usingFirestore: boolean;
  addMember: (input: TeamMemberInput) => Promise<TeamMember>;
  updateMember: (id: string, input: TeamMemberInput) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  reorderMembers: (orderedIds: string[]) => Promise<void>;
}

export const TeamStoreContext = createContext<TeamStoreContextValue | undefined>(undefined);

const BOOTSTRAP_TEAM: TeamStoreContextValue = {
  members: [],
  isReady: false,
  usingFirestore: false,
  addMember: async (input) => ({ id: "bootstrap", ...input }),
  updateMember: async () => undefined,
  deleteMember: async () => undefined,
  reorderMembers: async () => undefined,
};

export function useTeamStore() {
  const context = useContext(TeamStoreContext);
  return context ?? BOOTSTRAP_TEAM;
}
