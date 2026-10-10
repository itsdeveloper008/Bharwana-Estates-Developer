"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createNewsletterSignup } from "@/lib/firestore/inquiries";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  SITE_EMAIL,
  SITE_OFFICE_ADDRESS_LINES,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_E164,
  SITE_SOCIAL,
} from "@/lib/site-contact";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/team", label: "Team" },
  { href: "/owner/add-property", label: "List your property" },
  { href: "/login", label: "Sign in" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/deletion-policy", label: "Data Deletion" },
];

type SocialName = "facebook" | "instagram" | "youtube" | "tiktok" | "linkedin";

const socials: {
  href: string;
  label: string;
  name: SocialName;
  className: string;
}[] = [
  {
    href: SITE_SOCIAL.facebook,
    label: "Facebook",
    name: "facebook",
    className: "bg-[#1877F2]",
  },
  {
    href: SITE_SOCIAL.instagram,
    label: "Instagram",
    name: "instagram",
    className: "bg-[linear-gradient(45deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)]",
  },
  {
    href: SITE_SOCIAL.youtube,
    label: "YouTube",
    name: "youtube",
    className: "bg-[#FF0000]",
  },
  {
    href: SITE_SOCIAL.tiktok,
    label: "TikTok",
    name: "tiktok",
    className: "bg-[#010101]",
  },
  {
    href: SITE_SOCIAL.linkedin,
    label: "LinkedIn",
    name: "linkedin",
    className: "bg-[#0A66C2]",
  },
];

function SocialIcon({ name }: { name: SocialName }) {
  if (name === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-white" aria-hidden>
        <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3.1l.9-4H13V9c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-none stroke-white" strokeWidth="1.75" aria-hidden>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.75" />
        <circle cx="17.25" cy="6.75" r="0.9" fill="white" stroke="none" />
      </svg>
    );
  }
  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-white" aria-hidden>
        <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8zM9.75 15.02V8.98L15.8 12l-6.05 3.02z" />
      </svg>
    );
  }
  if (name === "tiktok") {
    const note =
      "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.34 6.34 6.34 0 0 0 9.49 21.7a6.34 6.34 0 0 0 6.34-6.34V8.4a8.2 8.2 0 0 0 4.76 1.51V6.46a4.85 4.85 0 0 1-1-.77z";
    return (
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden>
        <path fill="#25F4EE" d={note} transform="translate(-0.7 0.4)" />
        <path fill="#FE2C55" d={note} transform="translate(0.7 -0.4)" />
        <path fill="white" d={note} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px] fill-white" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V23h-4V8.5z" />
    </svg>
  );
}
const ease = [0.22, 1, 0.36, 1] as const;

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-[15px] text-white transition-all duration-300 hover:translate-x-1 hover:text-[#C2A35A]"
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubscribe(event: React.FormEvent) {
    event.preventDefault();
    const value = email.trim();
    setSuccessMessage(null);

    if (!value) {
      setFormError("Enter your email address.");
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (submitting) return;

    setFormError(null);
    setSubmitting(true);
    try {
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured");
      }
      await createNewsletterSignup(value);
      setEmail("");
      setSuccessMessage("You’re on the list for new listings.");
      toast.success("You’re on the list for new listings.");
    } catch (error) {
      console.error(error);
      setFormError("Could not save signup. Please try again.");
      toast.error("Could not save signup. Please try again.");
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

            <form onSubmit={onSubscribe} className="mt-8" noValidate>
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex items-end gap-3 border-b border-[rgba(194,163,90,0.28)] pb-1 transition-colors focus-within:border-[#C2A35A]">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (formError) setFormError(null);
                    if (successMessage) setSuccessMessage(null);
                  }}
                  placeholder="Your email address"
                  className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-[#F4F0E6] caret-[#C2A35A] outline-none placeholder:text-[15px] placeholder:text-[#F4F0E6]/45 [&:-webkit-autofill]:[-webkit-text-fill-color:#F4F0E6] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]"
                  autoComplete="email"
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? "footer-email-error" : successMessage ? "footer-email-success" : undefined}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  aria-label="Subscribe to updates"
                  className="group mb-1 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[#C2A35A] text-[#06291C] transition-colors duration-300 hover:bg-[#d0b36a] disabled:opacity-60"
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
              {formError ? (
                <p id="footer-email-error" className="mt-3 text-[13px] text-[#E8B4B4]" role="alert">
                  {formError}
                </p>
              ) : successMessage ? (
                <p id="footer-email-success" className="mt-3 text-[13px] text-[#C2A35A]" role="status">
                  {successMessage}
                </p>
              ) : null}
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Company</p>
            <ul className="mt-5 space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Legal</p>
            <ul className="mt-5 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Contact</p>
            <address className="mt-5 not-italic text-[15px] leading-[1.75] text-white">
              {SITE_OFFICE_ADDRESS_LINES[0]}
              <br />
              {SITE_OFFICE_ADDRESS_LINES[1]}
            </address>
            <a
              href={`tel:${SITE_PHONE_E164}`}
              className="mt-5 block text-[15px] text-white transition-colors duration-300 hover:text-[#C2A35A]"
            >
              {SITE_PHONE_DISPLAY}
            </a>
            <a
              href={`mailto:${SITE_EMAIL}`}
              className="mt-1 block text-[15px] text-white transition-colors duration-300 hover:text-[#C2A35A]"
            >
              {SITE_EMAIL}
            </a>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Follow</p>
            <ul className="mt-5 flex flex-wrap items-center gap-3">
              {socials.map((social) => {
                const ready = Boolean(social.href);
                const className = cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 hover:-translate-y-0.5",
                  social.className,
                  !ready && "cursor-default opacity-90",
                );
                if (!ready) {
                  return (
                    <li key={social.label}>
                      <span
                        role="img"
                        aria-label={`${social.label} (link coming soon)`}
                        title={`${social.label} — link coming soon`}
                        className={className}
                      >
                        <SocialIcon name={social.name} />
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className={className}
                    >
                      <SocialIcon name={social.name} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>

        {/* Legal bar */}
        <div className="mt-16 flex flex-col gap-5 border-t border-[rgba(194,163,90,0.2)] pt-6 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white">
            © {new Date().getFullYear()} Bharwana Estates
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] uppercase tracking-[0.16em] text-white transition-colors duration-300 hover:text-[#C2A35A]"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={scrollTop}
              className="group inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:text-[#C2A35A]"
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
