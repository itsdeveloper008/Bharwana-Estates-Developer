import { formatArea } from "@/lib/format";
import { formatRoomCount } from "@/lib/room-count";
import type { Property } from "@/lib/types";

export function propertySpecItems(property: Property): { label: string; value: string }[] {
  const category = property.category ?? "HOME";
  const area = {
    label: "Area",
    value: formatArea(property.areaSqft, {
      areaValue: property.areaValue,
      areaUnit: property.areaUnit,
    }),
  };

  if (category === "PLOTS" || category === "COMMERCIAL") {
    return [area];
  }

  return [
    { label: "Bedrooms", value: formatRoomCount(property.bedrooms) },
    { label: "Bathrooms", value: formatRoomCount(property.bathrooms) },
    area,
  ];
}
