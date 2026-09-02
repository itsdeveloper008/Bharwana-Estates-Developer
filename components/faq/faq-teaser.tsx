import Link from "next/link";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { faqCategories, faqTeaserIds } from "@/lib/faq-data";

export function FaqTeaser() {
  const items = faqTeaserIds
    .map((id) => faqCategories.flatMap((category) => category.items).find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <section className="bg-cream/50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Questions</p>
        <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Answers before you ask.</h2>
        <p className="type-subheading">
          A few of the questions we hear most often from buyers and sellers.
        </p>
        <FaqAccordion items={items} className="mt-10" />
        <Link
          href="/faq"
          className="mt-8 inline-flex text-sm font-medium text-forest underline-offset-4 transition-colors hover:text-gold-700 hover:underline"
        >
          View all FAQs →
        </Link>
      </div>
    </section>
  );
}
