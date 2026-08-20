import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">404</p>
      <h1 className="mt-3 font-serif text-4xl">This page is not on the floor</h1>
      <Button asChild className="mt-8">
        <Link href="/">Return home</Link>
      </Button>
    </div>
  );
}
