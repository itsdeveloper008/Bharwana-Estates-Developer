import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: true },
};

/** Pure server markup (no client Button) so the h1 can land in the HTML document. */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="type-eyebrow">404</p>
      <h1 className="mt-3 font-serif text-4xl">This page is not on the floor</h1>
      <a
        href="/"
        className="mt-8 inline-flex h-11 min-h-11 items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-medium text-forest shadow-none transition-colors hover:bg-gold-600 md:h-9 md:min-h-9"
      >
        Return home
      </a>
    </div>
  );
}
