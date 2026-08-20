"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { propertyFormSchema, type PropertyFormValues } from "@/lib/schemas";
import { CITIES } from "@/lib/types";
import { CITY_COORDS } from "@/lib/map";
import { delay } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/map/map-picker").then((mod) => mod.MapPicker), { ssr: false });

const steps = ["The home", "Place", "Photographs"];

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

export function PropertyForm() {
  const router = useRouter();
  const { user, loginAsRole } = useMockAuth();
  const { addProperty } = useMockStore();
  const [step, setStep] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [done, setDone] = useState(false);

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

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPreviews((current) => [...current, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function publish(values: PropertyFormValues) {
    if (!user) loginAsRole("HOUSE_OWNER");
    await delay(400);
    await addProperty({
      id: `p-${Date.now()}`,
      ...values,
      status: "PUBLISHED",
      images:
        previews.length > 0
          ? previews
          : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"],
      ownerUserId: user?.id ?? "u-owner-1",
      createdAt: new Date().toISOString(),
    });
    setDone(true);
    toast.success("Listing published.");
  }

  if (done) {
    return (
      <div className="border border-gold/30 bg-cream/40 px-8 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Submitted</p>
        <h2 className="mt-3 font-serif text-4xl">Your residence is on the floor</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          In this frontend preview it is stored in session state only.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => router.push("/owner")}>View my listings</Button>
          <Button variant="outline" onClick={() => router.push("/properties")}>
            Marketplace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(publish)} className="space-y-8">
        <ol className="flex gap-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {steps.map((label, index) => (
            <li key={label} className={index === step ? "text-gold-700" : undefined}>
              0{index + 1} {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input className="bg-white" placeholder="e.g. Canal-facing bungalow, Model Town" {...field} />
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
                    <Textarea rows={6} className="bg-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                        <SelectItem value="BUSINESS">Developer verified</SelectItem>
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
                      <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
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
                      <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
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
                      <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
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
            <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-forest/20 bg-white px-6 py-12 text-center">
              <ImagePlus className="h-6 w-6 text-gold" />
              <p className="mt-3 text-sm text-forest">Drop photographs or click to preview locally</p>
              <p className="mt-1 text-xs text-muted-foreground">No upload is sent to a server in this phase.</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => onFiles(event.target.files)} />
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {previews.map((src) => (
                  <div key={src.slice(0, 40)} className="relative aspect-[4/3] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 bg-forest/80 p-1 text-ivory"
                      onClick={() => setPreviews((current) => current.filter((item) => item !== src))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between">
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
