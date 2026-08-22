"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { formatArea, formatPrice, listingBadge } from "@/lib/format";
import { propertyFormSchema, type PropertyFormValues } from "@/lib/schemas";
import { CITIES } from "@/lib/types";
import { CITY_COORDS } from "@/lib/map";
import { cn, delay } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/map/map-picker").then((mod) => mod.MapPicker), { ssr: false });

const steps = [
  { id: "details", label: "The home" },
  { id: "place", label: "Place" },
  { id: "photos", label: "Photographs" },
] as const;

const DESC_MAX = 1200;

function NumberInput({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  name: string;
}) {
  return (
    <Input
      type="number"
      className="bg-white"
      name={name}
      value={Number.isFinite(value) ? value : ""}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.valueAsNumber)}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">{children}</p>;
}

export function PropertyForm() {
  const router = useRouter();
  const { user } = useMockAuth();
  const { addProperty } = useMockStore();
  const [step, setStep] = useState(0);
  // TODO: replace object URLs with real upload to Firebase Storage/Cloudflare R2 when backend is wired up
  const [previews, setPreviews] = useState<string[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      listingType: "DIRECT_OWNER",
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

  const watched = useWatch({ control: form.control });

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: string[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      // TODO: replace object URLs with real upload to Firebase Storage/Cloudflare R2 when backend is wired up
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

  async function blobToDataUrl(url: string): Promise<string> {
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function publish(values: PropertyFormValues) {
    if (previews.length < 1) {
      setPhotoError(true);
      return;
    }
    if (!user) {
      toast.error("Please sign in to publish.");
      router.push("/login?returnTo=%2Fowner%2Fadd-property");
      return;
    }
    await delay(400);
    const id = `p-${Date.now()}`;
    // TODO: replace object URLs with real upload to Firebase Storage/Cloudflare R2 when backend is wired up
    // Data URLs keep previews visible in My Listings / admin for this frontend-only phase.
    const images = await Promise.all(previews.map((src) => blobToDataUrl(src)));
    await addProperty({
      id,
      ...values,
      status: "PENDING_APPROVAL",
      images,
      ownerUserId: user.id,
      createdAt: new Date().toISOString(),
    });
    setSubmittedId(id);
    setSubmittedTitle(values.title);
    setDone(true);
    toast.success("Submitted for review.");
  }

  const previewProperty = useMemo(
    () => ({
      title: watched.title?.trim() || "Your listing title",
      price: Number.isFinite(watched.price) ? watched.price! : 0,
      bedrooms: Number.isFinite(watched.bedrooms) ? watched.bedrooms! : 0,
      bathrooms: Number.isFinite(watched.bathrooms) ? watched.bathrooms! : 0,
      areaSqft: Number.isFinite(watched.areaSqft) ? watched.areaSqft! : 0,
      city: watched.city || "City",
      listingType: watched.listingType ?? "DIRECT_OWNER",
      cover: previews[0] ?? null,
    }),
    [watched, previews],
  );

  if (done) {
    return (
      <div className="border border-forest/10 bg-cream/40 px-8 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800">Pending review</p>
        <h2 className="mt-3 font-serif text-4xl">Submitted for verification</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Your property has been submitted for review. Our team will verify the details and publish it within
          24–48 hours.
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
          <Button onClick={() => router.push("/owner")}>My listings</Button>
          <Button variant="outline" onClick={() => router.push("/properties")}>
            Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] lg:items-start">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(publish)} className="space-y-8">
          <ol className="flex items-center gap-0">
            {steps.map((item, index) => {
              const active = index === step;
              const complete = index < step;
              return (
                <li key={item.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-medium transition-colors",
                        active || complete
                          ? "border-gold bg-gold text-forest"
                          : "border-forest/20 bg-transparent text-muted-foreground",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[10px] uppercase tracking-[0.16em] sm:block",
                        active ? "text-gold-700" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-2 mb-6 h-px flex-1 bg-forest/10 sm:mb-5">
                      <div
                        className="h-full bg-gold transition-all duration-500"
                        style={{ width: complete ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="space-y-6"
            >
              {step === 0 && (
                <>
                  <div className="space-y-5">
                    <SectionLabel>Details</SectionLabel>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              className="bg-white"
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea rows={6} maxLength={DESC_MAX} className="bg-white" {...field} />
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
                  </div>
                  <div className="space-y-5 border-t border-forest/10 pt-6">
                    <SectionLabel>Pricing</SectionLabel>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="listingType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Origin</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="DIRECT_OWNER">Direct from owner</SelectItem>
                                <SelectItem value="BUSINESS">Dealer verified</SelectItem>
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
                            <FormLabel>Price (PKR)</FormLabel>
                            <FormControl>
                              <NumberInput
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                name={field.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <SectionLabel>Location</SectionLabel>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <NumberInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
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
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <NumberInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
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
                          <FormLabel>Area (sqft)</FormLabel>
                          <FormControl>
                            <NumberInput
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
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
                              <SelectTrigger className="bg-white">
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
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input className="bg-white" {...field} />
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
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <SectionLabel>Photos</SectionLabel>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onFiles(event.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-forest/25 bg-white px-6 py-12 text-center transition-colors hover:border-gold/60"
                  >
                    <ImagePlus className="h-6 w-6 text-gold" />
                    <p className="mt-3 text-sm text-forest">Drop photographs or click to select</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      First photo becomes the cover. Local preview only in this phase.
                    </p>
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
                    <p className="text-sm text-destructive">Add at least one photo to continue</p>
                  )}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {previews.map((src, index) => (
                        <div key={`${src}-${index}`} className="relative aspect-[4/3] overflow-hidden bg-cream">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          {index === 0 && (
                            <span className="absolute left-1.5 top-1.5 bg-gold px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-forest">
                              Cover
                            </span>
                          )}
                          <div className="absolute bottom-1 left-1 flex gap-1">
                            <button
                              type="button"
                              className="bg-forest/80 p-1 text-ivory disabled:opacity-40"
                              disabled={index === 0}
                              onClick={() => movePreview(index, -1)}
                              aria-label="Move earlier"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="bg-forest/80 p-1 text-ivory disabled:opacity-40"
                              disabled={index === previews.length - 1}
                              onClick={() => movePreview(index, 1)}
                              aria-label="Move later"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="absolute right-1 top-1 bg-forest/80 p-1 text-ivory"
                            onClick={() => removePreview(index)}
                            aria-label="Remove photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between border-t border-forest/10 pt-6">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
            {step < 2 ? (
              <Button
                type="button"
                onClick={async () => {
                  const fields =
                    step === 0
                      ? (["title", "description", "price", "listingType"] as const)
                      : (["bedrooms", "bathrooms", "areaSqft", "city", "address", "latitude", "longitude"] as const);
                  const valid = await form.trigger(fields);
                  if (valid) setStep((value) => value + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={form.formState.isSubmitting || previews.length < 1}>
                {form.formState.isSubmitting ? "Submitting…" : "Submit for review"}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <aside className="lg:sticky lg:top-28">
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Live preview</p>
        <p className="mt-1 text-sm text-muted-foreground">How buyers will see this listing</p>
        <div className="group mt-4 overflow-hidden border border-forest/10 bg-white shadow-sm">
          <div className="relative aspect-[4/3] bg-cream">
            {previewProperty.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewProperty.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Cover photo appears here
              </div>
            )}
            <Badge
              variant={previewProperty.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
              className="absolute left-3 top-3 text-[10px] uppercase"
            >
              {listingBadge(previewProperty.listingType)}
            </Badge>
          </div>
          <div className="space-y-2 px-4 py-4">
            <p className="font-serif text-xl leading-snug text-forest">{previewProperty.title}</p>
            <p className="text-sm font-medium text-gold-700">
              {previewProperty.price > 0 ? formatPrice(previewProperty.price) : "Price"}
            </p>
            <p className="text-xs text-muted-foreground">
              {previewProperty.bedrooms} bed · {previewProperty.bathrooms} bath ·{" "}
              {previewProperty.areaSqft > 0 ? formatArea(previewProperty.areaSqft) : "Area"} · {previewProperty.city}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
