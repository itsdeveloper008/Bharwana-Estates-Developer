"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContactMessage } from "@/lib/contact";
import {
  SITE_EMAIL,
  SITE_OFFICE_ADDRESS,
  SITE_OFFICE_ADDRESS_LINES,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_E164,
} from "@/lib/site-contact";

const WHATSAPP_HREF = `https://wa.me/${SITE_PHONE_E164.replace(/^\+/, "")}?text=${encodeURIComponent(
  "Hi Bharwana Estates, I'd like to get in touch.",
)}`;
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(SITE_OFFICE_ADDRESS)}&output=embed`;
const DIRECTIONS_HREF = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SITE_OFFICE_ADDRESS)}`;

const channels = [
  { icon: Phone, label: "Call", value: SITE_PHONE_DISPLAY, href: `tel:${SITE_PHONE_E164}` },
  { icon: MessageCircle, label: "WhatsApp", value: SITE_PHONE_DISPLAY, href: WHATSAPP_HREF, external: true },
  { icon: Mail, label: "Email", value: SITE_EMAIL, href: `mailto:${SITE_EMAIL}` },
];

export function ContactPageContent() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Honeypot: real visitors never see or fill this field.
    if (String(form.get("company") ?? "")) return;

    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (message.length < 5) return setError("Tell us a little about what you need.");

    setError(null);
    setSending(true);
    try {
      await createContactMessage({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email,
        message,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message. Try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="type-eyebrow">Contact</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Talk to the estate desk.</h1>
      <p className="type-subheading max-w-2xl">
        Questions about a residence, listing your property, or a site visit: call, WhatsApp, or send
        a message and our Multan team will get back to you.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        <div className="space-y-8">
          <ul className="space-y-3">
            {channels.map(({ icon: Icon, label, value, href, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-4 rounded-2xl border border-forest/10 bg-white p-4 transition hover:border-gold/60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/[0.06] text-forest">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                    <span className="block truncate font-medium text-forest">{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-forest/10 bg-white p-4">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/[0.06] text-forest">
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
            <div className="mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-cream">
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

        <div className="self-start rounded-2xl border border-forest/10 bg-white p-5 sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-forest" aria-hidden />
              <h2 className="mt-4 font-serif text-2xl text-forest">Message received</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Thank you. Our team will reply by email or phone soon. For anything urgent, call{" "}
                <a href={`tel:${SITE_PHONE_E164}`} className="text-forest underline-offset-2 hover:underline">
                  {SITE_PHONE_DISPLAY}
                </a>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <h2 className="font-serif text-2xl text-forest">Send a message</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Full name</Label>
                  <Input id="contact-name" name="name" autoComplete="name" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input id="contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder="03XX XXXXXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email *</Label>
                <Input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea id="contact-message" name="message" required rows={6} maxLength={2000} placeholder="What can we help you with?" />
              </div>
              <div className="hidden" aria-hidden>
                <label htmlFor="contact-company">Company</label>
                <input id="contact-company" name="company" tabIndex={-1} autoComplete="off" />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={sending}>
                {sending ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
