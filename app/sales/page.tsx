import { LeadKanbanBoard } from "@/components/crm/lead-kanban-board";

export const metadata = { title: "Sales pipeline" };

export default function SalesPage() {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Pipeline</p>
      <h2 className="font-serif text-3xl">Inquiries in motion</h2>
      <p className="mb-8 mt-2 max-w-xl text-sm text-muted-foreground">
        Drag a card between columns, or use the move labels. Status syncs to Firestore when configured.
      </p>
      <LeadKanbanBoard />
    </div>
  );
}
