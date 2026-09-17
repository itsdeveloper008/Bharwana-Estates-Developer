"use client";

import { useEffect, useState } from "react";
import { PropertyDetail } from "@/components/properties/property-detail";
import { getPropertyDoc } from "@/lib/firestore/properties";
import { useMockStore } from "@/lib/mock-store";
import type { Property } from "@/lib/types";

export function PropertyDetailGate({
  id,
  initial,
}: {
  id: string;
  initial?: Property;
}) {
  const { properties, propertiesLoading } = useMockStore();
  const fromStore = properties.find((item) => item.id === id);
  const [fetched, setFetched] = useState<Property | null | undefined>(undefined);

  useEffect(() => {
    if (fromStore || initial) {
      setFetched(undefined);
      return;
    }
    if (propertiesLoading) return;

    let cancelled = false;
    setFetched(undefined);
    void getPropertyDoc(id)
      .then((doc) => {
        if (!cancelled) setFetched(doc);
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });

    return () => {
      cancelled = true;
    };
  }, [id, fromStore, initial, propertiesLoading]);

  const property = fromStore ?? initial ?? (fetched && fetched.id === id ? fetched : undefined);

  if (!property && (propertiesLoading || fetched === undefined)) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="px-6 py-24 text-center">
        <h1 className="font-serif text-4xl">This residence is not on the floor</h1>
        <p className="mt-3 text-sm text-muted-foreground">It may be a draft, or the identifier is unknown.</p>
      </div>
    );
  }

  return <PropertyDetail property={property} />;
}
