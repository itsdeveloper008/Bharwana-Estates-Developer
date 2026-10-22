import type { Property } from "@/lib/types";

/**
 * Strip private seller contact fields before serializing a listing into the
 * client bundle / RSC payload (crawlers and view-source must not see owner phones).
 */
export function toSeoSafeProperty(property: Property): Property {
  return {
    ...property,
    contactPhone: undefined,
  };
}
