import { LegalPage } from "@/components/legal/legal-page";

export const metadata = {
  title: "Account & Data Deletion",
  description:
    "How to delete your Bharwana Estates account and what data we retain, for how long.",
};

export default function DeletionPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Account & Data Deletion"
      intro="If you no longer wish to use Bharwana Estates, you can delete your account and ask us to remove personal data tied to it. This page explains what we store, how deletion works, and what we keep for a limited time for legal or financial reasons."
      updated="4 September 2026"
      sections={[
        {
          title: "Data we hold by account type",
          paragraphs: [
            "What we store depends on how you use the platform. In all cases we keep the basics needed to run your account: name, email, and phone number.",
          ],
          list: [
            "Buyers: saved residences, inquiry history, and contact details used when you ask about a home.",
            "House owners: listing submissions, property photos and details you provide, and the status of each submission.",
            "Dealers: agency details, listings linked to your dealer profile, and commission or transaction records for closed sales.",
          ],
        },
        {
          title: "How to delete your account",
          paragraphs: [
            "The fastest path is self-service, while you are signed in:",
          ],
          list: [
            "Open your account menu and go to Account Settings.",
            "Choose Delete Account and read the confirmation carefully.",
            "Type your registered email address to confirm, then confirm deletion.",
            "We remove your profile and owned personal data, delete your sign-in account, and sign you out. You will return to the homepage with a short confirmation.",
          ],
        },
        {
          title: "If self-service is unavailable",
          paragraphs: [
            "If you cannot complete deletion in the app (for example after a long time away, or if re-authentication fails), email info@bharwanaestate.com from your registered address and ask for account deletion. You may also submit a deletion request from Account Settings; our team reviews pending requests in Admin.",
            "We aim to complete deletion requests within 30 days of a verified request.",
          ],
        },
        {
          title: "What is deleted vs what we may retain",
          paragraphs: [
            "When your account is deleted we remove your user profile, saved residences, and inquiry history where you are the buyer. Listings you own are removed from the live marketplace.",
            "Some records are retained for a limited window rather than wiped immediately:",
          ],
          list: [
            "Dealer commission and transaction records tied to completed sales are kept for accounting. They are marked as belonging to a deleted dealer account and are not shown as an active dealer profile. We retain these for up to 7 years where needed for financial record-keeping, then remove or anonymise them.",
            "We do not keep your password or sign-in credentials after the Auth account is deleted.",
          ],
        },
        {
          title: "Operational data retention (stale records)",
          paragraphs: [
            "Separately from account deletion, we clear low-value operational clutter on a schedule enforced by Admin cleanup (and by scheduled Cloud Functions once that infrastructure is enabled):",
          ],
          list: [
            "Rejected property submissions: removed after 90 days if not resubmitted or otherwise actioned.",
            "Closed-lost inquiries: removed after 180 days.",
            "New inquiries with no status change for 60 days: flagged for Admin attention (not auto-deleted).",
            "Dealer accounts still pending review after 30 days: flagged for Admin follow-up (not auto-deleted).",
            "Published listings, paid or invoiced commission records, and active account-holder data are never auto-deleted without an explicit deletion request.",
          ],
        },
        {
          title: "Questions",
          paragraphs: [
            "For deletion-related questions, contact info@bharwanaestate.com. Include the email address on your account so we can verify the request.",
          ],
        },
      ]}
    />
  );
}
