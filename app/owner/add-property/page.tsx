"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageBootSpinner } from "@/components/layout/page-boot-spinner";
import { useMockStore } from "@/lib/mock-store-context";

const PropertyForm = dynamic(
  () => import("@/components/properties/property-form").then((mod) => mod.PropertyForm),
  {
    ssr: false,
    loading: () => <PageBootSpinner label="Loading listing form…" className="min-h-[40vh]" />,
  },
);

function OwnerAddPropertyInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { properties } = useMockStore();
  const editing = editId ? properties.find((item) => item.id === editId) : undefined;
  const isLiveEdit =
    editing?.status === "PUBLISHED" || editing?.status === "RESERVED";
  const isEdit = Boolean(editId);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="type-eyebrow">
        {isLiveEdit ? "Edit listing" : isEdit ? "Resubmit" : "New listing"}
      </p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">
        {isLiveEdit
          ? "Update your live listing"
          : isEdit
            ? "Edit & resubmit your listing"
            : "Place a residence on the floor"}
      </h2>
      {isLiveEdit ? (
        <p className="type-subheading mt-3 max-w-2xl">
          Changes save immediately and stay published on the marketplace.
        </p>
      ) : null}
      <div className="mt-10">
        <PropertyForm editId={editId} />
      </div>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense fallback={<PageBootSpinner label="Loading listing form…" className="min-h-[50vh]" />}>
      <OwnerAddPropertyInner />
    </Suspense>
  );
}
