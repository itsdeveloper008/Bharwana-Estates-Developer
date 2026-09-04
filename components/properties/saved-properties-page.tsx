"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites-context";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";

export function SavedPropertiesPage() {
  const { user, isReady } = useMockAuth();
  const { ids } = useFavorites();
  const { properties } = useMockStore();

  const saved = useMemo(
    () => properties.filter((property) => ids.includes(property.id)),
    [properties, ids],
  );

  if (!isReady) {
    return <div className="px-6 py-20 text-sm text-muted-foreground">Loading your saved residences…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="type-eyebrow">Saved</p>
        <h1 className="mt-3 font-serif text-4xl">Saved Residences</h1>
        <p className="type-subheading">
          Sign in to keep a private shortlist of homes you want to revisit.
        </p>
        <Button asChild className="mt-8 rounded-full">
          <Link href="/login?returnTo=%2Fsaved">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="type-eyebrow">Your list</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Saved Residences</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {saved.length} {saved.length === 1 ? "residence" : "residences"} saved for later.
        </p>
      </div>

      {saved.length > 0 ? (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="border border-forest/10 bg-cream/40 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-forest">You haven&apos;t saved any residences yet.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Tap the heart on any listing to add it here.
          </p>
          <Button asChild className="mt-8 rounded-full">
            <Link href="/properties">Browse Residences</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
