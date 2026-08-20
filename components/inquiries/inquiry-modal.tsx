"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { inquiryFormSchema, type InquiryFormValues } from "@/lib/schemas";
import type { Property } from "@/lib/types";
import { delay } from "@/lib/utils";

export function InquiryModal({
  property,
  open,
  onOpenChange,
}: {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useMockAuth();
  const { addInquiry } = useMockStore();
  const isOwnerListing = property.listingType === "DIRECT_OWNER";

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      message: isOwnerListing
        ? `I would like to speak with the owner about ${property.title}.`
        : `Please arrange a site visit for ${property.title}.`,
      visitDate: "",
    },
  });

  async function onSubmit(values: InquiryFormValues) {
    // TODO: replace with real backend call
    await delay(700);
    addInquiry({
      id: `inq-${Date.now()}`,
      propertyId: property.id,
      buyerId: user?.id ?? "u-buyer-1",
      status: "NEW",
      notes: `${values.fullName} · ${values.phone}${values.visitDate ? ` · visit ${values.visitDate}` : ""} — ${values.message}`,
      createdAt: new Date().toISOString(),
    });
    toast.success(isOwnerListing ? "Message sent to the owner." : "Visit request received.");
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-ivory sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {isOwnerListing ? "Contact owner" : "Inquire / book a visit"}
          </DialogTitle>
          <DialogDescription>{property.title}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!isOwnerListing && (
              <FormField
                control={form.control}
                name="visitDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred visit</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea rows={4} className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending…" : "Submit"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
