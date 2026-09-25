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
import { truncateText } from "@/lib/truncate";
import { cn } from "@/lib/utils";

const LABEL_PREVIEW = 72;

export function ConfirmDeleteButton({
  label,
  description,
  onConfirm,
  disabled,
  disabledHint,
  variant = "icon",
  linkText = "Delete listing entirely",
}: {
  label: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  disabledHint?: string;
  variant?: "icon" | "link";
  linkText?: string;
}) {
  const safeLabel = (label || "this item").trim() || "this item";
  const previewLabel = truncateText(safeLabel, LABEL_PREVIEW);
  const showFullTitle = safeLabel.length > LABEL_PREVIEW;

  if (disabled) {
    if (variant === "link") {
      return (
        <span className="text-xs text-muted-foreground" title={disabledHint}>
          Delete unavailable
        </span>
      );
    }
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
        {variant === "link" ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline"
          >
            {linkText}
          </button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            )}
            aria-label={`Delete ${previewLabel}`}
            title={showFullTitle ? safeLabel : undefined}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="flex max-h-[min(90vh,28rem)] w-[calc(100%-2rem)] max-w-md flex-col gap-4 overflow-hidden bg-ivory sm:max-w-md">
        <AlertDialogHeader className="min-w-0 shrink space-y-2 overflow-hidden text-left">
          <AlertDialogTitle
            className="break-all font-serif text-xl leading-snug sm:text-2xl"
            title={showFullTitle ? safeLabel : undefined}
          >
            Delete “{previewLabel}”?
          </AlertDialogTitle>
          <AlertDialogDescription className="max-h-36 overflow-y-auto break-all text-left">
            {description ?? "This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="shrink-0">
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
