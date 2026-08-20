import { Suspense } from "react";
import { MapExplorer } from "@/components/map/map-explorer";

export const metadata = {
  title: "Map",
};

export default function MapPage() {
  return (
    <Suspense fallback={<div className="px-6 py-20 text-sm text-muted-foreground">Preparing the map…</div>}>
      <MapExplorer />
    </Suspense>
  );
}
