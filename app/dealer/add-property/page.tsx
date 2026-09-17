"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";

function DealerAddPropertyInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  return (
    <div>
      <p className="type-eyebrow">{isEdit ? "Resubmit" : "Dealer inventory"}</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">
        {isEdit ? "Edit & resubmit your listing" : "Place a residence on the floor"}
      </h2>
      {!isEdit ? (
        <p className="type-subheading mt-3 max-w-2xl">
          Listings submit as Dealer Verified inventory and follow Bharwana&apos;s commission structure.
        </p>
      ) : (
        <p className="type-subheading mt-3 max-w-2xl">
          Update the details the admin flagged, then resubmit for review.
        </p>
      )}
      <div className="mt-10">
        <PropertyForm editId={editId} />
      </div>
    </div>
  );
}

export default function DealerAddPropertyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form…</p>}>
      <DealerAddPropertyInner />
    </Suspense>
  );
}
