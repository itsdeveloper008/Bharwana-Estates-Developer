import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { absoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Call, WhatsApp, or message Bharwana Estates in Multan. Visit our office in Buch Villas Phase 2.",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
