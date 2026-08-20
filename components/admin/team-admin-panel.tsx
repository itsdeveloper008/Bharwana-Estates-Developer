"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { TeamMemberFormDialog } from "@/components/admin/team-member-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamMember } from "@/lib/mock-data/team";
import { useTeamStore, type TeamMemberInput } from "@/lib/team-store";

function SortableRow({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "bg-cream/80 opacity-80" : undefined}
    >
      <TableCell className="w-10">
        <button
          type="button"
          className="cursor-grab text-forest/40 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.photoUrl}
            alt=""
            className="h-10 w-10 object-cover"
          />
          <span className="font-medium text-forest">{member.fullName}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{member.role}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{member.email ?? "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TeamAdminPanel() {
  const { members, addMember, updateMember, deleteMember, reorderMembers, usingFirestore } =
    useTeamStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(member: TeamMember) {
    setEditing(member);
    setFormOpen(true);
  }

  function handleSave(input: TeamMemberInput) {
    void (async () => {
      try {
        if (editing) {
          await updateMember(editing.id, input);
          toast.success("Team member updated.");
        } else {
          await addMember(input);
          toast.success("Team member added.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Could not save team member.");
      }
    })();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = members.findIndex((member) => member.id === active.id);
    const newIndex = members.findIndex((member) => member.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(members, oldIndex, newIndex);
    void reorderMembers(reordered.map((member) => member.id)).catch(() => {
      toast.error("Could not reorder team.");
    });
  }

  const deletingMember = members.find((member) => member.id === deletingId);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">People</p>
          <h1 className="font-serif text-3xl">Team</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Manage who appears on the public About page. Drag rows to set display order.
            {usingFirestore ? " Synced with Firestore." : " Local mode (Firebase env not set)."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Team Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center border border-dashed border-forest/20 bg-cream/30 px-6 py-20 text-center">
          <UsersRound className="h-10 w-10 text-gold" />
          <h2 className="mt-4 font-serif text-2xl">No team members yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first colleague so the About page has faces to introduce.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            Add your first team member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-forest/10">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  {members.map((member) => (
                    <SortableRow
                      key={member.id}
                      member={member}
                      onEdit={() => openEdit(member)}
                      onDelete={() => setDeletingId(member.id)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}

      <TeamMemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        onSave={handleSave}
      />

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-ivory">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMember
                ? `${deletingMember.fullName} will disappear from Admin and the public About page.`
                : "This member will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deletingId) return;
                void deleteMember(deletingId)
                  .then(() => {
                    toast.success("Team member removed.");
                    setDeletingId(null);
                  })
                  .catch(() => toast.error("Could not delete team member."));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
