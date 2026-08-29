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

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setIds([]);
      return;
    }
    const map = readAllSaved();
    setIds(map[user.id] ?? []);
  }, [user, isReady]);

  const persist = useCallback(
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
      persist([...ids, propertyId]);
    },
    [ids, persist, user],
  );

  const toggle = useCallback(
    (propertyId: string) => {
      if (!user) return false;
      const next = ids.includes(propertyId)
        ? ids.filter((id) => id !== propertyId)
        : [...ids, propertyId];
      persist(next);
      return true;
    },
    [ids, persist, user],
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
