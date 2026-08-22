"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createNewsletterSignup } from "@/lib/firestore/inquiries";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const footerLinks = [
  { href: "/properties", label: "Residences" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/login?returnTo=%2Fowner%2Fadd-property", label: "List a property" },
  { href: "/login", label: "Sign in" },
];

function SocialIcon({ name }: { name: "linkedin" | "instagram" | "facebook" }) {
  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V23h-4V8.5z" />
      </svg>
    );
  }
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3.1l.9-4H13V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

const socials = [
  { href: "https://www.linkedin.com/company/bharwana-estates-developer/", label: "LinkedIn", name: "linkedin" as const },
  { href: "https://www.instagram.com/bharwanaestates", label: "Instagram", name: "instagram" as const },
  { href: "https://www.facebook.com/share/1Hnf1jSJ7q/?mibextid=wwXIfr", label: "Facebook", name: "facebook" as const },
];

export function Footer() {
  const [email, setEmail] = useState("");

  async function onSubscribe(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    try {
      if (isFirebaseConfigured()) {
        // TODO: Configure Firestore security rules before production.
        await createNewsletterSignup(value);
      }
      toast.success("You are on the list for new listings.");
      setEmail("");
    } catch (error) {
      console.error(error);
      toast.error("Could not save signup. Check Firebase config.");
    }
  }

  return (
    <footer className="bg-forest text-ivory">
      <div className="h-10 bg-gradient-to-b from-[#0c2418] to-forest sm:h-14" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-6 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_0.85fr_1.1fr_1fr] lg:gap-10">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Bharwana" width={48} height={48} className="h-12 w-12 object-contain" />
            <div>
              <p className="font-display text-sm tracking-crest">BHARWANA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Estates Dealer</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">
            Private homes and Dealer-verified residences, presented with the same care as the buildings
            themselves. Part of{" "}
            <a
              href="https://bharwanaestates.com/"
              target="_blank"
              rel="noreferrer"
              className="text-gold underline-offset-2 hover:underline"
            >
              Bharwana Estate Group
            </a>
            .
          </p>
          <div className="mt-6 flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center border border-gold/30 text-gold transition-colors hover:border-gold hover:bg-gold/10"
              >
                <SocialIcon name={social.name} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block transition-all hover:translate-x-0.5 hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Address</p>
          <p className="mt-4 text-sm leading-relaxed text-ivory/80">
            Office No. 42, First Floor
            <br />
            Main Boulevard, Buch Executive Villas
            <br />
            Bosan Road, Multan
          </p>
          <a
            href="tel:+923001713811"
            className="mt-4 block text-sm text-ivory/80 transition-colors hover:text-gold"
          >
            +92 300 1713811
          </a>
          <a
            href="mailto:info@bharwanaestate.com"
            className="mt-1 block text-sm text-ivory/80 transition-colors hover:text-gold"
          >
            info@bharwanaestate.com
          </a>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Updates</p>
          <p className="mt-4 text-sm text-ivory/70">Stay informed on new listings.</p>
          <form onSubmit={onSubscribe} className="mt-4 flex gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              className="h-10 border-ivory/20 bg-forest-800 text-ivory placeholder:text-ivory/40"
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0" aria-label="Subscribe">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[11px] uppercase tracking-[0.16em] text-ivory/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Bharwana Estates Dealer</p>
        <div className="flex gap-5">
          <span className="cursor-default hover:text-ivory/70">Privacy</span>
          <span className="cursor-default hover:text-ivory/70">Terms</span>
        </div>
      </div>
    </footer>
  );
}
