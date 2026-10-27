import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";
import { fetchPublicProperties } from "@/lib/server/properties";
import { toSeoSafeProperty } from "@/lib/server/seo-safe-property";

// Must be a literal for Next 16 static analysis; keep in sync with SEO_REVALIDATE_SECONDS.
export const revalidate = 300;

export const metadata = {
  title: "Map",
  robots: { index: false, follow: true },
};

export default async function MapPage() {
  const initial = (await fetchPublicProperties()).map(toSeoSafeProperty);

  return (
    <>
      <h1 className="sr-only">Browse properties on the map</h1>
      <Suspense fallback={<div className="px-6 py-20 text-sm text-muted-foreground">Preparing the map…</div>}>
        <MapExplorer initialProperties={initial} />
      </Suspense>
    </>
  );
}
