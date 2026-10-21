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

function DealerAddPropertyInner() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { properties } = useMockStore();
  const editing = editId ? properties.find((item) => item.id === editId) : undefined;
  const isLiveEdit =
    editing?.status === "PUBLISHED" || editing?.status === "RESERVED";
  const isEdit = Boolean(editId);

  return (
    <div>
      <p className="type-eyebrow">
        {isLiveEdit ? "Edit listing" : isEdit ? "Resubmit" : "Dealer inventory"}
      </p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">
        {isLiveEdit
          ? "Update your live listing"
          : isEdit
            ? "Edit & resubmit your listing"
            : "Place a residence on the floor"}
      </h2>
      {!isEdit ? (
        <p className="type-subheading mt-3 max-w-2xl">
          Listings submit as Dealer Verified inventory and follow Bharwana&apos;s commission structure.
        </p>
      ) : isLiveEdit ? (
        <p className="type-subheading mt-3 max-w-2xl">
          Changes save immediately and stay published on the marketplace.
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
    <Suspense fallback={<PageBootSpinner label="Loading listing form…" className="min-h-[50vh]" />}>
      <DealerAddPropertyInner />
    </Suspense>
  );
}
