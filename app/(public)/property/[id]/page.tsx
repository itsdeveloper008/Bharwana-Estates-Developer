import { PropertyDetailGate } from "./property-detail-gate";
import { getPropertyById } from "@/lib/api/properties";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id);
  return { title: property?.title ?? "Residence" };
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id);
  return <PropertyDetailGate id={params.id} initial={property} />;
}
