import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import type { SeoLanding } from "@/content/seo-landings";
import { landingPriceSummary } from "@/content/seo-landings";
import type { Property } from "@/lib/types";

export function SeoLandingView({
  landing,
  properties,
  related,
}: {
  landing: SeoLanding;
  properties: Property[];
  related: SeoLanding[];
}) {
  const summary = landingPriceSummary(properties);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-forest">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/properties" className="hover:text-forest">
              Properties
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-forest">{landing.h1}</li>
        </ol>
      </nav>

      <header className="mt-8 max-w-3xl">
        <h1 className="font-serif text-3xl text-forest sm:text-4xl">{landing.h1}</h1>
        <p className="mt-4 text-base leading-relaxed text-[#526057]">
          {landing.intro}
          {summary ? ` ${summary}` : ""}
        </p>
      </header>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property, index) => (
          <PropertyCard key={property.id} property={property} priority={index < 3} />
        ))}
      </div>

      {related.length > 0 ? (
        <aside className="mt-16 border-t border-forest/10 pt-10">
          <h2 className="font-serif text-2xl text-forest">Related searches</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/${item.slug}`} className="text-forest underline-offset-4 hover:underline">
                  {item.h1}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}
