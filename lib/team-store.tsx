"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  deleteTeamMember as deleteTeamMemberDoc,
  reorderTeamMembers as reorderTeamMembersDoc,
  resolveTeamPhotoUrl,
  subscribeTeamMembers,
  upsertTeamMember,
} from "@/lib/firestore/team";
import { teamMembers as localSeedTeam, type TeamMember } from "@/lib/mock-data/team";

const STORAGE_KEY = "bharwana_team_members_v6";

export type TeamMemberInput = Omit<TeamMember, "id">;

interface TeamStoreContextValue {
  members: TeamMember[];
  isReady: boolean;
  usingFirestore: boolean;
  addMember: (input: TeamMemberInput) => Promise<TeamMember>;
  updateMember: (id: string, input: TeamMemberInput) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  reorderMembers: (orderedIds: string[]) => Promise<void>;
}

const TeamStoreContext = createContext<TeamStoreContextValue | undefined>(undefined);

function persistLocal(members: TeamMember[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // ignore
  }
}

export function TeamStoreProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<TeamMember[]>(localSeedTeam);
  const [isReady, setIsReady] = useState(true);
  const [usingFirestore, setUsingFirestore] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as TeamMember[];
          if (Array.isArray(parsed) && parsed.length > 0) setMembers(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setUsingFirestore(false);
      setIsReady(true);
      return;
    }

    setUsingFirestore(true);
    const unsub = subscribeTeamMembers(
      (next) => {
        if (next.length === 0) {
          // Keep seed visible until admin seeds Firestore
          setMembers(localSeedTeam);
        } else {
          setMembers(next);
        }
        setIsReady(true);
      },
      (error) => {
        console.error("Firestore team subscription failed", error);
        toast.error("Could not load team from Firestore. Using local seed.");
        setUsingFirestore(false);
        setMembers(localSeedTeam);
        setIsReady(true);
      },
    );

    return () => unsub?.();
  }, []);

  const addMember = useCallback(async (input: TeamMemberInput) => {
    const id = crypto.randomUUID();
    const photoUrl = await resolveTeamPhotoUrl(id, input.photoUrl).catch(() => input.photoUrl);
    const next: TeamMember = { id, ...input, photoUrl };

    if (isFirebaseConfigured()) {
      await upsertTeamMember(id, { ...input, photoUrl }, members.length);
      return next;
    }

    setMembers((current) => {
      const updated = [...current, next];
      persistLocal(updated);
      return updated;
    });
    return next;
  }, [members.length]);

  const updateMember = useCallback(async (id: string, input: TeamMemberInput) => {
    const photoUrl = await resolveTeamPhotoUrl(id, input.photoUrl).catch(() => input.photoUrl);
    const sortOrder = Math.max(
      0,
      members.findIndex((member) => member.id === id),
    );

    if (isFirebaseConfigured()) {
      await upsertTeamMember(id, { ...input, photoUrl }, sortOrder);
      return;
    }

    setMembers((current) => {
      const updated = current.map((member) =>
        member.id === id ? { ...member, ...input, photoUrl, id } : member,
      );
      persistLocal(updated);
      return updated;
    });
  }, [members]);

  const deleteMember = useCallback(async (id: string) => {
    if (isFirebaseConfigured()) {
      await deleteTeamMemberDoc(id);
      return;
    }
    setMembers((current) => {
      const updated = current.filter((member) => member.id !== id);
      persistLocal(updated);
      return updated;
    });
  }, []);

  const reorderMembers = useCallback(async (orderedIds: string[]) => {
    if (isFirebaseConfigured()) {
      await reorderTeamMembersDoc(orderedIds);
      return;
    }
    setMembers((current) => {
      const map = new Map(current.map((member) => [member.id, member]));
      const updated = orderedIds
        .map((id) => map.get(id))
        .filter((member): member is TeamMember => Boolean(member));
      current.forEach((member) => {
        if (!orderedIds.includes(member.id)) updated.push(member);
      });
      persistLocal(updated);
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({
      members,
      isReady,
      usingFirestore,
      addMember,
      updateMember,
      deleteMember,
      reorderMembers,
    }),
    [
      members,
      isReady,
      usingFirestore,
      addMember,
      updateMember,
      deleteMember,
      reorderMembers,
    ],
  );

  return <TeamStoreContext.Provider value={value}>{children}</TeamStoreContext.Provider>;
}

export function useTeamStore() {
  const context = useContext(TeamStoreContext);
  if (!context) {
    throw new Error("useTeamStore must be used within TeamStoreProvider");
  }
  return context;
}
