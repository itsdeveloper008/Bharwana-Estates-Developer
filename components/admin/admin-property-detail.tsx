"use client";

import dynamic from "next/dynamic";
import { Bath, BedDouble, Maximize2 } from "lucide-react";
import {
  AdminDetailField,
  AdminDetailPlaceholder,
  AdminDetailSection,
} from "@/components/admin/admin-detail-modal";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { formatDate, formatPrice } from "@/lib/format";
import { purposeLabel, subtypeLabel } from "@/lib/property-taxonomy";
import { propertySpecItems } from "@/lib/property-specs";
import type { Property } from "@/lib/types";
import { displayUserEmail } from "@/lib/user-display";

const MiniMap = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MiniMap), {
  ssr: false,
});

/** Shared listing body for Submissions modal and Properties detail page. */
export function AdminPropertyDetailBody({
  property,
  submitterName,
  submitterEmail,
  submitterPhone,
}: {
  property: Property;
  submitterName: string;
  submitterEmail?: string;
  submitterPhone?: string;
}) {
  const specs = propertySpecItems(property);
  const specIcons = { Bedrooms: BedDouble, Bathrooms: Bath, Area: Maximize2 };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <PropertyGallery images={property.images} title={property.title} />
        <AdminDetailSection title="Location" className="mt-8 lg:hidden">
          <MiniMap property={property} />
        </AdminDetailSection>
      </div>

      <div className="space-y-8">
        <div>
          <p className="font-serif text-3xl text-gold-700">{formatPrice(property.price)}</p>
          <p className="mt-2 type-eyebrow">
            {purposeLabel(property.purpose)} ·{" "}
            {subtypeLabel(property.category, property.subtype) || "Type"}
          </p>
        </div>

        <AdminDetailSection title="Address">
          <p className="text-sm leading-relaxed text-forest/90">
            {property.address}, {property.city}
          </p>
        </AdminDetailSection>

        <AdminDetailSection title="Specifications">
          <div className="grid grid-cols-3 gap-3 border-y border-forest/10 py-4">
            {specs.map((spec) => {
              const Icon = specIcons[spec.label as keyof typeof specIcons] ?? Maximize2;
              return (
                <div key={spec.label}>
                  <Icon className="h-4 w-4 text-gold" />
                  <p className="mt-2 text-sm font-medium text-forest">{spec.value}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {spec.label}
                  </p>
                </div>
              );
            })}
          </div>
        </AdminDetailSection>

        <AdminDetailSection title="Description">
          <p className="text-sm leading-relaxed text-forest/80">
            {property.description || <AdminDetailPlaceholder />}
          </p>
        </AdminDetailSection>

        <AdminDetailSection title="Submission">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Submitted by">
              {displayUserEmail(submitterEmail) ? (
                <a
                  href={`mailto:${displayUserEmail(submitterEmail)!}`}
                  className="text-forest underline-offset-2 hover:underline"
                >
                  {submitterName}
                </a>
              ) : (
                submitterName || <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Phone">
              {submitterPhone ? (
                <a
                  href={`tel:${submitterPhone.replace(/\s+/g, "")}`}
                  className="text-forest underline-offset-2 hover:underline"
                >
                  {submitterPhone}
                </a>
              ) : (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="City">{property.city}</AdminDetailField>
            <AdminDetailField label="Submitted">{formatDate(property.createdAt)}</AdminDetailField>
          </div>
        </AdminDetailSection>

        {property.rejectionReason ? (
          <p className="border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Rejection reason: {property.rejectionReason}
          </p>
        ) : null}

        {property.statusHistory && property.statusHistory.length > 0 ? (
          <AdminDetailSection title="Status history">
            <ul className="space-y-2 text-sm text-forest/80">
              {[...property.statusHistory].reverse().slice(0, 5).map((entry) => (
                <li key={`${entry.at}-${entry.status}-${entry.reason ?? ""}`}>
                  <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {formatDate(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ""} · {entry.status.replaceAll("_", " ")}
                  </span>
                  {entry.reason ? <p className="mt-0.5">{entry.reason}</p> : null}
                </li>
              ))}
            </ul>
          </AdminDetailSection>
        ) : null}

        <AdminDetailSection title="Map" className="hidden lg:block">
          <MiniMap property={property} />
        </AdminDetailSection>
      </div>
    </div>
  );
}
