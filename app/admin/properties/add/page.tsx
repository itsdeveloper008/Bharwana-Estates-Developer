"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { useMockStore } from "@/lib/mock-store";

function AdminPropertyFormInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { properties } = useMockStore();
  const editing = editId ? properties.find((item) => item.id === editId) : undefined;
  const isLiveEdit =
    editing?.status === "PUBLISHED" || editing?.status === "RESERVED";

  return (
    <div>
      <p className="type-eyebrow">{editId ? "Edit listing" : "New listing"}</p>
      <h1 className="font-serif text-3xl">{editId ? "Edit Property" : "Add Property"}</h1>
      <p className="type-subheading mb-8 mt-2 max-w-2xl">
        {isLiveEdit
          ? "Update this live listing. Changes publish immediately and stay on the marketplace."
          : editId
            ? "Update listing details, then publish immediately or save for review."
            : "Create a listing on behalf of an owner or dealer. Assign ownership on the Details step, then publish immediately or save for review. Writes to the same inventory used across the site."}
      </p>
      <PropertyForm mode="admin" editId={editId} />
    </div>
  );
}

export default function AdminAddPropertyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading form…</p>}>
      <AdminPropertyFormInner />
    </Suspense>
  );
}
