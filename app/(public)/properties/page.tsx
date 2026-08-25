import { Suspense } from "react";
import { PropertiesExplorer } from "@/components/properties/properties-explorer";

export const metadata = {
  title: "Properties",
};

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="px-6 py-20 text-sm text-muted-foreground">Loading the collection…</div>}>
      <PropertiesExplorer />
    </Suspense>
  );
}
