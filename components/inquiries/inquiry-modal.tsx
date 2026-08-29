"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Handshake, Mail, Phone, Scale, ShieldCheck, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { users } from "@/lib/mock-data/users";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { inquiryFormSchema, type InquiryFormValues } from "@/lib/schemas";
import type { InquiryChannel, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "auth" | "choice" | "form" | "direct" | "success";

export function InquiryModal({
  property,
  open,
  onOpenChange,
}: {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, isReady } = useMockAuth();
  const { addInquiry } = useMockStore();
  const searchParams = useSearchParams();
  const isOwnerListing = property.listingType === "DIRECT_OWNER";
  const [step, setStep] = useState<Step>("auth");
  const [channel, setChannel] = useState<InquiryChannel>("PLATFORM_ASSISTED");
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [directPending, setDirectPending] = useState(false);
  const flowKeyRef = useRef<string | null>(null);

  const seller = useMemo(
    () => users.find((item) => item.id === property.ownerUserId) ?? users.find((item) => item.role === "HOUSE_OWNER"),
    [property.ownerUserId],
  );

  const returnTo = `/property/${property.id}?intent=contact`;
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?returnTo=${encodeURIComponent(returnTo)}`;

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      message: isOwnerListing
        ? `I would like Bharwana to assist with ${property.title}.`
        : `Please arrange a site visit for ${property.title}.`,
      visitDate: "",
    },
  });

  useEffect(() => {
    if (!open) {
      flowKeyRef.current = null;
      setDirectPending(false);
      return;
    }
    if (!isReady) return;

    const flowKey = `${property.id}:${user?.id ?? "guest"}`;
    const isNewFlow = flowKeyRef.current !== flowKey;
    if (isNewFlow) {
      flowKeyRef.current = flowKey;
      if (!user) {
        setStep("auth");
      } else {
        setStep(isOwnerListing ? "choice" : "form");
        setChannel("PLATFORM_ASSISTED");
        setAcceptedRisk(false);
      }
    }

    if (!user) return;
    form.reset({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      message: isOwnerListing
        ? `I would like Bharwana to assist with ${property.title}.`
        : `Please arrange a site visit for ${property.title}.`,
      visitDate: "",
    });
  }, [open, isReady, user, isOwnerListing, property.id, property.title, form]);

  // After login return with ?intent=contact, parent opens this modal; clear intent from URL quietly.
  useEffect(() => {
    if (!open || searchParams.get("intent") !== "contact") return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("intent")) return;
    url.searchParams.delete("intent");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [open, searchParams]);

  async function logDirectContact() {
    if (!user) return;
    try {
      await addInquiry({
        propertyId: property.id,
        buyerId: user.id,
        status: "NEW",
        channel: "DIRECT_TO_SELLER",
        notes: `Direct contact revealed to ${user.fullName} · ${user.phone}. Outside Bharwana mediation.`,
      });
    } catch (error) {
      console.error("Direct contact log failed", error);
      toast.error("Could not log this contact, but you can still reach the seller.");
    }
  }

  async function proceedDirect() {
    setChannel("DIRECT_TO_SELLER");
    setDirectPending(true);
    try {
      await logDirectContact();
    } finally {
      setDirectPending(false);
      setStep("direct");
    }
  }

  async function onSubmit(values: InquiryFormValues) {
    if (!user) {
      setStep("auth");
      return;
    }
    try {
      await addInquiry({
        propertyId: property.id,
        buyerId: user.id,
        status: "NEW",
        channel,
        notes: `${values.fullName} · ${values.phone}${values.visitDate ? ` · visit ${values.visitDate}` : ""} · ${values.email} · ${values.message}`,
      });
      setStep("success");
      toast.success("Inquiry received.");
    } catch {
      toast.error("Could not send inquiry. Check your connection and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-ivory sm:max-w-lg">
        {step === "auth" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Sign in to continue</DialogTitle>
              <DialogDescription>
                Sign in to contact this owner or inquire about this residence.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <Button className="w-full" asChild>
                <Link href={loginHref}>Sign in</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={registerHref}>Create an account</Link>
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                Keep browsing
              </Button>
            </div>
          </>
        )}

        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">How would you like to proceed?</DialogTitle>
              <DialogDescription>
                Choose how you engage on {property.title}. Bharwana can steward the introduction, or you may
                contact the seller on your own.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="border border-gold/50 bg-gold/10 p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold-700">Recommended</p>
                <h3 className="mt-2 font-serif text-xl text-forest">Buy through Bharwana Estates</h3>
                <p className="mt-2 text-sm leading-relaxed text-forest/75">
                  We will manage the inquiry, coordinate the visit, and guide the conversation on your behalf.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-forest/80">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    Verified guidance from a named steward
                  </li>
                  <li className="flex items-start gap-2">
                    <Scale className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    Assisted negotiation and clear next steps
                  </li>
                  <li className="flex items-start gap-2">
                    <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    Platform support through to introduction
                  </li>
                </ul>
                <Button
                  className="mt-5 w-full"
                  onClick={() => {
                    setChannel("PLATFORM_ASSISTED");
                    setStep("form");
                  }}
                >
                  Continue with Bharwana
                </Button>
              </div>

              <div className="border border-forest/15 bg-white p-5">
                <h3 className="font-serif text-xl text-forest">Contact seller directly</h3>
                <p className="mt-2 text-sm leading-relaxed text-forest/70">
                  Deal directly with the owner. Bharwana does not mediate, verify, or take responsibility for
                  direct transactions.
                </p>
                <p className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  <span>
                    By choosing this option, you acknowledge this transaction is conducted entirely at your own
                    risk, outside Bharwana Estates Dealer&apos;s involvement.
                  </span>
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-forest">
                  <Checkbox
                    checked={acceptedRisk}
                    onCheckedChange={(value) => setAcceptedRisk(value === true)}
                    className="mt-0.5"
                  />
                  <span>I understand and accept this</span>
                </label>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={!acceptedRisk || directPending}
                  onClick={() => void proceedDirect()}
                >
                  {directPending ? "Continuing…" : "Continue directly"}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {isOwnerListing ? "Inquire with Bharwana" : "Inquire / book a visit"}
              </DialogTitle>
              <DialogDescription>{property.title}</DialogDescription>
            </DialogHeader>
            {isOwnerListing && (
              <button
                type="button"
                className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setStep("choice")}
              >
                ← Change how you proceed
              </button>
            )}
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
                  {form.formState.isSubmitting ? "Sending…" : "Submit inquiry"}
                </Button>
              </form>
            </Form>
          </>
        )}

        {step === "direct" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Seller contact</DialogTitle>
              <DialogDescription>Direct engagement, outside Bharwana&apos;s involvement.</DialogDescription>
            </DialogHeader>
            <div className="border border-forest/10 bg-white p-5">
              <p className="inline-flex items-center gap-2 border border-forest/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-forest/60">
                Direct engagement, outside Bharwana&apos;s involvement
              </p>
              <p className="mt-4 flex items-center gap-2 font-serif text-2xl text-forest">
                <UserRound className="h-5 w-5 text-gold" />
                {seller?.fullName ?? "Property owner"}
              </p>
              {seller?.phone && (
                <a
                  href={`tel:${seller.phone.replace(/\s/g, "")}`}
                  className="mt-4 flex items-center gap-2 text-sm text-forest hover:text-gold-700"
                >
                  <Phone className="h-4 w-4 text-gold" />
                  {seller.phone}
                </a>
              )}
              {seller?.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="mt-2 flex items-center gap-2 text-sm text-forest hover:text-gold-700"
                >
                  <Mail className="h-4 w-4 text-gold" />
                  {seller.email}
                </a>
              )}
            </div>
            <Button className="w-full" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Inquiry received</DialogTitle>
              <DialogDescription>
                A Bharwana representative will contact you shortly about {property.title}.
              </DialogDescription>
            </DialogHeader>
            <div
              className={cn(
                "border px-4 py-3 text-sm",
                channel === "PLATFORM_ASSISTED"
                  ? "border-gold/40 bg-gold/10 text-forest"
                  : "border-forest/15 bg-cream/50 text-forest/80",
              )}
            >
              {channel === "PLATFORM_ASSISTED"
                ? "Channel: Platform assisted. We will steward the next step."
                : "Channel: Direct. Logged for records only."}
            </div>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
