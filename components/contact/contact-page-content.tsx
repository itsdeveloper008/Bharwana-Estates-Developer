import { MapPin, MessageCircle, Phone } from "lucide-react";
import {
  SITE_OFFICE_ADDRESS,
  SITE_OFFICE_ADDRESS_LINES,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_E164,
} from "@/lib/site-contact";

const WHATSAPP_HREF = `https://wa.me/${SITE_PHONE_E164.replace(/^\+/, "")}?text=${encodeURIComponent(
  "Hi Bharwana Estates, I'd like to get in touch.",
)}`;
// "#" in "House #F698" trips Google's search; the map query drops it.
const MAP_QUERY = encodeURIComponent(SITE_OFFICE_ADDRESS.replace(/#/g, ""));
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${MAP_QUERY}&output=embed`;
const DIRECTIONS_HREF = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;

/** Leads come by phone or WhatsApp only — no web form. */
const channels = [
  { icon: Phone, label: "Call", value: SITE_PHONE_DISPLAY, href: `tel:${SITE_PHONE_E164}` },
  { icon: MessageCircle, label: "WhatsApp", value: SITE_PHONE_DISPLAY, href: WHATSAPP_HREF, external: true },
];

export function ContactPageContent() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="type-eyebrow">Contact</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Talk to the estate desk.</h1>
      <p className="type-subheading max-w-2xl">
        Questions about a residence, listing your property, or a site visit: call or WhatsApp our
        Multan team.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="space-y-3">
          {channels.map(({ icon: Icon, label, value, href, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex items-center gap-4 rounded-2xl border border-forest/10 bg-white p-5 transition hover:border-gold/60"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest/[0.06] text-forest">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                <span className="block truncate text-lg font-medium text-forest">{value}</span>
              </span>
            </a>
          ))}

          <div className="flex items-start gap-4 rounded-2xl border border-forest/10 bg-white p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest/[0.06] text-forest">
              <MapPin className="h-5 w-5" aria-hidden />
            </span>
            <address className="not-italic">
              <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">Office</span>
              {SITE_OFFICE_ADDRESS_LINES.map((line) => (
                <span key={line} className="block font-medium text-forest">
                  {line}
                </span>
              ))}
              <a
                href={DIRECTIONS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-gold-700 underline-offset-2 hover:underline"
              >
                Get directions
              </a>
            </address>
          </div>
        </div>

        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-forest/10 bg-cream lg:aspect-auto lg:min-h-[22rem]">
          <iframe
            title="Bharwana Estates office on Google Maps"
            src={MAP_EMBED_SRC}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
