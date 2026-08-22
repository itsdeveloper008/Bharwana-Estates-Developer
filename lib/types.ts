export type UserRole = "BUYER" | "HOUSE_OWNER" | "SALES_REP" | "ADMIN";

export type ListingType = "DIRECT_OWNER" | "BUSINESS";

export type PropertyStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "RESERVED"
  | "SOLD"
  | "ARCHIVED"
  | "REJECTED";

export type InquiryStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "SITE_VISIT"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export type InquiryChannel = "PLATFORM_ASSISTED" | "DIRECT_TO_SELLER";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Developer {
  id: string;
  companyName: string;
  contactPerson: string;
  commissionRate: number;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  status: PropertyStatus;
  price: number;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  images: string[];
  ownerUserId?: string;
  developerId?: string;
  createdAt: string;
  /** Set when status is REJECTED */
  rejectionReason?: string;
}

export interface Inquiry {
  id: string;
  propertyId: string;
  buyerId: string;
  assignedSalesId?: string;
  status: InquiryStatus;
  channel: InquiryChannel;
  notes: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  inquiryId: string;
  propertyId: string;
  finalPrice: number;
  commissionAmount: number;
  closedAt: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PropertyFilters {
  query?: string;
  city?: string;
  listingType?: ListingType | "ALL";
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  bounds?: MapBounds;
}

export const CITIES = [
  "Lahore",
  "Islamabad",
  "Karachi",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
] as const;

export type City = (typeof CITIES)[number];
