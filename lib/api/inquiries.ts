import { delay } from "@/lib/utils";
import { inquiries } from "@/lib/mock-data/inquiries";
import type { Inquiry } from "@/lib/types";

export async function getInquiries(): Promise<Inquiry[]> {
  // TODO: replace with real backend call
  await delay(0);
  return inquiries;
}

export async function getInquiriesByBuyer(buyerId: string): Promise<Inquiry[]> {
  // TODO: replace with real backend call
  await delay(0);
  return inquiries.filter((inquiry) => inquiry.buyerId === buyerId);
}

export async function getInquiriesForOwnerProperties(
  propertyIds: string[],
): Promise<Inquiry[]> {
  // TODO: replace with real backend call
  await delay(0);
  return inquiries.filter((inquiry) => propertyIds.includes(inquiry.propertyId));
}

export async function getInquiriesBySalesRep(salesId: string): Promise<Inquiry[]> {
  // TODO: replace with real backend call
  await delay(0);
  return inquiries.filter((inquiry) => inquiry.assignedSalesId === salesId);
}
