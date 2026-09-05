"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { AdminAuthProvider } from "@/lib/admin-auth";
import { FavoritesProvider } from "@/lib/favorites-context";
import { MockAuthProvider } from "@/lib/mock-auth";
import { MockStoreProvider } from "@/lib/mock-store";
import { TeamStoreProvider } from "@/lib/team-store";
import { SaveIntentHandler } from "@/components/properties/save-intent-handler";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function DismissStaleToasts() {
  useEffect(() => {
    toast.dismiss();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthProvider>
      <AdminAuthProvider>
        <MockStoreProvider>
          <TeamStoreProvider>
            <FavoritesProvider>
              <TooltipProvider delayDuration={200}>
                <DismissStaleToasts />
                {children}
                <SaveIntentHandler />
                <Toaster position="bottom-right" />
              </TooltipProvider>
            </FavoritesProvider>
          </TeamStoreProvider>
        </MockStoreProvider>
      </AdminAuthProvider>
    </MockAuthProvider>
  );
}
