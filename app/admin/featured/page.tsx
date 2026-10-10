"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import {
  EMPTY_FEATURED,
  fetchFeaturedSettings,
  featuredKeyToCategory,
  MAX_FEATURED_PER_CATEGORY,
  saveFeaturedSettings,
  type FeaturedCategoryKey,
  type FeaturedSettings,
} from "@/lib/firestore/featured";
import { useMockStore } from "@/lib/mock-store";
import { PROPERTY_CATEGORIES } from "@/lib/property-taxonomy";
import { propertyCoverImage } from "@/lib/property-images";
import type { Property, PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { key: FeaturedCategoryKey; category: PropertyCategory; label: string }[] = [
  { key: "homes", category: "HOME", label: "Homes" },
  { key: "plots", category: "PLOTS", label: "Plots" },
  { key: "commercial", category: "COMMERCIAL", label: "Commercial" },
];

function idsEqual(a: FeaturedSettings, b: FeaturedSettings) {
  return (
    a.homes.join(",") === b.homes.join(",") &&
    a.plots.join(",") === b.plots.join(",") &&
    a.commercial.join(",") === b.commercial.join(",")
  );
}

export default function AdminFeaturedPage() {
  const { admin } = useAdminAuth();
  const { properties } = useMockStore();
  const [tab, setTab] = useState<FeaturedCategoryKey>("homes");
  const [draft, setDraft] = useState<FeaturedSettings>({ ...EMPTY_FEATURED });
  const [saved, setSaved] = useState<FeaturedSettings>({ ...EMPTY_FEATURED });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const dirty = !idsEqual(draft, saved);
  const activeCategory = featuredKeyToCategory(tab);
  const activeIds = draft[tab];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchFeaturedSettings()
      .then((settings) => {
        if (cancelled) return;
        setDraft(settings);
        setSaved(settings);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Could not load featured settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const property of properties) map.set(property.id, property);
    return map;
  }, [properties]);

  const publishedForCategory = useMemo(() => {
    return properties.filter((property) => {
      if (property.status !== "PUBLISHED") return false;
      return (property.category ?? "HOME") === activeCategory;
    });
  }, [properties, activeCategory]);

  const pickerList = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return publishedForCategory.filter((property) => {
      if (!q) return true;
      const haystack = `${property.title} ${property.city} ${property.price} ${formatPrice(property.price)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [publishedForCategory, pickerQuery]);

  const updateActiveIds = useCallback(
    (next: string[]) => {
      setDraft((current) => ({ ...current, [tab]: next.slice(0, MAX_FEATURED_PER_CATEGORY) }));
    },
    [tab],
  );

  function moveId(index: number, direction: -1 | 1) {
    const next = [...activeIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    updateActiveIds(next);
  }

  function removeId(id: string) {
    updateActiveIds(activeIds.filter((item) => item !== id));
  }

  function addId(id: string) {
    if (activeIds.length >= MAX_FEATURED_PER_CATEGORY) {
      toast.error("Maximum 6 reached for this category.");
      return;
    }
    if (activeIds.includes(id)) return;
    const property = propertyById.get(id);
    if (!property || property.status !== "PUBLISHED") {
      toast.error("Only published properties can be featured.");
      return;
    }
    if ((property.category ?? "HOME") !== activeCategory) {
      toast.error("That property belongs to a different category.");
      return;
    }
    updateActiveIds([...activeIds, id]);
  }

  async function onSave() {
    setSaving(true);
    try {
      await saveFeaturedSettings(
        { homes: draft.homes, plots: draft.plots, commercial: draft.commercial },
        admin?.email || admin?.fullName || admin?.uid,
      );
      setSaved({ ...draft });
      toast.success("Featured properties saved.");
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      console.error("[featured/save]", code || "unknown", error);
      toast.error(
        code === "permission-denied" || code === "firestore/permission-denied"
          ? "You don't have permission to save featured properties"
          : "Could not save featured properties.",
      );
    } finally {
      setSaving(false);
    }
  }

  const slots = Array.from({ length: MAX_FEATURED_PER_CATEGORY }, (_, index) => activeIds[index] ?? null);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">Landing page</p>
          <h1 className="font-serif text-3xl">Featured</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Hand-pick up to {MAX_FEATURED_PER_CATEGORY} published listings per category for the
            homepage Featured section. Order here is the order visitors see.
          </p>
        </div>
        <Button onClick={() => void onSave()} disabled={!dirty || saving || loading} className="rounded-xl">
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              tab === item.key
                ? "bg-forest text-ivory"
                : "border border-forest/15 bg-white text-forest hover:border-gold/40",
            )}
          >
            {item.label}
            <span className="ml-2 tabular-nums text-xs opacity-70">
              {draft[item.key].length}/{MAX_FEATURED_PER_CATEGORY}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading featured picks…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-forest">
              <span className="font-semibold tabular-nums">{activeIds.length}</span>
              <span className="text-muted-foreground">
                {" "}
                / {MAX_FEATURED_PER_CATEGORY} selected ·{" "}
                {PROPERTY_CATEGORIES.find((item) => item.id === activeCategory)?.pluralLabel}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => {
                setPickerQuery("");
                setPickerOpen(true);
              }}
              disabled={activeIds.length >= MAX_FEATURED_PER_CATEGORY}
            >
              <Plus className="h-4 w-4" />
              Add property
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {slots.map((id, index) => {
              if (!id) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-forest/20 bg-cream/40 text-sm text-muted-foreground"
                  >
                    Empty slot
                  </div>
                );
              }
              const property = propertyById.get(id);
              const cover = property ? propertyCoverImage(property.images) : null;
              const stale =
                !property ||
                property.status !== "PUBLISHED" ||
                (property.category ?? "HOME") !== activeCategory;

              return (
                <div
                  key={id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-white shadow-sm",
                    stale ? "border-destructive/40" : "border-forest/10",
                  )}
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-cream">
                      {cover ? (
                        cover.startsWith("data:") || cover.startsWith("blob:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={cover} alt="" fill className="object-cover" sizes="96px" />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-base text-forest">
                        {property?.title ?? id}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {property?.city ?? "—"}
                        {property ? ` · ${formatPrice(property.price)}` : ""}
                      </p>
                      {stale ? (
                        <p className="mt-2 text-xs font-medium text-destructive">
                          No longer published
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        className="rounded-md p-1 text-forest/50 hover:bg-cream hover:text-forest disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveId(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        className="rounded-md p-1 text-forest/50 hover:bg-cream hover:text-forest disabled:opacity-30"
                        disabled={index >= activeIds.length - 1}
                        onClick={() => moveId(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        className="mt-1 rounded-md p-1 text-forest/50 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeId(id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-forest/10 px-5 py-4">
            <DialogTitle className="font-serif text-xl text-forest">
              Add {PROPERTY_CATEGORIES.find((item) => item.id === activeCategory)?.pluralLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
              <Input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder="Search title, city, or price"
                className="h-11 rounded-xl pl-9"
              />
            </div>
            {activeIds.length >= MAX_FEATURED_PER_CATEGORY ? (
              <p className="mt-3 text-sm text-destructive">Maximum 6 reached for this category.</p>
            ) : null}
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto px-5 pb-5">
            {pickerList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No published {activeCategory.toLowerCase()} listings match.
              </p>
            ) : (
              pickerList.map((property) => {
                const cover = propertyCoverImage(property.images);
                const already = activeIds.includes(property.id);
                const atCap = activeIds.length >= MAX_FEATURED_PER_CATEGORY;
                return (
                  <div
                    key={property.id}
                    className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white p-2.5"
                  >
                    <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {cover ? (
                        cover.startsWith("data:") || cover.startsWith("blob:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={cover} alt="" fill className="object-cover" sizes="64px" />
                        )
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-forest">{property.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {property.city} · {formatPrice(property.price)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={already ? "secondary" : "default"}
                      className="rounded-full"
                      disabled={already || atCap}
                      onClick={() => addId(property.id)}
                    >
                      {already ? "Added" : atCap ? "Maximum 6 reached" : "Add"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
