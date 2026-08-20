"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface FavoritesContextValue {
  ids: string[];
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  const isSaved = useCallback((propertyId: string) => ids.includes(propertyId), [ids]);

  const toggle = useCallback((propertyId: string) => {
    setIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    );
  }, []);

  const value = useMemo(() => ({ ids, isSaved, toggle }), [ids, isSaved, toggle]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
