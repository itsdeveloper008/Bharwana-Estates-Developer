"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { useMockAuth } from "@/lib/mock-auth";

function OwnerAddPropertyInner() {
  const searchParams = useSearchParams();
  const { user } = useMockAuth();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="type-eyebrow">{isEdit ? "Resubmit" : "New listing"}</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">
        {isEdit ? "Edit & resubmit your listing" : "Place a residence on the floor"}
      </h2>
      {user ? (
        <p className="mt-3 text-sm text-forest/70">You&apos;re signed in as {user.fullName}.</p>
      ) : null}
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
