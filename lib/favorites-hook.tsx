"use client";

/**
 * Firebase-free favorites context + hook for property cards on the critical path.
 */
import { createContext, useContext } from "react";

export interface FavoritesContextValue {
  ids: string[];
  isSaved: (propertyId: string) => boolean;
  toggle: (propertyId: string) => boolean;
  save: (propertyId: string) => void;
}

export const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export const BOOTSTRAP_FAVORITES: FavoritesContextValue = {
  ids: [],
  isSaved: () => false,
  toggle: () => false,
  save: () => undefined,
};

export function useFavorites() {
  const context = useContext(FavoritesContext);
  return context ?? BOOTSTRAP_FAVORITES;
}
