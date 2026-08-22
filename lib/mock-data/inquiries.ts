import type { Inquiry } from "@/lib/types";

export const inquiries: Inquiry[] = [
  {
    id: "inq-01",
    propertyId: "p-buch-01",
    buyerId: "u-buyer-1",
    assignedSalesId: "u-sales-1",
    status: "NEW",
    channel: "PLATFORM_ASSISTED",
    notes: "Interested in a weekend viewing at Buch Executive Villas.",
    createdAt: new Date().toISOString(),
  },
];
