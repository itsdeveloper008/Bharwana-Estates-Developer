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
  addSavedProperty,
  removeSavedProperty,
  subscribeUser,
} from "@/lib/firestore/users";
import { useMockAuth } from "@/lib/mock-auth";

const SAVED_KEY = "bharwana_saved_properties";

function readAllSaved(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllSaved(map: Record<string, string[]>) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(map));
}

interface FavoritesContextValue {
  ids: string[];
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string) => boolean;
  save: (propertyId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useMockAuth();
  const [ids, setIds] = useState<string[]>([]);
  const usingFirestore = isFirebaseConfigured();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setIds([]);
      return;
    }

    if (!usingFirestore) {
      const map = readAllSaved();
      setIds(map[user.id] ?? []);
      return;
    }

    const unsub = subscribeUser(
      user.id,
      (profile) => {
        setIds(profile?.savedPropertyIds ?? []);
      },
      (error) => {
        console.error("Saved properties subscription failed", error);
        const map = readAllSaved();
        setIds(map[user.id] ?? []);
      },
    );

    return () => unsub?.();
  }, [user, isReady, usingFirestore]);

  const persistLocal = useCallback(
    (nextIds: string[]) => {
      if (!user) return;
      const map = readAllSaved();
      map[user.id] = nextIds;
      writeAllSaved(map);
      setIds(nextIds);
    },
    [user],
  );

  const isSaved = useCallback((propertyId: string) => ids.includes(propertyId), [ids]);

  const save = useCallback(
    (propertyId: string) => {
      if (!user || ids.includes(propertyId)) return;
      const next = [...ids, propertyId];
      setIds(next);
      if (usingFirestore) {
        void addSavedProperty(user.id, propertyId).catch((error) => {
          console.error(error);
          setIds(ids);
          toast.error("Could not save this residence.");
        });
      } else {
        persistLocal(next);
      }
    },
    [ids, persistLocal, user, usingFirestore],
  );

  const toggle = useCallback(
    (propertyId: string) => {
      if (!user) return false;
      const removing = ids.includes(propertyId);
      const next = removing ? ids.filter((id) => id !== propertyId) : [...ids, propertyId];
      setIds(next);

      if (usingFirestore) {
        const sync = removing
          ? removeSavedProperty(user.id, propertyId)
          : addSavedProperty(user.id, propertyId);
        void sync.catch((error) => {
          console.error(error);
          setIds(ids);
          toast.error(removing ? "Could not remove saved residence." : "Could not save this residence.");
        });
      } else {
        persistLocal(next);
      }
      return true;
    },
    [ids, persistLocal, user, usingFirestore],
  );

  const value = useMemo(() => ({ ids, isSaved, toggle, save }), [ids, isSaved, toggle, save]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
