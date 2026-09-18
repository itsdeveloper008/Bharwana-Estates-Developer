"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortablePhotoItem = {
  id: string;
  src: string;
};

function SortablePhotoThumb({
  item,
  index,
  onPreview,
  onRemove,
}: {
  item: SortablePhotoItem;
  index: number;
  onPreview: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (isDragging) suppressClickRef.current = true;
  }, [isDragging]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group/thumb relative aspect-[4/3] overflow-hidden rounded-xl bg-cream shadow-[0_10px_24px_-14px_rgba(15,46,29,0.35)]",
        isDragging && "z-20 opacity-40 ring-2 ring-gold/50",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Drag to reorder photo ${index + 1}. Click to preview.`}
        {...attributes}
        {...listeners}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onPreview(index);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.src} alt="" className="pointer-events-none h-full w-full object-cover" />
      </button>

      {index === 0 ? (
        <span className="pointer-events-none absolute left-1.5 top-1.5 z-[1] rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-forest shadow-sm">
          Cover
        </span>
      ) : null}

      <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-[1] flex h-7 w-7 items-center justify-center rounded-lg bg-forest/70 text-ivory opacity-100 shadow-sm sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover/thumb:opacity-100">
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      <button
        type="button"
        className="absolute right-1.5 top-1.5 z-[1] rounded-full bg-forest/80 p-1 text-ivory opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover/thumb:opacity-100"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(index);
        }}
        aria-label="Remove photo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SortablePropertyPhotos({
  items,
  onReorder,
  onPreview,
  onRemove,
}: {
  items: SortablePhotoItem[];
  onReorder: (orderedIds: string[]) => void;
  onPreview: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const activeItem = useMemo(
    () => (activeId ? items.find((item) => item.id === activeId) : undefined),
    [activeId, items],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items.map((item) => item.id), oldIndex, newIndex));
  }

  if (items.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <SortablePhotoThumb
              key={item.id}
              item={item}
              index={index}
              onPreview={onPreview}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="relative aspect-[4/3] w-[min(42vw,220px)] overflow-hidden rounded-xl shadow-[0_18px_40px_-12px_rgba(15,46,29,0.55)] ring-2 ring-gold/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeItem.src} alt="" className="h-full w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-forest shadow-sm">
              Moving
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function reorderByIds<T>(items: T[], ids: string[], orderedIds: string[]): T[] {
  const map = new Map(ids.map((id, index) => [id, items[index]]));
  return orderedIds.map((id) => map.get(id)!).filter((item) => item !== undefined);
}
