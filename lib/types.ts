export type UserRole = "BUYER" | "HOUSE_OWNER" | "DEALER" | "SALES_REP" | "ADMIN";

export type ListingType = "DIRECT_OWNER" | "BUSINESS";

/** Sell vs rent — kept separate in listing intent */
export type ListingPurpose = "SALE" | "RENT";

/** Top-level property class */
export type PropertyCategory = "HOME" | "PLOTS" | "COMMERCIAL";

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

export type DeveloperStatus = "PENDING_REVIEW" | "ACTIVE";

export type DeveloperOrigin = "ADMIN" | "SELF_REGISTERED";

export type CommissionStatus = "PENDING" | "INVOICED" | "PAID";

/** Default commission applied when a dealer self-registers (Admin may adjust later). */
export const DEFAULT_DEALER_COMMISSION_RATE = 0.025;

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
  /** Fraction, e.g. 0.025 = 2.5% — used for future closes only */
  commissionRate: number;
  /** Links a self-registered Dealer user to this developer profile */
  dealerUserId?: string;
  status: DeveloperStatus;
  origin: DeveloperOrigin;
  /** Optional CNIC / business registration number */
  registrationNumber?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  /** Sell or rent — defaults to SALE for older seed listings */
  purpose?: ListingPurpose;
  /** Home / Plots / Commercial */
  category?: PropertyCategory;
  /** Sub-type within the category (e.g. House, Residential Plot, Office) */
  subtype?: string;
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
  developerId: string;
  finalPrice: number;
  /** Rate snapshotted at close — not recalculated if dealer rate changes later */
  commissionRate: number;
  commissionAmount: number;
  commissionStatus: CommissionStatus;
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
  purpose?: ListingPurpose;
  category?: PropertyCategory;
  subtype?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  maxArea?: number;
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
