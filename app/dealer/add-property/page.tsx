import { PropertyForm } from "@/components/properties/property-form";

export const metadata = { title: "Add property" };

export default function DealerAddPropertyPage() {
  return (
    <div>
      <p className="type-eyebrow">Dealer inventory</p>
      <h2 className="mt-2 font-serif text-4xl sm:text-5xl">Place a residence on the floor</h2>
      <p className="type-subheading mt-3 max-w-2xl">
        Listings submit as Dealer Verified inventory and follow Bharwana&apos;s commission structure.
      </p>
      <div className="mt-10">
        <PropertyForm />
      </div>
    </div>
  );
}
