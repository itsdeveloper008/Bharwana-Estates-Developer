import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Cookie Policy",
  description: "How Bharwana Estates Dealer uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie Policy"
      intro="This policy explains how Bharwana Estates Dealer uses cookies and similar technologies when you visit our website."
      updated="28 August 2026"
      sections={[
        {
          title: "What are cookies?",
          paragraphs: [
            "Cookies are small text files stored on your device when you visit a website. They help the site remember preferences, keep you signed in, and understand how pages are used.",
          ],
        },
        {
          title: "Cookies we use",
          paragraphs: ["We may use the following types of cookies:"],
          list: [
            "Essential cookies — required for security, authentication, and core site functionality",
            "Preference cookies — remember settings such as session state",
            "Analytics cookies — help us understand traffic and improve the experience",
            "Third-party cookies — set by integrated services such as maps or authentication providers",
          ],
        },
        {
          title: "Managing cookies",
          paragraphs: [
            "You can control or delete cookies through your browser settings. Disabling essential cookies may affect sign-in, listings, and other features that depend on session storage.",
          ],
        },
        {
          title: "Updates",
          paragraphs: [
            "We may revise this policy as our services evolve. Material changes will be reflected on this page with an updated date.",
          ],
        },
      ]}
    />
  );
}
