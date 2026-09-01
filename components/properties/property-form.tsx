"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutGroup, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Bath,
  BedDouble,
  Check,
  ChevronLeft,
  CircleDollarSign,
  FileText,
  ImageIcon,
  ImagePlus,
  Layers,
  type LucideIcon,
  MapPin,
  Maximize2,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublishAuthDialog } from "@/components/auth/publish-auth-dialog";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import {
  defaultSubtypeFor,
  LISTING_PURPOSES,
  PROPERTY_CATEGORIES,
  PROPERTY_SUBTYPES,
} from "@/lib/property-taxonomy";
import { propertyFormSchema, type PropertyFormValues } from "@/lib/schemas";
import { CITIES, type PropertyCategory, type PropertyStatus, type User } from "@/lib/types";
import { CITY_COORDS } from "@/lib/map";
import { cn } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/map/map-picker").then((mod) => mod.MapPicker), { ssr: false });

const DESC_MAX = 1200;
const fieldFocus =
  "rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

type FormMode = "public" | "admin";
type AdminPublishChoice = Extract<PropertyStatus, "PUBLISHED" | "PENDING_APPROVAL">;

const WIZARD_STEPS = [
  { id: "details", label: "Details", icon: FileText },
  { id: "place", label: "Place", icon: MapPin },
  { id: "photographs", label: "Photographs", icon: ImageIcon },
] as const;

const STEP_FIELDS: Record<number, (keyof PropertyFormValues)[]> = {
  0: ["purpose", "category", "subtype", "title", "description"],
  1: ["listingType", "price", "bedrooms", "bathrooms", "areaSqft", "city", "address", "latitude", "longitude"],
};

function WizardStepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="Listing steps" className="mb-10">
      <ol className="flex items-start">
        {WIZARD_STEPS.map((step, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={step.id} className="flex flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    complete && "border-gold bg-gold text-forest",
                    active && !complete && "border-gold bg-gold/15 text-forest",
                    !active && !complete && "border-forest/15 bg-white text-forest/45",
                  )}
                >
                  {complete ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.14em]",
                    active || complete ? "text-gold-700" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mx-2 mb-6 h-px min-w-[1.5rem] flex-1",
                    index < current ? "bg-gold" : "bg-forest/10",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NumberInput({
  value,
  onChange,
  onBlur,
  name,
  icon: Icon,
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  name: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative">
      {Icon ? (
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40"
          strokeWidth={1.5}
        />
      ) : null}
      <Input
        type="number"
        className={cn(fieldFocus, Icon && "pl-9")}
        name={name}
        value={Number.isFinite(value) ? value : ""}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  );
}

function FormSection({
  id,
  title,
  icon: Icon,
  children,
  highlighted = false,
  tone = "white",
  lead = false,
  className,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  highlighted?: boolean;
  tone?: "white" | "cream";
  lead?: boolean;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-form-section={id}
      className={cn(
        "relative scroll-mt-28 overflow-hidden rounded-2xl p-7 transition-[box-shadow,ring] duration-300 sm:p-10",
        "shadow-[0_20px_55px_-30px_rgba(15,46,29,0.28)] ring-1 ring-[#EDE6D8]/70",
        "focus-within:shadow-[0_24px_60px_-28px_rgba(15,46,29,0.34)]",
        tone === "cream" ? "bg-[#FBF8F2]" : "bg-white",
        lead && "bg-gradient-to-br from-white via-[#FBF8F2] to-[#F5EFE4] p-8 sm:p-11",
        highlighted && "ring-2 ring-gold/50",
        className,
      )}
    >
      <div className="relative mb-7 sm:mb-8">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFFCF7] via-gold/20 to-gold/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_6px_16px_-10px_rgba(184,149,69,0.55)]">
            <Icon className="h-[18px] w-[18px] text-gold-700" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">{title}</p>
            <div className="mt-2.5 h-px w-28 bg-gradient-to-r from-gold/75 via-gold/35 to-transparent sm:w-36" />
          </div>
        </div>
      </div>
      <div className="relative space-y-5">{children}</div>
    </section>
  );
}

export function PropertyForm({ mode = "public" }: { mode?: FormMode }) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const { user } = useMockAuth();
  const { addProperty, getDeveloperForUser, users, developers, addUser } = useMockStore();
  const [previews, setPreviews] = useState<string[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState<AdminPublishChoice>("PENDING_APPROVAL");
  const [authOpen, setAuthOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignDeveloperId, setAssignDeveloperId] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [developerQuery, setDeveloperQuery] = useState("");
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerContact, setNewOwnerContact] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [adminPublishStatus, setAdminPublishStatus] = useState<AdminPublishChoice>("PUBLISHED");
  const [currentStep, setCurrentStep] = useState(0);

  const houseOwners = useMemo(
    () => users.filter((item) => item.role === "HOUSE_OWNER"),
    [users],
  );
  const filteredOwners = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    if (!q) return houseOwners;
    return houseOwners.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q),
    );
  }, [houseOwners, ownerQuery]);
  const filteredDevelopers = useMemo(() => {
    const q = developerQuery.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter(
      (item) =>
        item.companyName.toLowerCase().includes(q) ||
        item.contactPerson.toLowerCase().includes(q),
    );
  }, [developers, developerQuery]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      listingType: isAdmin ? "DIRECT_OWNER" : user?.role === "DEALER" ? "BUSINESS" : "DIRECT_OWNER",
      purpose: "SALE",
      category: "HOME",
      subtype: "HOUSE",
      price: 25000000,
      areaSqft: 1800,
      bedrooms: 3,
      bathrooms: 3,
      address: "",
      city: "Lahore",
      latitude: CITY_COORDS.Lahore.latitude,
      longitude: CITY_COORDS.Lahore.longitude,
    },
  });

  const listingType = form.watch("listingType") ?? "DIRECT_OWNER";
  const { isSubmitting, errors } = form.formState;

  useEffect(() => {
    if (isAdmin) return;
    if (user?.role === "DEALER") {
      form.setValue("listingType", "BUSINESS");
    }
  }, [user?.role, form, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setAssignError(null);
    if (listingType === "DIRECT_OWNER") {
      setAssignDeveloperId("");
      setDeveloperQuery("");
    } else {
      setAssignOwnerId("");
      setOwnerQuery("");
      setShowNewOwner(false);
    }
  }, [listingType, isAdmin]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function goToStep(step: number) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function stepForField(field: string): number {
    const map: Record<string, number> = {
      purpose: 0,
      category: 0,
      subtype: 0,
      title: 0,
      description: 0,
      listingType: 1,
      price: 1,
      bedrooms: 1,
      bathrooms: 1,
      areaSqft: 1,
      city: 1,
      address: 1,
      latitude: 1,
      longitude: 1,
    };
    return map[field] ?? 0;
  }

  async function validateCurrentStep(): Promise<boolean> {
    if (currentStep === 2) {
      if (previews.length < 1) {
        setPhotoError(true);
        return false;
      }
      return true;
    }
    const fields = STEP_FIELDS[currentStep];
    const valid = await form.trigger(fields);
    if (currentStep === 1 && isAdmin) {
      const issue = validateAdminAssignment(form.getValues());
      if (issue) {
        setAssignError(issue);
        return false;
      }
    }
    return valid;
  }

  async function handleContinue() {
    const ok = await validateCurrentStep();
    if (ok) goToStep(Math.min(currentStep + 1, 2));
  }

  function handleBack() {
    goToStep(Math.max(currentStep - 1, 0));
  }

  async function revealFirstIssue() {
    const valid = await form.trigger();
    if (previews.length < 1) {
      setPhotoError(true);
      goToStep(2);
      return;
    }
    if (isAdmin) {
      const issue = validateAdminAssignment(form.getValues());
      if (issue) {
        setAssignError(issue);
        goToStep(1);
        return;
      }
    }
    if (valid) {
      await publish(form.getValues());
      return;
    }
    const order = [
      "purpose",
      "category",
      "subtype",
      "title",
      "description",
      "listingType",
      "price",
      "bedrooms",
      "bathrooms",
      "areaSqft",
      "city",
      "address",
      "latitude",
      "longitude",
    ] as const;
    const first = order.find((name) => errors[name] || form.getFieldState(name).error);
    goToStep(first ? stepForField(first) : 0);
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: string[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      next.push(url);
    });
    if (next.length) {
      setPreviews((current) => [...current, ...next]);
      setPhotoError(false);
    }
  }

  function removePreview(index: number) {
    setPreviews((current) => {
      const url = current[index];
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
        objectUrlsRef.current = objectUrlsRef.current.filter((item) => item !== url);
      }
      return current.filter((_, i) => i !== index);
    });
  }

  function movePreview(index: number, direction: -1 | 1) {
    setPreviews((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function createOwnerQuick(): Promise<User | null> {
    const name = newOwnerName.trim();
    const contact = newOwnerContact.trim();
    if (name.length < 2) {
      setAssignError("Enter the owner’s name.");
      return null;
    }
    if (contact.length < 5) {
      setAssignError("Enter a phone number or email.");
      return null;
    }
    const looksEmail = contact.includes("@");
    const owner: User = {
      id: `u-owner-${Date.now()}`,
      fullName: name,
      email: looksEmail ? contact : `${name.toLowerCase().replace(/\s+/g, ".")}@owner.local`,
      phone: looksEmail ? "" : contact,
      role: "HOUSE_OWNER",
    };
    await addUser(owner);
    setAssignOwnerId(owner.id);
    setShowNewOwner(false);
    setNewOwnerName("");
    setNewOwnerContact("");
    setAssignError(null);
    toast.success(`Owner “${owner.fullName}” added.`);
    return owner;
  }

  function validateAdminAssignment(values: PropertyFormValues): string | null {
    if (values.listingType === "DIRECT_OWNER") {
      if (!assignOwnerId) return "Select or create a house owner for this listing.";
      return null;
    }
    if (!assignDeveloperId) return "Select a dealer / developer for this listing.";
    return null;
  }

  async function commitPublish(values: PropertyFormValues, ownerId: string | undefined) {
    if (previews.length < 1) {
      setPhotoError(true);
      goToStep(2);
      return;
    }
    const id = `p-${Date.now()}`;
    const images = previews;

    let listingTypeValue = values.listingType;
    let developerId: string | undefined;
    let resolvedOwnerId = ownerId;

    if (isAdmin) {
      const assignIssue = validateAdminAssignment(values);
      if (assignIssue) {
        setAssignError(assignIssue);
        goToStep(1);
        return;
      }
      if (values.listingType === "DIRECT_OWNER") {
        listingTypeValue = "DIRECT_OWNER";
        resolvedOwnerId = assignOwnerId;
        developerId = undefined;
      } else {
        listingTypeValue = "BUSINESS";
        developerId = assignDeveloperId;
        const dealer = developers.find((item) => item.id === assignDeveloperId);
        resolvedOwnerId = dealer?.dealerUserId ?? resolvedOwnerId;
      }
    } else {
      const linkedDeveloper = ownerId ? getDeveloperForUser(ownerId) : undefined;
      const isDealerListing = Boolean(linkedDeveloper) || user?.role === "DEALER";
      listingTypeValue = isDealerListing ? "BUSINESS" : values.listingType;
      developerId = isDealerListing ? linkedDeveloper?.id : undefined;
    }

    const status: PropertyStatus = isAdmin ? adminPublishStatus : "PENDING_APPROVAL";

    try {
      await addProperty({
        id,
        ...values,
        listingType: listingTypeValue,
        developerId,
        status,
        images,
        ownerUserId: resolvedOwnerId,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Listing submit failed", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit listing. Check your photos and connection, then try again.",
      );
      return;
    }
    setSubmittedId(id);
    setSubmittedTitle(values.title);
    setSubmittedStatus(status === "PUBLISHED" ? "PUBLISHED" : "PENDING_APPROVAL");
    setDone(true);
    toast.success(
      status === "PUBLISHED" ? "Property published." : "Submitted for review.",
    );
  }

  async function publish(values: PropertyFormValues) {
    if (previews.length < 1) {
      setPhotoError(true);
      goToStep(2);
      return;
    }
    if (isAdmin) {
      const assignIssue = validateAdminAssignment(values);
      if (assignIssue) {
        setAssignError(assignIssue);
        goToStep(1);
        return;
      }
      await commitPublish(values, assignOwnerId || undefined);
      return;
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }
    await commitPublish(values, user.id);
  }

  if (done) {
    const published = isAdmin && submittedStatus === "PUBLISHED";
    return (
      <div className="border border-forest/10 bg-cream/40 px-8 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800">
          {published ? "Live listing" : "Pending review"}
        </p>
        <h2 className="mt-3 font-serif text-4xl">
          {published ? "Property published" : "Submitted for verification"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          {published
            ? "This listing is live on the marketplace and map."
            : isAdmin
              ? "Saved to the verification queue for another admin to review."
              : "Your property has been submitted for review. Our team will verify the details and publish it within 24–48 hours."}
        </p>
        <div className="mx-auto mt-8 max-w-md border border-forest/10 bg-ivory px-5 py-4 text-left">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
          <p className="mt-2 font-serif text-2xl text-forest">{submittedTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ref {submittedId}</p>
          {previews[0] && (
            <div className="relative mt-4 aspect-[16/10] overflow-hidden bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[0]} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          {isAdmin ? (
            <>
              <Button onClick={() => router.push(published ? "/admin/properties" : "/admin/submissions")}>
                {published ? "All properties" : "Verification queue"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/properties")}>
                Marketplace
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => router.push("/owner")}>My listings</Button>
              <Button variant="outline" onClick={() => router.push("/properties")}>
                Marketplace
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <WizardStepIndicator current={currentStep} />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(publish, () => {
            void revealFirstIssue();
          })}
          className="flex flex-col"
        >
          {currentStep === 0 && (
            <>
          <FormSection
            id="purpose-type"
            title="Purpose & Type"
            icon={Layers}
            lead
            className="mb-10"
          >
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <LayoutGroup id="purpose-selector">
                    <div className="relative grid grid-cols-2 gap-3">
                      {LISTING_PURPOSES.map((option) => {
                        const active = field.value === option.id;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => field.onChange(option.id)}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-[colors,box-shadow] duration-300",
                              active
                                ? "border-forest text-ivory shadow-[0_14px_28px_-14px_rgba(8,43,29,0.55)]"
                                : "border-forest/12 bg-white text-forest hover:border-gold/45",
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId="purpose-active"
                                className="absolute inset-0 bg-forest"
                                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                              />
                            )}
                            <span className="relative z-10 flex items-start gap-3">
                              <Icon
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  active ? "text-gold" : "text-gold-700",
                                )}
                                strokeWidth={1.5}
                              />
                              <span>
                                <span className="block text-sm font-medium uppercase tracking-[0.14em]">
                                  {option.label}
                                </span>
                                <span
                                  className={cn(
                                    "mt-1 block text-xs",
                                    active ? "text-ivory/70" : "text-muted-foreground",
                                  )}
                                >
                                  {option.hint}
                                </span>
                              </span>
                            </span>
                            {active && (
                              <span className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gold/90 text-forest">
                                <Check className="h-3 w-3" strokeWidth={2.5} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <LayoutGroup id="category-tabs">
                    <div className="mt-1 flex gap-1 border-b border-forest/10 pb-0 pt-1">
                      {PROPERTY_CATEGORIES.map((option) => {
                        const active = field.value === option.id;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              const next = option.id as PropertyCategory;
                              field.onChange(next);
                              form.setValue("subtype", defaultSubtypeFor(next));
                              if (next === "PLOTS") {
                                form.setValue("bedrooms", 0);
                                form.setValue("bathrooms", 0);
                              } else if (form.getValues("bedrooms") === 0) {
                                form.setValue("bedrooms", 3);
                                form.setValue("bathrooms", 3);
                              }
                            }}
                            className={cn(
                              "relative inline-flex items-center gap-2 px-3 pb-3.5 pt-1.5 text-sm font-medium tracking-tight transition-colors duration-200",
                              active ? "text-forest" : "text-muted-foreground hover:text-forest",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                            {option.label}
                            {active && (
                              <motion.span
                                layoutId="category-underline"
                                className="absolute inset-x-2 -bottom-px h-0.5 bg-gold"
                                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtype"
              render={({ field }) => {
                const category = (form.watch("category") ?? "HOME") as PropertyCategory;
                const options = PROPERTY_SUBTYPES[category];
                return (
                  <FormItem>
                    <div key={category} className="flex flex-wrap gap-x-2.5 gap-y-3 overflow-visible pt-1">
                      {options.map((option) => {
                        const active = field.value === option.id;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => field.onChange(option.id)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-[colors,box-shadow] duration-200",
                              active
                                ? "border-gold bg-gold/15 text-forest shadow-[0_8px_18px_-10px_rgba(184,149,69,0.7)]"
                                : "border-forest/10 bg-white text-forest/80 hover:border-gold/55 hover:bg-gold/[0.04]",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                active ? "text-gold-700" : "text-forest/45",
                              )}
                              strokeWidth={1.5}
                            />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </FormSection>

          <FormSection
            id="listing-details"
            title="Listing Details"
            icon={FileText}
            tone="cream"
            className="mb-8"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-0.5">Title</FormLabel>
                  <FormControl>
                    <Input
                      className={fieldFocus}
                      placeholder="e.g. Canal-facing bungalow, Model Town"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-0.5">Description</FormLabel>
                  <FormControl>
                    <Textarea rows={6} maxLength={DESC_MAX} className={fieldFocus} {...field} />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <p className="text-[11px] text-muted-foreground">
                      {(field.value?.length ?? 0)}/{DESC_MAX}
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </FormSection>
            </>
          )}

          {currentStep === 1 && (
            <>
          <FormSection
            id="pricing"
            title="Pricing"
            icon={CircleDollarSign}
            className="mb-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">Origin</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isAdmin && user?.role === "DEALER"}
                    >
                      <FormControl>
                        <SelectTrigger className={fieldFocus}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DIRECT_OWNER">
                          {isAdmin ? "Direct Owner" : "Direct from owner"}
                        </SelectItem>
                        <SelectItem value="BUSINESS">
                          {isAdmin ? "Business / Dealer" : "Dealer verified"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">
                      {form.watch("purpose") === "RENT" ? "Monthly rent (PKR)" : "Price (PKR)"}
                    </FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        icon={Tag}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FormSection>

          {isAdmin && (
            <FormSection
              id="listing-owner"
              title="Listing Owner"
              icon={UserRound}
              tone="cream"
              className="mb-8"
            >
              {listingType === "DIRECT_OWNER" ? (
                <div className="space-y-3">
                  <Label className="mb-0">Assign house owner</Label>
                  <Input
                    placeholder="Search owners by name, email, or phone"
                    value={ownerQuery}
                    onChange={(event) => setOwnerQuery(event.target.value)}
                    className={fieldFocus}
                  />
                  <Select
                    value={assignOwnerId || undefined}
                    onValueChange={(value) => {
                      setAssignOwnerId(value);
                      setAssignError(null);
                      setShowNewOwner(false);
                    }}
                  >
                    <SelectTrigger className={fieldFocus}>
                      <SelectValue placeholder="Select an existing owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredOwners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.fullName}
                          {owner.phone ? ` · ${owner.phone}` : owner.email ? ` · ${owner.email}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!showNewOwner ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowNewOwner(true)}>
                      + Add new owner
                    </Button>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Full name"
                        value={newOwnerName}
                        onChange={(event) => setNewOwnerName(event.target.value)}
                        className={fieldFocus}
                      />
                      <Input
                        placeholder="Phone or email"
                        value={newOwnerContact}
                        onChange={(event) => setNewOwnerContact(event.target.value)}
                        className={fieldFocus}
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <Button type="button" size="sm" onClick={() => void createOwnerQuick()}>
                          Create owner
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewOwner(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="mb-0">Assign dealer / developer</Label>
                  <Input
                    placeholder="Search by company name"
                    value={developerQuery}
                    onChange={(event) => setDeveloperQuery(event.target.value)}
                    className={fieldFocus}
                  />
                  <Select
                    value={assignDeveloperId || undefined}
                    onValueChange={(value) => {
                      setAssignDeveloperId(value);
                      setAssignError(null);
                    }}
                  >
                    <SelectTrigger className={fieldFocus}>
                      <SelectValue placeholder="Select a dealer" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDevelopers.map((developer) => (
                        <SelectItem key={developer.id} value={developer.id}>
                          {developer.companyName}
                          {developer.status === "PENDING_REVIEW" ? " (pending)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignError ? <p className="text-sm text-destructive">{assignError}</p> : null}
                </div>
              )}
            </FormSection>
          )}

          <FormSection
            id="specs-location"
            title="Specs & Location"
            icon={MapPin}
            className="mb-11"
          >
            {form.watch("category") !== "PLOTS" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-0.5">Bedrooms</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          icon={BedDouble}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-0.5">Bathrooms</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          icon={Bath}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="areaSqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="mb-0.5">Area (sqft)</FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          icon={Maximize2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            {form.watch("category") === "PLOTS" && (
              <FormField
                control={form.control}
                name="areaSqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">Plot area (sqft)</FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        icon={Maximize2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">City</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const coords = CITY_COORDS[value];
                        if (coords) {
                          form.setValue("latitude", coords.latitude);
                          form.setValue("longitude", coords.longitude);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className={fieldFocus}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">Address</FormLabel>
                    <FormControl>
                      <Input className={fieldFocus} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <MapPicker
              latitude={form.watch("latitude")}
              longitude={form.watch("longitude")}
              onChange={(coords) => {
                form.setValue("latitude", coords.latitude);
                form.setValue("longitude", coords.longitude);
              }}
            />
          </FormSection>
            </>
          )}

          {currentStep === 2 && (
            <>
          <FormSection
            id="photographs"
            title="Photographs"
            icon={ImageIcon}
            tone="cream"
            className="mb-10"
          >
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                onFiles(event.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition-all duration-300",
                dragOver
                  ? "border-gold/70 bg-gold/10 shadow-[inset_0_0_0_1px_rgba(184,149,69,0.18)]"
                  : "border-[#D9CFB8]/90 bg-[#FFFCFA]/70 hover:border-gold/50 hover:bg-gold/[0.04]",
              )}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFFCF7] via-gold/20 to-gold/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_20px_-12px_rgba(184,149,69,0.55)]">
                <ImagePlus className="h-7 w-7 text-gold-700" strokeWidth={1.5} />
              </span>
              <p className="mt-4 text-sm text-forest">Drop photographs or click to select</p>
              <p className="mt-1 text-xs text-muted-foreground">First photo becomes the cover.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  onFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
            {photoError && previews.length < 1 && (
              <p className="text-sm text-amber-800/90">Add at least one photo to submit</p>
            )}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="group/thumb relative aspect-[4/3] overflow-hidden rounded-xl bg-cream shadow-[0_10px_24px_-14px_rgba(15,46,29,0.35)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-forest shadow-sm">
                        Cover
                      </span>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
                      <button
                        type="button"
                        className="rounded-lg bg-forest/80 p-1 text-ivory disabled:opacity-40"
                        disabled={index === 0}
                        onClick={() => movePreview(index, -1)}
                        aria-label="Move earlier"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-forest/80 p-1 text-ivory disabled:opacity-40"
                        disabled={index === previews.length - 1}
                        onClick={() => movePreview(index, 1)}
                        aria-label="Move later"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-full bg-forest/80 p-1 text-ivory opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100"
                      onClick={() => removePreview(index)}
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <div className="space-y-5 rounded-2xl bg-gradient-to-br from-[#FBF6EA] via-[#F9F3E4] to-[#F4EBDA] p-7 shadow-[0_20px_55px_-30px_rgba(15,46,29,0.28)] ring-1 ring-gold/20 sm:p-10">
            {isAdmin && (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Publish</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: "PUBLISHED" as const,
                        title: "Publish Immediately",
                        hint: "Goes live on the marketplace and map now",
                      },
                      {
                        value: "PENDING_APPROVAL" as const,
                        title: "Save as Pending Review",
                        hint: "Adds to the verification queue for another admin",
                      },
                    ] as const
                  ).map((option) => {
                    const selected = adminPublishStatus === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAdminPublishStatus(option.value)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-[colors,box-shadow] duration-300",
                          selected
                            ? "border-gold bg-white/80 shadow-[0_10px_22px_-12px_rgba(184,149,69,0.65)]"
                            : "border-[#E8E2D6]/90 bg-white/50 hover:border-gold/40",
                        )}
                      >
                        <p className="text-sm font-medium text-forest">{option.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col items-stretch gap-2 sm:items-end",
                isAdmin && "border-t border-gold/20 pt-5",
              )}
            >
              <Button type="submit" disabled={isSubmitting} className="sm:min-w-[220px]">
                {isSubmitting
                  ? isAdmin && adminPublishStatus === "PUBLISHED"
                    ? "Publishing…"
                    : "Uploading photos…"
                  : isAdmin
                    ? adminPublishStatus === "PUBLISHED"
                      ? "Publish Immediately"
                      : "Save as Pending Review"
                    : "Submit for review"}
              </Button>
            </div>
          </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-forest/10 pt-8">
            {currentStep > 0 ? (
              <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {currentStep < 2 ? (
              <Button type="button" onClick={() => void handleContinue()} className="min-w-[140px]">
                Continue
              </Button>
            ) : null}
          </div>
        </form>
      </Form>

      {!isAdmin && (
        <PublishAuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          onAuthenticated={(authed) => {
            setAuthOpen(false);
            void form.handleSubmit(
              (values) => commitPublish(values, authed.id),
              () => void revealFirstIssue(),
            )();
          }}
        />
      )}
    </div>
  );
}
