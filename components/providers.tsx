"use client";

import { AdminAuthProvider } from "@/lib/admin-auth";
import { FavoritesProvider } from "@/lib/favorites-context";
import { MockAuthProvider } from "@/lib/mock-auth";
import { MockStoreProvider } from "@/lib/mock-store";
import { TeamStoreProvider } from "@/lib/team-store";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthProvider>
      <AdminAuthProvider>
        <MockStoreProvider>
          <TeamStoreProvider>
            <FavoritesProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                <Toaster position="top-center" />
              </TooltipProvider>
            </FavoritesProvider>
          </TeamStoreProvider>
        </MockStoreProvider>
      </AdminAuthProvider>
    </MockAuthProvider>
  );
}
