import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Disclaimer",
  description: "Important notices regarding property information and use of Bharwana Estates Dealer.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Disclaimer"
      intro="Please read this disclaimer carefully before relying on any property information or engaging through Bharwana Estates Dealer."
      updated="28 August 2026"
      sections={[
        {
          title: "Information accuracy",
          paragraphs: [
            "Property descriptions, photographs, measurements, pricing, and availability are supplied by owners, dealers, or their representatives. While we review submissions before publication, Bharwana does not guarantee that all information is complete, current, or free from error.",
            "Buyers and tenants should verify title documents, approvals, possession status, and physical condition independently before making decisions.",
          ],
        },
        {
          title: "No professional advice",
          paragraphs: [
            "Content on this website is for general information only. It does not constitute legal, tax, financial, architectural, or investment advice. You should consult qualified professionals before entering any transaction.",
          ],
        },
        {
          title: "Third-party listings and direct contact",
          paragraphs: [
            "Dealer-verified listings are presented under Bharwana's floor standards but remain the responsibility of the submitting dealer. Direct-to-Seller inquiries occur outside Bharwana mediation unless Platform-Assisted stewardship is selected.",
          ],
        },
        {
          title: "External links and tools",
          paragraphs: [
            "Maps, imagery, and third-party services linked from the site are provided for convenience. Bharwana is not responsible for the accuracy or policies of external providers.",
          ],
        },
        {
          title: "Availability",
          paragraphs: [
            "We aim to keep the platform available but do not warrant uninterrupted access. Maintenance, updates, or technical issues may temporarily affect service.",
          ],
        },
      ]}
    />
  );
}
