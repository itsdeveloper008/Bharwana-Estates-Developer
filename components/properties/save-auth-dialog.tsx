"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function buildSaveReturnTo(propertyId: string, pathname: string) {
  if (pathname.startsWith("/property/")) {
    return `${pathname}?intent=save`;
  }
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}intent=save&propertyId=${encodeURIComponent(propertyId)}`;
}

export function SaveAuthDialog({
  propertyId,
  open,
  onOpenChange,
}: {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const returnTo = buildSaveReturnTo(propertyId, pathname);
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-ivory sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Sign in to save</DialogTitle>
          <DialogDescription>
            Sign in to save residences to your list and return to them anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button className="w-full rounded-full" asChild>
            <Link href={loginHref}>Sign in</Link>
          </Button>
          <Button variant="outline" className="w-full rounded-full" asChild>
            <Link href={registerHref}>Create an account</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
