"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDeleteButton({
  label,
  description,
  onConfirm,
  disabled,
  disabledHint,
}: {
  label: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  disabledHint?: string;
}) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={disabledHint}
        className="text-muted-foreground"
        aria-label="Delete unavailable"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
          )}
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-ivory">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-2xl">Delete “{label}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onConfirm()}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
