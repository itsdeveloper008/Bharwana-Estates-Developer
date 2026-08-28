import { formatArea } from "@/lib/format";
import type { Property } from "@/lib/types";

export function propertySpecItems(property: Property): { label: string; value: string }[] {
  const category = property.category ?? "HOME";

  if (category === "PLOTS") {
    return [{ label: "Area", value: formatArea(property.areaSqft) }];
  }

  return [
    { label: "Bedrooms", value: String(property.bedrooms) },
    { label: "Bathrooms", value: String(property.bathrooms) },
    { label: "Area", value: formatArea(property.areaSqft) },
  ];
}
