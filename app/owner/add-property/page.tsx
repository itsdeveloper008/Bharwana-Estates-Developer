import { PropertyForm } from "@/components/properties/property-form";

export const metadata = { title: "Add property" };

export default function AddPropertyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">New listing</p>
      <h2 className="mt-2 font-serif text-4xl">Place a residence on the floor</h2>
      <p className="mt-2 mb-10 text-sm text-muted-foreground">
        Photographs stay on this device. Publish writes to mock session state only.
      </p>
      <PropertyForm />
    </div>
  );
}
