"use client";

import { PropertyForm } from "@/components/properties/property-form";
import { useMockAuth } from "@/lib/mock-auth";

export default function AddPropertyPage() {
  const { user } = useMockAuth();

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">New listing</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Place a residence on the floor</h2>
      <p className="mt-2 mb-10 max-w-2xl text-sm text-muted-foreground">
        {user?.fullName ? (
          <>
            Listing as <span className="text-forest">{user.fullName}</span>. Photographs stay on this device until
            storage is connected; publish writes to the shared review queue.
          </>
        ) : (
          "Fill every step freely. Sign in only when you publish. Your details stay on this page."
        )}
      </p>
      <PropertyForm />
    </div>
  );
}
