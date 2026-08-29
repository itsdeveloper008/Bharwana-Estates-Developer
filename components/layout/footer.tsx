"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createNewsletterSignup } from "@/lib/firestore/inquiries";
import { isFirebaseConfigured } from "@/lib/firebase/client";

const footerLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/team", label: "Team" },
  { href: "/owner/add-property", label: "List a property" },
  { href: "/login", label: "Sign in" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const socials = [
  {
    href: "https://www.linkedin.com/company/bharwana-estates-developer/",
    label: "LinkedIn",
    name: "linkedin" as const,
  },
  { href: "https://www.instagram.com/bharwanaestates", label: "Instagram", name: "instagram" as const },
  {
    href: "https://www.facebook.com/share/1Hnf1jSJ7q/?mibextid=wwXIfr",
    label: "Facebook",
    name: "facebook" as const,
  },
];

function SocialIcon({ name }: { name: "linkedin" | "instagram" | "facebook" }) {
  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
        <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V23h-4V8.5z" />
      </svg>
    );
  }
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3.1l.9-4H13V9c0-.6.4-1 1-1z" />
    </svg>
  );
}
const ease = [0.22, 1, 0.36, 1] as const;

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-[15px] text-[#F4F0E6]/75 transition-all duration-300 hover:translate-x-1 hover:text-[#C2A35A]"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className="translate-x-[-4px] text-[#C2A35A] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
      >
        →
      </span>
    </Link>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubscribe(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value || submitting) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="relative overflow-hidden bg-[#06291C] text-[#F4F0E6]">
      {/* Oversized crest watermark */}
      <Image
        src="/logo.png"
        alt=""
        width={720}
        height={720}
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-10 h-[18rem] w-[18rem] select-none object-contain opacity-[0.06] sm:-bottom-20 sm:right-0 sm:h-[24rem] sm:w-[24rem] lg:h-[28rem] lg:w-[28rem] lg:opacity-[0.07]"
      />

      <div className="relative mx-auto max-w-[1320px] px-[7vw] pb-8 pt-28 sm:pt-36 lg:px-16">
        {/* Brand statement + newsletter */}
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease }}
          >
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Bharwana Estates"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#C2A35A]">Bharwana Estates</p>
            </div>

            <h2 className="mt-8 max-w-[18ch] font-serif text-[2.65rem] leading-[1.08] tracking-tight text-[#F4F0E6] sm:text-6xl sm:leading-[1.05] lg:text-[4.25rem]">
              Homes, introduced with intention.
            </h2>

            <p className="mt-6 max-w-[22rem] text-[15px] leading-[1.7] text-[#F4F0E6]/65">
              Private homes and verified residences, presented with the care they deserve.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="lg:pb-2"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C2A35A]">Stay close</p>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-[#F4F0E6]/65">
              Receive new property listings and selected estate updates.
            </p>

            <form onSubmit={onSubscribe} className="mt-8">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex items-end gap-3 border-b border-[rgba(194,163,90,0.28)] pb-1 transition-colors focus-within:border-[#C2A35A]">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email address"
                  className="h-12 w-full bg-transparent text-[15px] text-[#F4F0E6] outline-none placeholder:text-[#F4F0E6]/35"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  aria-label="Subscribe to updates"
                  className="group mb-1 flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-[#C2A35A] text-[#06291C] transition-colors duration-300 hover:bg-[#d0b36a] disabled:opacity-60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-[3px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    aria-hidden
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Navigation + contact + social */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, delay: 0.08, ease }}
          className="mt-20 grid gap-12 border-t border-[rgba(194,163,90,0.2)] pt-14 sm:grid-cols-2 lg:mt-24 lg:grid-cols-4 lg:gap-12 lg:pt-16"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C2A35A]">Explore</p>
            <ul className="mt-5 space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C2A35A]">Legal</p>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C2A35A]">Contact</p>
            <address className="mt-5 not-italic text-[15px] leading-[1.75] text-[#F4F0E6]/75">
              Office No. 42, First Floor
              <br />
              Main Boulevard, Buch Executive Villas
              <br />
              Bosan Road, Multan
            </address>
            <a
              href="tel:+923001713811"
              className="mt-5 block text-[15px] text-[#F4F0E6]/75 transition-colors duration-300 hover:text-[#C2A35A]"
            >
              +92 300 1713811
            </a>
            <a
              href="mailto:info@bharwanaestate.com"
              className="mt-1 block text-[15px] text-[#F4F0E6]/75 transition-colors duration-300 hover:text-[#C2A35A]"
            >
              info@bharwanaestate.com
            </a>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#C2A35A]">Follow</p>
            <ul className="mt-5 flex items-center gap-5">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="inline-flex text-[#F4F0E6]/70 transition-all duration-300 hover:-translate-y-0.5 hover:text-[#C2A35A]"
                  >
                    <SocialIcon name={social.name} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-[16rem] text-[13px] leading-relaxed text-[#F4F0E6]/45">
              Part of{" "}
              <a
                href="https://bharwanaestates.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[#C2A35A]/80 underline-offset-2 hover:underline"
              >
                Bharwana Estate Group
              </a>
            </p>
          </div>
        </motion.div>

        {/* Legal bar */}
        <div className="mt-16 flex flex-col gap-5 border-t border-[rgba(194,163,90,0.2)] pt-6 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#F4F0E6]/45">
            © {new Date().getFullYear()} Bharwana Estates Dealer
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] uppercase tracking-[0.16em] text-[#F4F0E6]/45 transition-colors duration-300 hover:text-[#C2A35A]"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={scrollTop}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#F4F0E6]/45 transition-colors duration-300 hover:text-[#C2A35A]"
              aria-label="Back to top"
            >
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover:-translate-y-0.5"
              >
                ↑
              </span>
              Top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
