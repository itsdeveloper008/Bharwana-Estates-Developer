"use client";

import { PropertyForm } from "@/components/properties/property-form";

export default function AddPropertyPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <p className="type-eyebrow">New listing</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Place a residence on the floor</h2>
      <div className="mt-10">
        <PropertyForm />
      </div>
    </div>
  );
}
