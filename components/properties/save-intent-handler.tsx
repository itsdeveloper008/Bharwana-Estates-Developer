"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useFavorites } from "@/lib/favorites-context";
import { useMockAuth } from "@/lib/mock-auth";

function SaveIntentHandlerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady } = useMockAuth();
  const { save, isSaved } = useFavorites();

  useEffect(() => {
    if (!isReady || !user) return;
    if (searchParams.get("intent") !== "save") return;

    const propertyId =
      searchParams.get("propertyId") ??
      (pathname.startsWith("/property/") ? pathname.split("/")[2] : null);

    if (!propertyId) return;

    if (!isSaved(propertyId)) {
      save(propertyId);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("intent");
    params.delete("propertyId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [isReady, user, searchParams, pathname, router, save, isSaved]);

  return null;
}

export function SaveIntentHandler() {
  return (
    <Suspense fallback={null}>
      <SaveIntentHandlerInner />
    </Suspense>
  );
}
