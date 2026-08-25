"use client";

import { PropertyForm } from "@/components/properties/property-form";

export default function AdminAddPropertyPage() {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">New listing</p>
      <h1 className="font-serif text-3xl">Add Property</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-muted-foreground">
        Create a listing on behalf of an owner or dealer. Assign ownership on the Details step, then publish
        immediately or save for review — writes to the same inventory used across the site.
      </p>
      <PropertyForm mode="admin" />
    </div>
  );
}
