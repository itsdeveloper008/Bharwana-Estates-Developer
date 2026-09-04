"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { Input } from "@/components/ui/input";
import { faqCategories } from "@/lib/faq-data";

export function FaqPageContent() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return faqCategories;
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.question.toLowerCase().includes(normalized) ||
            item.answer.toLowerCase().includes(normalized),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [normalized]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="type-eyebrow">Questions</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Answers before you ask.</h1>
      <p className="type-subheading">
        Clear guidance on how Bharwana introduces buyers, sellers, and dealers, drawn from how the
        platform actually works.
      </p>

      <div className="mt-8">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions…"
          className="bg-white"
          aria-label="Search FAQ"
        />
      </div>

      <div className="mt-12 space-y-12">
        {filtered.map((category) => (
          <section key={category.id}>
            <p className="mb-4 type-eyebrow">{category.title}</p>
            <FaqAccordion items={category.items} />
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No questions match your search.
          </p>
        )}
      </div>

      <div className="mt-16 border-t border-forest/10 pt-8 text-center">
        <p className="font-serif text-xl text-forest">Still have a question?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Call{" "}
          <a href="tel:+923001713811" className="text-forest underline-offset-2 hover:underline">
            +92 300 1713811
          </a>{" "}
          or{" "}
          <Link href="/properties" className="text-forest underline-offset-2 hover:underline">
            browse residences
          </Link>{" "}
          to send an inquiry from any listing.
        </p>
      </div>
    </div>
  );
}
