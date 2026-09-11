"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { cn } from "@/lib/utils";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/map";

  return (
    <div
      className={cn(
        "flex flex-col bg-ivory",
        fullBleed ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <Navbar />
      <main className={cn("flex-1", fullBleed && "min-h-0 overflow-hidden")}>{children}</main>
      {!fullBleed && <Footer />}
      <WhatsAppFloat />
    </div>
  );
}
