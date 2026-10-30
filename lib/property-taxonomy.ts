import type { ListingPurpose, PropertyCategory } from "@/lib/types";
import {
  Building2,
  Factory,
  Fence,
  FilePenLine,
  FileText,
  Home,
  KeyRound,
  LandPlot,
  MoreHorizontal,
  Sprout,
  Store,
  DoorOpen,
  Tag,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export const LISTING_PURPOSES: {
  id: ListingPurpose;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { id: "SALE", label: "Sell", hint: "List for sale", icon: Tag },
  { id: "RENT", label: "Rent", hint: "List for rent", icon: KeyRound },
];

export const PROPERTY_CATEGORIES: {
  id: PropertyCategory;
  label: string;
  pluralLabel: string;
  icon: LucideIcon;
}[] = [
  { id: "HOME", label: "Home", pluralLabel: "Homes", icon: Home },
  { id: "PLOTS", label: "Plots", pluralLabel: "Plots", icon: LandPlot },
  { id: "COMMERCIAL", label: "Commercial", pluralLabel: "Commercial", icon: Building2 },
];

export type PropertySubtypeOption = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const PROPERTY_SUBTYPES: Record<PropertyCategory, PropertySubtypeOption[]> = {
  HOME: [
    { id: "HOUSE", label: "House", icon: Home },
    { id: "FLAT", label: "Flat", icon: Building2 },
    { id: "UPPER_PORTION", label: "Upper Portion", icon: Home },
    { id: "LOWER_PORTION", label: "Lower Portion", icon: Home },
    { id: "FARM_HOUSE", label: "Farm House", icon: Fence },
    { id: "ROOM", label: "Room", icon: DoorOpen },
    { id: "PENTHOUSE", label: "Penthouse", icon: Building2 },
  ],
  PLOTS: [
    { id: "RESIDENTIAL_PLOT", label: "Residential Plot", icon: LandPlot },
    { id: "COMMERCIAL_PLOT", label: "Commercial Plot", icon: Building2 },
    { id: "AGRICULTURAL_LAND", label: "Agricultural Land", icon: Sprout },
    { id: "INDUSTRIAL_LAND", label: "Industrial Land", icon: Factory },
    { id: "PLOT_FILE", label: "Plot File", icon: FileText },
    { id: "PLOT_FORM", label: "Plot Form", icon: FilePenLine },
  ],
  COMMERCIAL: [
    { id: "OFFICE", label: "Office", icon: Building2 },
    { id: "SHOP", label: "Shop", icon: Store },
    { id: "WAREHOUSE", label: "Warehouse", icon: Warehouse },
    { id: "FACTORY", label: "Factory", icon: Factory },
    { id: "BUILDING", label: "Building", icon: Building2 },
    { id: "OTHER", label: "Other", icon: MoreHorizontal },
  ],
};

export function defaultSubtypeFor(category: PropertyCategory): string {
  return PROPERTY_SUBTYPES[category][0]!.id;
}

export function subtypeLabel(category: PropertyCategory | undefined, subtype: string | undefined): string {
  if (!category || !subtype) return "";
  return PROPERTY_SUBTYPES[category].find((item) => item.id === subtype)?.label ?? subtype;
}

export function purposeLabel(purpose: ListingPurpose | undefined): string {
  if (purpose === "RENT") return "For rent";
  return "For sale";
}

export function categoryPluralLabel(category: PropertyCategory): string {
  return PROPERTY_CATEGORIES.find((item) => item.id === category)?.pluralLabel ?? category;
}
