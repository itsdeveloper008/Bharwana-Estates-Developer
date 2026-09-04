"use client";

import { PropertyForm } from "@/components/properties/property-form";

export default function AdminAddPropertyPage() {
  return (
    <div>
      <p className="type-eyebrow">New listing</p>
      <h1 className="font-serif text-3xl">Add Property</h1>
      <p className="type-subheading mb-8 mt-2 max-w-2xl">
        Create a listing on behalf of an owner or dealer. Assign ownership on the Details step, then publish
        immediately or save for review. Writes to the same inventory used across the site.
      </p>
      <PropertyForm mode="admin" />
    </div>
  );
}
