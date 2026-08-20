"use client";

import Link from "next/link";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/format";
import type { Inquiry, Property, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeadCard({
  inquiry,
  property,
  buyer,
}: {
  inquiry: Inquiry;
  property?: Property;
  buyer?: User;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: inquiry.id,
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab border border-forest/10 bg-ivory p-3 active:cursor-grabbing",
        isDragging && "opacity-70 shadow-lift",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-gold-700">{inquiry.id}</p>
      <Link href={property ? `/property/${property.id}` : "#"} className="mt-1 block text-sm font-medium text-forest">
        {property?.title ?? "Unknown property"}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{buyer?.fullName ?? "Buyer"}</p>
      {property && <p className="mt-1 text-sm text-gold-700">{formatPrice(property.price)}</p>}
      <p className="mt-2 line-clamp-2 text-xs text-forest/70">{inquiry.notes}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {formatDate(inquiry.createdAt)}
      </p>
    </article>
  );
}

export function KanbanColumn({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      className={cn("flex min-w-[240px] flex-1 flex-col bg-cream/50 p-3", isOver && "ring-1 ring-gold")}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-forest">{title}</h3>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
