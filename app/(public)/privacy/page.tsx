import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Privacy Policy",
  description: "How Bharwana Estates Dealer collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Bharwana Estates Dealer respects your privacy. This policy explains what information we collect when you use our website, how we use it, and the choices available to you."
      updated="28 August 2026"
      sections={[
        {
          title: "Information we collect",
          paragraphs: [
            "We may collect information you provide directly, such as your name, email address, phone number, and property details when you register, submit a listing, make an inquiry, or subscribe to updates.",
            "We also collect technical information automatically, including device type, browser, IP address, and pages visited, to keep the platform secure and improve performance.",
          ],
        },
        {
          title: "How we use your information",
          paragraphs: ["We use personal information to:"],
          list: [
            "Present and manage property listings and inquiries",
            "Communicate with you about viewings, submissions, and account activity",
            "Operate authentication, security, and platform functionality",
            "Send estate updates when you have opted in",
            "Comply with applicable law and respond to lawful requests",
          ],
        },
        {
          title: "Sharing and disclosure",
          paragraphs: [
            "We do not sell your personal information. We may share information with service providers who help us operate the platform (such as hosting, authentication, and storage), with property owners or buyers when you choose to inquire, and when required by law.",
            "When you select Direct-to-Seller engagement, your contact details may be shared with the relevant party outside Bharwana mediation, as described at the point of inquiry.",
          ],
        },
        {
          title: "Data retention and security",
          paragraphs: [
            "We retain information for as long as needed to provide our services, meet legal obligations, and resolve disputes. We apply reasonable technical and organisational measures to protect your data, though no online service can guarantee absolute security.",
          ],
        },
        {
          title: "Your rights",
          paragraphs: [
            "Depending on applicable law, you may request access to, correction of, or deletion of your personal information, or withdraw consent for marketing communications. Contact us at info@bharwanaestate.com to make a request.",
          ],
        },
      ]}
    />
  );
}
