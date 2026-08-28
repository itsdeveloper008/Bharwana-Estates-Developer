import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Terms & Conditions",
  description: "Terms governing your use of Bharwana Estates Dealer and its property services.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="These terms govern access to and use of the Bharwana Estates Dealer website and related services. By using the platform, you agree to these terms."
      updated="28 August 2026"
      sections={[
        {
          title: "About the platform",
          paragraphs: [
            "Bharwana Estates Dealer is a real estate presentation platform for direct-from-owner residences and Dealer-verified stock. We facilitate introductions, listings, and inquiries but do not replace independent legal, financial, or technical due diligence.",
          ],
        },
        {
          title: "Accounts and eligibility",
          paragraphs: [
            "You must provide accurate information when creating an account or submitting a listing. You are responsible for maintaining the confidentiality of your login credentials and for activity under your account.",
            "Dealer accounts are subject to Bharwana's commission structure and verification requirements. Admin approval may apply before listings are published.",
          ],
        },
        {
          title: "Listings and content",
          paragraphs: [
            "Owners, dealers, and authorised representatives warrant that submitted property information is accurate to the best of their knowledge and that they have authority to list the property.",
            "Bharwana may review, edit presentation, reject, or remove listings that are incomplete, misleading, or inconsistent with platform standards.",
          ],
        },
        {
          title: "Inquiries and transactions",
          paragraphs: [
            "Platform-Assisted inquiries are handled with Bharwana stewardship. Direct-to-Seller inquiries connect parties directly; Bharwana does not mediate, verify, or take responsibility for those engagements.",
            "Any sale, lease, or transfer remains a private agreement between the parties. Bharwana is not a party to property transactions unless expressly agreed in writing.",
          ],
        },
        {
          title: "Acceptable use",
          paragraphs: ["You agree not to:"],
          list: [
            "Misrepresent property details, ownership, or pricing",
            "Harass users or submit unlawful, fraudulent, or abusive content",
            "Attempt to disrupt, scrape, or reverse engineer the platform",
            "Use the service in violation of applicable Pakistani law or regulations",
          ],
        },
        {
          title: "Limitation of liability",
          paragraphs: [
            "To the fullest extent permitted by law, Bharwana Estates Dealer is not liable for indirect, incidental, or consequential losses arising from use of the platform, property viewings, or third-party conduct. Our total liability is limited to the amount you paid us for the relevant service, if any, in the preceding twelve months.",
          ],
        },
        {
          title: "Changes and governing law",
          paragraphs: [
            "We may update these terms from time to time. Continued use after changes are posted constitutes acceptance. These terms are governed by the laws of Pakistan, subject to applicable local jurisdiction.",
          ],
        },
      ]}
    />
  );
}
