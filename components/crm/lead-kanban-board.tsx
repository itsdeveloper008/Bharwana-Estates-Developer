"use client";

import { DndContext, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn, LeadCard } from "@/components/crm/lead-card";
import { Button } from "@/components/ui/button";
import { useMockStore } from "@/lib/mock-store";
import type { InquiryStatus } from "@/lib/types";

const COLUMNS: { id: InquiryStatus; title: string; accept: InquiryStatus[] }[] = [
  { id: "NEW", title: "New", accept: ["NEW", "ASSIGNED"] },
  { id: "CONTACTED", title: "Contacted", accept: ["CONTACTED"] },
  { id: "SITE_VISIT", title: "Site visit", accept: ["SITE_VISIT"] },
  { id: "NEGOTIATION", title: "Negotiation", accept: ["NEGOTIATION"] },
  { id: "CLOSED_WON", title: "Won", accept: ["CLOSED_WON"] },
  { id: "CLOSED_LOST", title: "Lost", accept: ["CLOSED_LOST"] },
];

function columnFor(status: InquiryStatus) {
  return COLUMNS.find((column) => column.accept.includes(status))?.id ?? "NEW";
}

export function LeadKanbanBoard() {
  const { inquiries, properties, users, updateInquiryStatus } = useMockStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (!overId) return;
    const column = COLUMNS.find((item) => item.id === overId);
    if (!column) return;
    void updateInquiryStatus(String(event.active.id), column.id);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const cards = inquiries.filter((inquiry) => columnFor(inquiry.status) === column.id);
          return (
            <KanbanColumn key={column.id} id={column.id} title={column.title} count={cards.length}>
              {cards.map((inquiry) => {
                const property = properties.find((item) => item.id === inquiry.propertyId);
                const buyer = users.find((item) => item.id === inquiry.buyerId);
                return (
                  <div key={inquiry.id} className="space-y-2">
                    <LeadCard inquiry={inquiry} property={property} buyer={buyer} />
                    <div className="flex gap-1">
                      {COLUMNS.filter((item) => item.id !== column.id).slice(0, 2).map((item) => (
                        <Button
                          key={item.id}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] uppercase tracking-[0.12em]"
                          onClick={() => void updateInquiryStatus(inquiry.id, item.id)}
                        >
                          {item.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
