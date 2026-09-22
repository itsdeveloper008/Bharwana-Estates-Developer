"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LayoutGroup, motion } from "framer-motion";
import {
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
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { CityCombobox } from "@/components/properties/city-combobox";
import {
  SortablePropertyPhotos,
  reorderByIds,
} from "@/components/properties/sortable-property-photos";
import { FullNameInput } from "@/components/auth/full-name-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { getPropertyDoc } from "@/lib/firestore/properties";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { compressListingImage, MAX_PROPERTY_PHOTOS } from "@/lib/compress-listing-image";
import {
  AREA_UNITS,
  DEFAULT_AREA_UNIT,
  formatAreaValue,
  resolveListingArea,
  toAreaSqft,
  type AreaUnitId,
} from "@/lib/area-units";
import { formatPakistanMobileE164, toPakistanMobileLocal } from "@/lib/phone-format";
import {
  FULL_NAME_MAX_LENGTH,
  isLettersAndSpacesOnly,
  normalizePersonName,
  PERSON_NAME_LETTERS_MESSAGE,
} from "@/lib/person-name";
import { buildStatusChangePatch } from "@/lib/property-status";
import {
  defaultSubtypeFor,
  LISTING_PURPOSES,
  PROPERTY_CATEGORIES,
  PROPERTY_SUBTYPES,
} from "@/lib/property-taxonomy";
import {
  defaultHighlightKeys,
  FEATURE_TAG_MAX_LENGTH,
  isValidFeatureTag,
  MAX_FEATURE_TAGS,
  normalizeFeatureTags,
  normalizeHighlightKeys,
} from "@/lib/property-features";
import { isPersistedPropertyImageUrl } from "@/lib/property-images";
import { propertyFormSchema, type PropertyFormValues } from "@/lib/schemas";
import {
  type Property,
  type PropertyCategory,
  type PropertyHighlightKey,
  type PropertyStatus,
  type User,
} from "@/lib/types";
import { CITY_COORDS } from "@/lib/map";
import { displayUserEmail } from "@/lib/user-display";
import { isIndividualRole } from "@/lib/user-role";
import { cn } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/map/map-picker").then((mod) => mod.MapPicker), { ssr: false });

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
  1: [
    "listingType",
    "price",
    "bedrooms",
    "bathrooms",
    "areaValue",
    "areaUnit",
    "city",
    "address",
    "latitude",
    "longitude",
    "contactPhone",
    "highlightSpecs",
    "featureTags",
  ],
};

function stepFieldsForCategory(
  step: number,
  category: PropertyFormValues["category"] | undefined,
): (keyof PropertyFormValues)[] {
  const fields = STEP_FIELDS[step] ?? [];
  if (step !== 1) return fields;
  if (category === "HOME") return fields;
  return fields.filter((name) => name !== "bedrooms" && name !== "bathrooms");
}

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
  placeholder,
  max,
  integerOnly = false,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur: () => void;
  name: string;
  icon?: LucideIcon;
  placeholder?: string;
  max?: number;
  integerOnly?: boolean;
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
        type="text"
        inputMode="decimal"
        className={cn("h-10", fieldFocus, Icon && "pl-9")}
        name={name}
        placeholder={placeholder}
        value={Number.isFinite(value) ? String(value) : ""}
        onBlur={onBlur}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          // Reject scientific notation and non-numeric junk.
          if (/[eE]/.test(raw) || !/^\d+(\.\d*)?$/.test(raw)) {
            return;
          }
          const next = Number(raw);
          if (!Number.isFinite(next) || next < 0) return;
          if (integerOnly && !Number.isInteger(next)) return;
          if (typeof max === "number" && next > max) {
            onChange(max);
            return;
          }
          onChange(next);
        }}
      />
    </div>
  );
}

/** Brand section banner — dark green header with gold icon badge + lion watermark. */
function FormSection({
  id,
  title,
  icon: Icon,
  children,
  highlighted = false,
  /** Kept for call-site compatibility; body fill is always the brand cream panel. */
  tone: _tone = "white",
  lead: _lead = false,
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
  void _tone;
  void _lead;

  return (
    <section
      id={id}
      data-form-section={id}
      className={cn(
        "relative scroll-mt-28 overflow-hidden rounded-2xl bg-[#F8F7F4] transition-[box-shadow,ring] duration-300",
        "shadow-[0_18px_48px_-28px_rgba(15,81,50,0.35)] ring-1 ring-[#0F5132]/10",
        "focus-within:shadow-[0_22px_56px_-26px_rgba(15,81,50,0.4)]",
        highlighted && "ring-2 ring-[#D4AF37]/60",
        className,
      )}
    >
      {/* Full-width brand banner */}
      <header
        className="relative flex min-h-[4.25rem] items-center gap-3 overflow-hidden px-4 py-3.5 sm:min-h-[4.75rem] sm:gap-4 sm:px-6 sm:py-4"
        style={{
          background:
            "linear-gradient(105deg, #0F5132 0%, #0F5132 52%, #147A4A 78%, rgba(15,81,50,0.55) 100%)",
        }}
      >
        {/* Soft right fade so the lion sits on a lighter edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-white/10 via-transparent to-transparent"
        />

        {/* Diagonal gold accent near the emblem */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 top-[-30%] hidden h-[160%] w-px rotate-[28deg] bg-gradient-to-b from-transparent via-[#D4AF37]/70 to-transparent sm:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 top-[-40%] hidden h-[180%] w-px rotate-[28deg] bg-gradient-to-b from-transparent via-[#D4AF37]/35 to-transparent sm:block"
        />

        {/* Lion watermark — mix-blend-screen drops the black plate */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-1 top-1/2 h-20 w-20 -translate-y-1/2 opacity-[0.28] sm:-right-2 sm:h-28 sm:w-28 sm:opacity-[0.32]"
        >
          <Image
            src="/lion-bharwana.png"
            alt=""
            fill
            sizes="112px"
            className="object-contain object-right mix-blend-screen"
          />
        </div>

        {/* Gold circular icon badge */}
        <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4AF37] bg-[#0F5132]/35 shadow-[0_0_0_1px_rgba(212,175,55,0.15)] sm:h-11 sm:w-11">
          <Icon className="h-4 w-4 text-[#D4AF37] sm:h-[18px] sm:w-[18px]" strokeWidth={1.6} />
        </span>

        {/* Title + gold rule */}
        <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
          <h3 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F8F7F4] sm:text-xs sm:tracking-[0.22em]">
            {title}
          </h3>
          <div
            aria-hidden
            className="h-px min-w-[2rem] flex-1 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/45 to-transparent"
          />
        </div>
      </header>

      {/* Form fields — unchanged; cream panel body */}
      <div className="relative space-y-5 p-6 sm:p-8 md:p-10">{children}</div>
    </section>
  );
}

export function PropertyForm({
  mode = "public",
  editId = null,
}: {
  mode?: FormMode;
  /** Existing listing id - Edit & Resubmit from My Listings */
  editId?: string | null;
}) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const { user } = useMockAuth();
  const { addProperty, updateProperty, properties, propertiesLoading, getDeveloperForUser, users, developers, addUser } =
    useMockStore();
  const [fetchedEdit, setFetchedEdit] = useState<Property | null>(null);
  const [editLoadError, setEditLoadError] = useState<string | null>(null);

  // Prefer store, then a one-shot Firestore fetch so edit never falls through to "create".
  const editingProperty =
    (editId ? properties.find((item) => item.id === editId) : undefined) ??
    (fetchedEdit?.id === editId ? fetchedEdit : undefined);

  useEffect(() => {
    if (!editId) {
      setFetchedEdit(null);
      setEditLoadError(null);
      return;
    }
    if (properties.some((item) => item.id === editId)) {
      setFetchedEdit(null);
      setEditLoadError(null);
      return;
    }
    if (propertiesLoading) return;
    if (!isFirebaseConfigured()) {
      setEditLoadError("Listing not found.");
      return;
    }
    let cancelled = false;
    setEditLoadError(null);
    void getPropertyDoc(editId)
      .then((doc) => {
        if (cancelled) return;
        if (doc) setFetchedEdit(doc);
        else setEditLoadError("Listing not found.");
      })
      .catch(() => {
        if (!cancelled) setEditLoadError("Could not load listing for edit.");
      });
    return () => {
      cancelled = true;
    };
  }, [editId, properties, propertiesLoading]);

  const isLiveEdit =
    Boolean(editingProperty) &&
    (editingProperty!.status === "PUBLISHED" || editingProperty!.status === "RESERVED");
  const [previews, setPreviews] = useState<string[]>([]);
  /** Stable ids parallel to previews - used for drag-and-drop reordering. */
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  /** Parallel to previews - File for new uploads, null for existing remote URLs. */
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState<AdminPublishChoice>("PENDING_APPROVAL");
  const [dragOver, setDragOver] = useState(false);
  const [compressingPhotos, setCompressingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignDeveloperId, setAssignDeveloperId] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [developerQuery, setDeveloperQuery] = useState("");
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [newOwnerContact, setNewOwnerContact] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [adminPublishStatus, setAdminPublishStatus] = useState<AdminPublishChoice>("PUBLISHED");
  const [currentStep, setCurrentStep] = useState(0);
  const [featureTagDraft, setFeatureTagDraft] = useState("");
  const [featureTagError, setFeatureTagError] = useState<string | null>(null);
  const photoFingerprintsRef = useRef<string[]>([]);

  function fileFingerprint(file: File | Blob, nameHint = ""): string {
    const name = file instanceof File ? file.name : nameHint;
    const modified = file instanceof File ? file.lastModified : 0;
    return `${name}|${file.size}|${modified}|${file.type}`;
  }

  function tryAddFeatureTag(current: string[], draft: string): string[] | null {
    const trimmed = draft.trim();
    if (!trimmed) {
      setFeatureTagError("This field cannot be empty or contain only spaces");
      return null;
    }
    if (!isValidFeatureTag(trimmed)) {
      setFeatureTagError("Use letters (numbers-only or spaces-only tags are not allowed)");
      return null;
    }
    const next = normalizeFeatureTags([...current, trimmed]);
    if (next.length === current.length) {
      setFeatureTagError("That feature is already added");
      return null;
    }
    setFeatureTagError(null);
    return next;
  }

  const houseOwners = useMemo(
    () => users.filter((item) => isIndividualRole(item.role)),
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
      listingType:
        user?.role === "DEALER"
          ? "BUSINESS"
          : isIndividualRole(user?.role)
            ? "DIRECT_OWNER"
            : (undefined as unknown as PropertyFormValues["listingType"]),
      purpose: "SALE",
      category: "HOME",
      subtype: "HOUSE",
      price: undefined as unknown as number,
      areaValue: undefined as unknown as number,
      areaUnit: DEFAULT_AREA_UNIT,
      bedrooms: undefined as unknown as number,
      bathrooms: undefined as unknown as number,
      address: "",
      city: "",
      latitude: CITY_COORDS.Lahore.latitude,
      longitude: CITY_COORDS.Lahore.longitude,
      contactPhone: "",
      highlightSpecs: defaultHighlightKeys("HOME"),
      featureTags: [],
    },
  });

  const listingType = form.watch("listingType");
  const { isSubmitting, errors } = form.formState;

  useEffect(() => {
    if (!editingProperty) return;
    form.reset({
      title: editingProperty.title,
      description: editingProperty.description,
      listingType: editingProperty.listingType,
      purpose: editingProperty.purpose ?? "SALE",
      category: editingProperty.category ?? "HOME",
      subtype: editingProperty.subtype ?? "HOUSE",
      price: editingProperty.price,
      ...(() => {
        const resolved = resolveListingArea({
          areaSqft: editingProperty.areaSqft,
          areaValue: editingProperty.areaValue,
          areaUnit: editingProperty.areaUnit,
        });
        return {
          areaValue: resolved.areaValue || (undefined as unknown as number),
          areaUnit: resolved.areaUnit,
        };
      })(),
      bedrooms:
        (editingProperty.category ?? "HOME") === "HOME"
          ? editingProperty.bedrooms
          : (undefined as unknown as number),
      bathrooms:
        (editingProperty.category ?? "HOME") === "HOME"
          ? editingProperty.bathrooms
          : (undefined as unknown as number),
      address: editingProperty.address,
      city: editingProperty.city,
      latitude: editingProperty.latitude,
      longitude: editingProperty.longitude,
      contactPhone: toPakistanMobileLocal(editingProperty.contactPhone ?? ""),
      highlightSpecs: normalizeHighlightKeys(editingProperty.highlightSpecs, editingProperty.category),
      featureTags: normalizeFeatureTags(editingProperty.featureTags),
    });
    const safeImages = (editingProperty.images ?? [])
      .filter((url) => isPersistedPropertyImageUrl(url))
      .slice(0, MAX_PROPERTY_PHOTOS);
    setPreviews(safeImages);
    setPhotoIds(safeImages.map((_, index) => `remote-${editingProperty.id}-${index}`));
    setPhotoFiles(safeImages.map(() => null));
    photoFingerprintsRef.current = safeImages.map((url) => `remote:${url}`);
    setPhotoError(false);
  }, [editingProperty?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin || !editingProperty) return;
    if (editingProperty.listingType === "DIRECT_OWNER" && editingProperty.ownerUserId) {
      setAssignOwnerId(editingProperty.ownerUserId);
      setAssignDeveloperId("");
    } else if (editingProperty.developerId) {
      setAssignDeveloperId(editingProperty.developerId);
      setAssignOwnerId("");
    }
  }, [isAdmin, editingProperty?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin) return;
    if (user?.role === "DEALER") {
      form.setValue("listingType", "BUSINESS");
    } else if (isIndividualRole(user?.role)) {
      form.setValue("listingType", "DIRECT_OWNER");
    }
  }, [user?.role, form, isAdmin]);

  useEffect(() => {
    if (isAdmin || editingProperty) return;
    if (user?.phone && !form.getValues("contactPhone")) {
      form.setValue("contactPhone", toPakistanMobileLocal(user.phone));
    }
  }, [user?.phone, form, isAdmin, editingProperty]);

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
    if (!isAdmin) return;
    if (!assignOwnerId) return;
    const owner = users.find((item) => item.id === assignOwnerId);
    if (owner?.phone) form.setValue("contactPhone", toPakistanMobileLocal(owner.phone));
  }, [assignOwnerId, users, form, isAdmin]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function goToStep(step: number) {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToField(fieldName: string) {
    window.setTimeout(() => {
      const mapFields = fieldName === "latitude" || fieldName === "longitude" || fieldName === "city";
      const target = mapFields
        ? document.getElementById(fieldName === "city" ? "city" : "map-place") ??
          document.querySelector(`[name="${fieldName}"]`)
        : document.querySelector(`[name="${fieldName}"]`) ??
          document.getElementById(fieldName);
      if (!(target instanceof HTMLElement)) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // Only focus real controls — focusing a plain div can throw or steal clicks in some browsers.
      const focusable =
        target.matches("input, textarea, select, button, [tabindex]:not([tabindex='-1'])")
          ? target
          : target.querySelector<HTMLElement>(
              "input, textarea, select, button, [tabindex]:not([tabindex='-1'])",
            );
      if (focusable) {
        try {
          focusable.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    }, 120);
  }

  function firstInvalidStepField(step: number): keyof PropertyFormValues | undefined {
    const fields = stepFieldsForCategory(step, form.getValues("category"));
    // Prefer live formState after trigger() — the render-time `errors` proxy can be stale.
    const live = form.formState.errors;
    return fields.find((name) => Boolean(form.getFieldState(name).error || live[name]));
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
      areaValue: 1,
      areaUnit: 1,
      city: 1,
      address: 1,
      latitude: 1,
      longitude: 1,
      contactPhone: 1,
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
    const fields = stepFieldsForCategory(currentStep, form.getValues("category"));
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
    if (ok) {
      goToStep(Math.min(currentStep + 1, 2));
      return;
    }
    // Never fail silently — scroll to the first invalid field and surface the message.
    const first = firstInvalidStepField(currentStep);
    if (first) {
      scrollToField(first);
      const message =
        form.getFieldState(first).error?.message ||
        form.formState.errors[first]?.message ||
        (first === "latitude" || first === "longitude"
          ? "Pin the property on the map (or select a city above)."
          : "Please fix the highlighted fields.");
      toast.error(String(message));
      return;
    }
    if (currentStep === 1 && isAdmin) {
      const issue = validateAdminAssignment(form.getValues());
      if (issue) toast.error(issue);
    }
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
      "areaValue",
      "areaUnit",
      "city",
      "address",
      "contactPhone",
      "latitude",
      "longitude",
    ] as const;
    const first = order.find((name) => errors[name] || form.getFieldState(name).error);
    const step = first ? stepForField(first) : 0;
    goToStep(step);
    if (first) scrollToField(first);
  }

  function isAcceptableImageFile(file: File) {
    // iOS/Android gallery often sends empty MIME; accept by extension too.
    if (file.type.startsWith("image/")) return true;
    if (!file.type) {
      return /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name);
    }
    return false;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;

    const slotsLeft = MAX_PROPERTY_PHOTOS - previews.length;
    if (slotsLeft <= 0) {
      toast.error(`Maximum ${MAX_PROPERTY_PHOTOS} photos reached - remove one to add another.`);
      return;
    }

    const acceptable = Array.from(files).filter(isAcceptableImageFile);
    const rejectedType = files.length - acceptable.length;
    if (!acceptable.length) {
      toast.error("Could not add those photos. Use JPG, PNG, or HEIC from your gallery.");
      return;
    }

    const unique: File[] = [];
    let duplicateCount = 0;
    for (const file of acceptable) {
      const fp = fileFingerprint(file);
      if (photoFingerprintsRef.current.includes(fp) || unique.some((item) => fileFingerprint(item) === fp)) {
        duplicateCount += 1;
        continue;
      }
      unique.push(file);
    }
    if (duplicateCount > 0 && !unique.length) {
      toast.error("This photo has already been added.");
      return;
    }
    if (duplicateCount > 0) {
      toast.message(
        duplicateCount === 1
          ? "This photo has already been added."
          : `${duplicateCount} duplicate photos were skipped.`,
      );
    }

    const toAdd = unique.slice(0, slotsLeft);
    const skippedOverCap = unique.length - toAdd.length;
    if (skippedOverCap > 0) {
      toast.message(
        `Only ${slotsLeft} more photo${slotsLeft === 1 ? "" : "s"} can be added (${MAX_PROPERTY_PHOTOS} max) - the rest were not uploaded.`,
      );
    } else if (rejectedType > 0 && duplicateCount === 0) {
      toast.message("Some files were skipped (not images).");
    }

    setCompressingPhotos(true);
    try {
      const nextUrls: string[] = [];
      const nextFiles: File[] = [];
      const nextFingerprints: string[] = [];
      for (const file of toAdd) {
        try {
          const fingerprint = fileFingerprint(file);
          const compressed = await compressListingImage(file);
          const url = URL.createObjectURL(compressed);
          objectUrlsRef.current.push(url);
          nextUrls.push(url);
          nextFiles.push(compressed);
          nextFingerprints.push(fingerprint);
        } catch (error) {
          console.error("[property-form] compress failed", error);
          toast.error(`Could not compress ${file.name}. Try a JPG or PNG.`);
        }
      }
      if (nextUrls.length) {
        const nextIds = nextUrls.map(
          (_, index) => `local-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        );
        photoFingerprintsRef.current = [...photoFingerprintsRef.current, ...nextFingerprints].slice(
          0,
          MAX_PROPERTY_PHOTOS,
        );
        setPreviews((current) => [...current, ...nextUrls].slice(0, MAX_PROPERTY_PHOTOS));
        setPhotoIds((current) => [...current, ...nextIds].slice(0, MAX_PROPERTY_PHOTOS));
        setPhotoFiles((current) => [...current, ...nextFiles].slice(0, MAX_PROPERTY_PHOTOS));
        setPhotoError(false);
        setSubmitError(null);
      }
    } finally {
      setCompressingPhotos(false);
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
    setPhotoIds((current) => current.filter((_, i) => i !== index));
    setPhotoFiles((current) => current.filter((_, i) => i !== index));
    photoFingerprintsRef.current = photoFingerprintsRef.current.filter((_, i) => i !== index);
    setPreviewPhotoIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function reorderPhotos(orderedIds: string[]) {
    setPhotoIds((currentIds) => {
      setPreviews((currentPreviews) => reorderByIds(currentPreviews, currentIds, orderedIds));
      setPhotoFiles((currentFiles) => reorderByIds(currentFiles, currentIds, orderedIds));
      photoFingerprintsRef.current = reorderByIds(
        photoFingerprintsRef.current,
        currentIds,
        orderedIds,
      );
      return orderedIds;
    });
  }

  async function createOwnerQuick(): Promise<User | null> {
    const name = normalizePersonName(newOwnerName);
    const contact = newOwnerContact.trim();
    if (name.length < 2) {
      setAssignError("Enter the owner’s name.");
      return null;
    }
    if (!isLettersAndSpacesOnly(name)) {
      setAssignError(PERSON_NAME_LETTERS_MESSAGE);
      return null;
    }
    if (contact.length < 10 || contact.includes("@")) {
      setAssignError("Enter a phone number (at least 10 digits) so Admin can reach the owner.");
      return null;
    }
    const owner: User = {
      id: `u-owner-${Date.now()}`,
      fullName: name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@owner.local`,
      phone: contact,
      role: "INDIVIDUAL",
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
    if (compressingPhotos) {
      setSubmitError("Wait for photo compression to finish.");
      goToStep(2);
      return;
    }
    if (previews.length < 1) {
      setPhotoError(true);
      setSubmitError("Add at least one photo to submit.");
      goToStep(2);
      return;
    }
    if (previews.length > MAX_PROPERTY_PHOTOS) {
      setPhotoError(true);
      setSubmitError(`A listing can have at most ${MAX_PROPERTY_PHOTOS} photos.`);
      goToStep(2);
      return;
    }
    setSubmitError(null);
    const images = previews.slice(0, MAX_PROPERTY_PHOTOS);
    const imageFiles = photoFiles.slice(0, MAX_PROPERTY_PHOTOS);
    setUploadProgress({ current: 0, total: images.length });
    const photoOptions = {
      imageFiles,
      onPhotoProgress: (current: number, total: number) => {
        setUploadProgress({ current, total });
      },
    };

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
      listingTypeValue = isDealerListing ? "BUSINESS" : "DIRECT_OWNER";
      developerId = isDealerListing ? linkedDeveloper?.id : undefined;
    }

    let status: PropertyStatus;
    if (editingProperty) {
      if (isLiveEdit) {
        status = editingProperty.status;
      } else if (isAdmin) {
        status = adminPublishStatus;
      } else {
        status = "PENDING_APPROVAL";
      }
    } else {
      status = isAdmin ? adminPublishStatus : "PENDING_APPROVAL";
    }

    try {
      const areaSqft = toAreaSqft(values.areaValue, values.areaUnit);
      const bedsBaths =
        values.category === "HOME"
          ? {
              bedrooms: values.bedrooms ?? 0,
              bathrooms: values.bathrooms ?? 0,
            }
          : { bedrooms: 0, bathrooms: 0 };
      const areaPayload = {
        areaSqft,
        areaValue: values.areaValue,
        areaUnit: values.areaUnit,
        ...bedsBaths,
      };

      // When ?edit= is present, ALWAYS update that document — never mint a new id.
      if (editId) {
        if (!editingProperty) {
          toast.error("Still loading this listing. Wait a moment and try again.");
          return;
        }
        const statusChanged = status !== editingProperty.status;
        const statusPatch = statusChanged
          ? buildStatusChangePatch(editingProperty, {
              status,
              clearRejectionReason: status === "PUBLISHED" || status === "PENDING_APPROVAL",
              by: isAdmin
                ? undefined
                : user?.fullName ?? user?.email,
            })
          : {};
        await updateProperty(
          editId,
          {
            title: values.title,
            description: values.description,
            listingType: listingTypeValue,
            purpose: values.purpose,
            category: values.category,
            subtype: values.subtype,
            price: values.price,
            ...areaPayload,
            address: values.address,
            city: values.city,
            latitude: values.latitude,
            longitude: values.longitude,
            contactPhone: values.contactPhone,
            developerId: developerId ?? editingProperty.developerId,
            images,
            ownerUserId: resolvedOwnerId ?? editingProperty.ownerUserId,
            highlightSpecs: normalizeHighlightKeys(values.highlightSpecs, values.category),
            featureTags: normalizeFeatureTags(values.featureTags),
            status,
            ...statusPatch,
            ...(status === "PUBLISHED" || status === "RESERVED" || !statusChanged
              ? { rejectionReason: undefined }
              : {}),
          },
          photoOptions,
        );
        setSubmittedId(editId);
      } else {
        const id = `p-${Date.now()}`;
        const listing: Property = {
          id,
          title: values.title,
          description: values.description,
          listingType: listingTypeValue,
          purpose: values.purpose,
          category: values.category,
          subtype: values.subtype,
          status,
          price: values.price,
          ...areaPayload,
          address: values.address,
          city: values.city,
          latitude: values.latitude,
          longitude: values.longitude,
          images,
          createdAt: new Date().toISOString(),
          contactPhone: values.contactPhone,
          highlightSpecs: normalizeHighlightKeys(values.highlightSpecs, values.category),
          featureTags: normalizeFeatureTags(values.featureTags),
        };
        if (developerId) listing.developerId = developerId;
        if (resolvedOwnerId) listing.ownerUserId = resolvedOwnerId;
        await addProperty(listing, photoOptions);
        setSubmittedId(id);
      }
    } catch (error) {
      console.error("Listing submit failed", error);
      const message = firestoreErrorMessage(
        error,
        "Could not submit listing. Check your photos and connection, then try again.",
      );
      setSubmitError(message);
      toast.error(message);
      return;
    } finally {
      setUploadProgress(null);
    }
    setSubmittedTitle(values.title);
    setSubmittedStatus(status === "PUBLISHED" || status === "RESERVED" ? "PUBLISHED" : "PENDING_APPROVAL");
    setDone(true);
    toast.success(
      isLiveEdit
        ? "Listing updated and live."
        : editingProperty && !isAdmin
          ? "Resubmitted for review."
          : status === "PUBLISHED"
            ? "Property published."
            : "Submitted for review.",
    );
  }

  async function publish(values: PropertyFormValues) {
    const normalized: PropertyFormValues = {
      ...values,
      contactPhone: formatPakistanMobileE164(values.contactPhone),
    };
    if (previews.length < 1) {
      setPhotoError(true);
      goToStep(2);
      return;
    }
    await continuePublish(normalized);
  }

  async function continuePublish(values: PropertyFormValues) {
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
      toast.error("Please sign in to submit a listing.");
      router.replace(`/login?returnTo=${encodeURIComponent("/owner/add-property")}`);
      return;
    }
    await commitPublish(values, user.id);
  }

  if (editId && !editingProperty && !editLoadError && (propertiesLoading || isFirebaseConfigured())) {
    return (
      <div className="border border-forest/10 bg-cream/40 px-8 py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading listing for edit…</p>
      </div>
    );
  }

  if (editId && editLoadError && !editingProperty) {
    return (
      <div className="border border-forest/10 bg-cream/40 px-8 py-16 text-center">
        <p className="text-sm text-destructive">{editLoadError}</p>
      </div>
    );
  }

  if (done) {
    const published = submittedStatus === "PUBLISHED";
    const liveUpdated =
      published &&
      Boolean(editingProperty) &&
      (editingProperty?.status === "PUBLISHED" || editingProperty?.status === "RESERVED");
    return (
      <div className="border border-forest/10 bg-cream/40 px-8 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800">
          {published ? "Live listing" : "Pending review"}
        </p>
        <h2 className="mt-3 font-serif text-4xl">
          {liveUpdated
            ? "Listing updated"
            : published
              ? "Property published"
              : "Submitted for verification"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          {liveUpdated
            ? "Your changes are live on the marketplace and map."
            : published
              ? "This listing is live on the marketplace and map."
              : isAdmin
                ? "Saved to the verification queue for another admin to review."
                : "Your property has been submitted for review. Our team will verify the details and publish it within 24-48 hours."}
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
              <Button variant="outline" onClick={() => router.push("/properties?intent=buy")}>
                Marketplace
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() =>
                  router.push(user?.role === "DEALER" ? "/dealer" : "/owner")
                }
              >
                My listings
              </Button>
              <Button variant="outline" onClick={() => router.push("/properties?intent=buy")}>
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
                              form.setValue("highlightSpecs", defaultHighlightKeys(next));
                              if (next === "PLOTS" || next === "COMMERCIAL") {
                                form.setValue("bedrooms", 0);
                                form.setValue("bathrooms", 0);
                                form.clearErrors(["bedrooms", "bathrooms"]);
                              } else if (form.getValues("bedrooms") === 0) {
                                form.setValue("bedrooms", undefined as unknown as number);
                                form.setValue("bathrooms", undefined as unknown as number);
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
                    <Textarea rows={6} className={fieldFocus} {...field} />
                  </FormControl>
                  <FormMessage />
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
            lead
            className="mb-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => {
                  const originLabel =
                    field.value === "BUSINESS"
                      ? isAdmin
                        ? "Business / Dealer"
                        : "Dealer verified"
                      : field.value === "DIRECT_OWNER"
                        ? isAdmin
                          ? "Direct Owner"
                          : "Direct from owner"
                        : null;

                  // Non-admin origin is locked to the signed-in role; keep a read-only
                  // field so Pricing stays a two-column layout beside price.
                  if (!isAdmin) {
                    return (
                      <FormItem>
                        <FormLabel className="mb-0.5">Origin</FormLabel>
                        <FormControl>
                          <Input
                            readOnly
                            tabIndex={-1}
                            value={originLabel ?? ""}
                            className={cn("h-10 cursor-default", fieldFocus)}
                            aria-readonly="true"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }

                  return (
                    <FormItem>
                      <FormLabel className="mb-0.5">Origin</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className={cn("h-10", fieldFocus)}>
                            <SelectValue placeholder="Select origin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DIRECT_OWNER">Direct Owner</SelectItem>
                          <SelectItem value="BUSINESS">Business / Dealer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
                        placeholder="Enter amount"
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
              {!listingType ? (
                <p className="text-sm text-muted-foreground">
                  Select an origin above to assign a house owner or dealer.
                </p>
              ) : listingType === "DIRECT_OWNER" ? (
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
                          {owner.phone
                            ? ` · ${owner.phone}`
                            : displayUserEmail(owner.email)
                              ? ` · ${displayUserEmail(owner.email)}`
                              : ""}
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
                      <FullNameInput
                        placeholder="Full name"
                        value={newOwnerName}
                        maxLength={FULL_NAME_MAX_LENGTH}
                        onChange={setNewOwnerName}
                        className={fieldFocus}
                      />
                      <Input
                        placeholder="Phone number"
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
            lead
            tone="cream"
            className="mb-11"
          >
            {form.watch("category") === "HOME" && (
              <div className="grid gap-5 sm:grid-cols-2">
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
                          placeholder="e.g. 3"
                          integerOnly
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
                          placeholder="e.g. 3"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
              <FormField
                control={form.control}
                name="areaValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">
                      {form.watch("category") === "PLOTS" ? "Plot area" : "Area"}
                    </FormLabel>
                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        icon={Maximize2}
                        placeholder={
                          form.watch("areaUnit") === "marla"
                            ? "e.g. 5"
                            : form.watch("areaUnit") === "kanal"
                              ? "e.g. 1"
                              : "e.g. 1800"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-0.5">Unit</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as AreaUnitId)}
                    >
                      <FormControl>
                        <SelectTrigger className={cn("h-10", fieldFocus)}>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREA_UNITS.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-2xl border border-forest/10 bg-white/80 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <p className="text-sm font-medium text-forest">Features to highlight</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose which specs stand out on the map and listing cards. Values come from the fields above.
              </p>
              <FormField
                control={form.control}
                name="highlightSpecs"
                render={({ field }) => {
                  const category = form.watch("category");
                  const allowed = defaultHighlightKeys(category);
                  const selected = new Set(normalizeHighlightKeys(field.value, category));
                  const beds = form.watch("bedrooms");
                  const baths = form.watch("bathrooms");
                  const areaValue = form.watch("areaValue");
                  const areaUnit = form.watch("areaUnit");
                  const labels: Record<PropertyHighlightKey, string> = {
                    bedrooms: Number.isFinite(beds) ? `Bedrooms (${beds})` : "Bedrooms",
                    bathrooms: Number.isFinite(baths) ? `Bathrooms (${baths})` : "Bathrooms",
                    area: Number.isFinite(areaValue)
                      ? `Area (${formatAreaValue(areaValue!, areaUnit)})`
                      : "Area",
                    price: `Price`,
                  };
                  return (
                    <FormItem className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {allowed.map((key) => {
                          const on = selected.has(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                on
                                  ? "border-forest bg-forest text-ivory"
                                  : "border-forest/15 bg-cream/60 text-forest/70 hover:border-forest/30",
                              )}
                              onClick={() => {
                                const next = new Set(selected);
                                if (on) next.delete(key);
                                else next.add(key);
                                const ordered = allowed.filter((item) => next.has(item));
                                field.onChange(ordered.length ? ordered : allowed);
                              }}
                            >
                              {labels[key]}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="featureTags"
                render={({ field }) => {
                  const tags = normalizeFeatureTags(field.value);
                  return (
                    <FormItem className="mt-4">
                      <FormLabel className="mb-0.5">Extra features (optional)</FormLabel>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Up to {MAX_FEATURE_TAGS} short tags - e.g. Corner plot, Basement.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full border border-forest bg-forest px-2.5 py-1 text-xs font-medium text-ivory"
                          >
                            {tag}
                            <button
                              type="button"
                              aria-label={`Remove ${tag}`}
                              className="text-ivory/70 hover:text-ivory"
                              onClick={() =>
                                field.onChange(tags.filter((item) => item !== tag))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {tags.length < MAX_FEATURE_TAGS ? (
                        <div className="mt-2 flex gap-2">
                          <Input
                            className={cn(fieldFocus, "flex-1")}
                            placeholder="Add a feature"
                            value={featureTagDraft}
                            maxLength={FEATURE_TAG_MAX_LENGTH}
                            onChange={(event) => {
                              setFeatureTagDraft(event.target.value);
                              if (featureTagError) setFeatureTagError(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              const next = tryAddFeatureTag(tags, featureTagDraft);
                              if (!next) return;
                              field.onChange(next);
                              setFeatureTagDraft("");
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              const next = tryAddFeatureTag(tags, featureTagDraft);
                              if (!next) return;
                              field.onChange(next);
                              setFeatureTagDraft("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ) : null}
                      {featureTagError ? (
                        <p className="text-sm text-destructive" role="alert">
                          {featureTagError}
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <FormItem id="city" className="scroll-mt-28">
                    <FormLabel className="mb-0.5">City</FormLabel>
                    <FormControl>
                      <CityCombobox
                        value={field.value}
                        hasError={Boolean(fieldState.error)}
                        className={cn("h-10", fieldFocus)}
                        onChange={(value) => {
                          field.onChange(value);
                          form.clearErrors("city");
                          void form.trigger("city");
                          const coords = CITY_COORDS[value];
                          if (coords) {
                            form.setValue("latitude", coords.latitude);
                            form.setValue("longitude", coords.longitude);
                          }
                        }}
                      />
                    </FormControl>
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
                      <Input className={cn("h-10", fieldFocus)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="mb-0.5">Contact phone</FormLabel>
                  <FormControl>
                    <PakistanPhoneInput
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      hasError={Boolean(fieldState.error)}
                      className={fieldFocus}
                      autoComplete="tel-national"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div id="map-place" tabIndex={-1} className="scroll-mt-28 space-y-2 outline-none">
              <MapPicker
                latitude={form.watch("latitude")}
                longitude={form.watch("longitude")}
                showSearch={false}
                onChange={(coords) => {
                  // Avoid shouldValidate here — full-schema revalidation mid-edit can leave
                  // stale errors that make Continue appear to do nothing.
                  form.setValue("latitude", coords.latitude, { shouldDirty: true });
                  form.setValue("longitude", coords.longitude, { shouldDirty: true });
                  form.clearErrors(["latitude", "longitude"]);
                }}
              />
              {(errors.latitude || errors.longitude) && (
                <p className="text-sm text-destructive" role="alert">
                  Pin the property on the map (or select a city above).
                </p>
              )}
            </div>
          </FormSection>
            </>
          )}

          {currentStep === 2 && (
            <>
          <FormSection
            id="photographs"
            title="Photographs"
            icon={ImageIcon}
            lead
            tone="cream"
            className="mb-10"
          >
            {previews.length >= MAX_PROPERTY_PHOTOS ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest/20 bg-cream/50 px-6 py-10 text-center">
                <p className="text-sm font-medium text-forest">
                  Maximum {MAX_PROPERTY_PHOTOS} photos reached - remove one to add another
                </p>
                <p className="mt-1 text-xs text-muted-foreground">First photo is the cover.</p>
              </div>
            ) : (
              <label
                htmlFor="property-photo-input"
                aria-disabled={compressingPhotos}
                className={cn(
                  "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-14 text-center transition-all duration-300",
                  compressingPhotos ? "cursor-wait opacity-70" : "cursor-pointer",
                  dragOver
                    ? "border-gold/70 bg-gold/10 shadow-[inset_0_0_0_1px_rgba(184,149,69,0.18)]"
                    : "border-[#D9CFB8]/90 bg-[#FFFCFA]/70 hover:border-gold/50 hover:bg-gold/[0.04]",
                )}
              >
                <span className="pointer-events-none flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFFCF7] via-gold/20 to-gold/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_20px_-12px_rgba(184,149,69,0.55)]">
                  <ImagePlus className="h-7 w-7 text-gold-700" strokeWidth={1.5} />
                </span>
                <p className="pointer-events-none mt-4 text-sm text-forest">
                  {compressingPhotos ? "Compressing photos…" : "Drop photographs or tap to select"}
                </p>
                <p className="pointer-events-none mt-1 text-xs text-muted-foreground">
                  Up to {MAX_PROPERTY_PHOTOS} photos · {MAX_PROPERTY_PHOTOS - previews.length}{" "}
                  remaining. First photo is the cover. JPG, PNG, or HEIC.
                </p>
                {/*
                  Transparent file input covers the dropzone. Native activation only —
                  preventDefault + input.click() was blocking the picker after the edit fix.
                */}
                <input
                  id="property-photo-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif,image/heic,image/heif"
                  multiple
                  disabled={compressingPhotos}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                  onDragEnter={() => {
                    if (!compressingPhotos) setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={() => setDragOver(false)}
                  onChange={(event) => {
                    void onFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
            {photoError && previews.length < 1 && (
              <p className="text-sm text-destructive" role="alert">
                Add at least one photo to submit
              </p>
            )}
            {previews.length > 0 && (
              <div className="space-y-2">
                <SortablePropertyPhotos
                  items={previews.map((src, index) => ({
                    id: photoIds[index] ?? `fallback-${index}`,
                    src,
                  }))}
                  onReorder={reorderPhotos}
                  onPreview={setPreviewPhotoIndex}
                  onRemove={removePreview}
                />
                <p className="text-xs text-muted-foreground">
                  {previews.length} / {MAX_PROPERTY_PHOTOS} photos · drag to reorder · first photo is
                  the cover
                </p>
              </div>
            )}
          </FormSection>

          <div className="space-y-5 rounded-2xl bg-gradient-to-br from-[#FBF6EA] via-[#F9F3E4] to-[#F4EBDA] p-7 shadow-[0_20px_55px_-30px_rgba(15,46,29,0.28)] ring-1 ring-gold/20 sm:p-10">
            {isAdmin && !isLiveEdit && (
              <div className="space-y-3">
                <p className="type-eyebrow">Publish</p>
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

            {submitError ? (
              <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
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
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || compressingPhotos}
                className="min-w-[180px] sm:min-w-[220px]"
              >
                {compressingPhotos
                  ? "Compressing photos…"
                  : uploadProgress
                    ? `Uploading photo ${uploadProgress.current} of ${uploadProgress.total}…`
                    : isSubmitting
                      ? isLiveEdit
                        ? "Saving…"
                        : isAdmin && adminPublishStatus === "PUBLISHED"
                          ? "Publishing…"
                          : "Uploading photos…"
                      : isLiveEdit
                        ? "Save changes"
                        : isAdmin
                          ? adminPublishStatus === "PUBLISHED"
                            ? "Publish Immediately"
                            : "Save as Pending Review"
                          : editingProperty
                            ? "Resubmit for review"
                            : "Submit for review"}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <Dialog
        open={previewPhotoIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPhotoIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl border-forest/10 bg-ivory p-2 sm:p-3">
          <DialogTitle className="sr-only">Photo preview</DialogTitle>
          {previewPhotoIndex !== null && previews[previewPhotoIndex] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previews[previewPhotoIndex]}
              alt={`Listing photo ${previewPhotoIndex + 1}`}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
