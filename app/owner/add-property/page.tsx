"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";

function OwnerAddPropertyInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="type-eyebrow">{isEdit ? "Resubmit" : "New listing"}</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">
        {isEdit ? "Edit & resubmit your listing" : "Place a residence on the floor"}
      </h2>
      <div className="mt-10">
        <PropertyForm editId={editId} />
      </div>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form…</p>}>
      <OwnerAddPropertyInner />
    </Suspense>
  );
}
