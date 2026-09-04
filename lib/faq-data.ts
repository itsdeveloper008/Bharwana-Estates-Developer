export type FaqCategory = {
  id: string;
  title: string;
  items: { id: string; question: string; answer: string }[];
};

export const faqCategories: FaqCategory[] = [
  {
    id: "buyers",
    title: "For Buyers",
    items: [
      {
        id: "buyer-direct-vs-dealer",
        question: "What's the difference between Direct from Owner and Dealer Verified?",
        answer:
          "Direct from Owner listings are placed by the homeowner without a dealer intermediary. Dealer Verified listings are submitted by registered dealers and reviewed by Bharwana before publication. Both appear in the collection; the badge tells you who stands behind the introduction.",
      },
      {
        id: "buyer-platform-assisted",
        question: "What happens when I choose 'Buy Through Bharwana'?",
        answer:
          "You submit your contact details and preferred visit time through our inquiry form. Bharwana records the lead, a sales representative may follow up, and we help coordinate the introduction while keeping a clear record of the conversation.",
      },
      {
        id: "buyer-direct-contact",
        question: "Is Bharwana involved if I contact a seller directly?",
        answer:
          "If you choose direct contact on an owner listing, we reveal the seller's details to you and note that the conversation happens outside Bharwana mediation. We do not assign a sales rep or track that path as a platform-assisted lead.",
      },
      {
        id: "buyer-verification",
        question: "How do I know a listing has been verified?",
        answer:
          "Every public listing passes through Bharwana review before it is published. Dealer listings also require an active dealer account. Status badges on each residence show whether it is direct from the owner or dealer verified.",
      },
    ],
  },
  {
    id: "sellers",
    title: "For Sellers",
    items: [
      {
        id: "seller-review-time",
        question: "How long does listing review take?",
        answer:
          "Submissions enter a pending queue for admin review. Timing depends on volume and completeness of the submission, but most listings are approved or returned with feedback within a few business days once photos, location, and pricing are in order.",
      },
      {
        id: "seller-account",
        question: "Do I need an account to submit a property?",
        answer:
          "Yes. Sign in or create an account before you open Add Property — the listing form is only available to authenticated sellers. An account lets us attach the submission to you, notify you of approval or rejection, and keep your inventory in one place.",
      },
      {
        id: "seller-rejection",
        question: "What happens if my listing is rejected?",
        answer:
          "Rejected listings remain on your dashboard with an optional reason from our team. You can correct the issue and resubmit, or delete the draft entirely. Rejection does not remove your account.",
      },
      {
        id: "seller-fees",
        question: "Is there a fee to list my property?",
        answer:
          "House owners can list directly without a listing fee in the current release. Dealer listings operate under the dealer commission model agreed at registration. Bharwana does not charge buyers to browse the collection.",
      },
    ],
  },
  {
    id: "dealers",
    title: "For Dealers",
    items: [
      {
        id: "dealer-commission",
        question: "How does commission work?",
        answer:
          "Registered dealers carry an agreed commission rate on verified inventory. When a transaction closes through a Bharwana-tracked inquiry, the rate snapshotted at close applies. Your dealer dashboard shows pending and settled commission entries.",
      },
      {
        id: "dealer-register",
        question: "How do I register as a Dealer?",
        answer:
          "Choose Dealer during account registration and provide your agency details. New dealer accounts enter a pending review state until Bharwana approves the profile. You can prepare listings while pending, but publication may wait on account approval.",
      },
      {
        id: "dealer-payment",
        question: "When do I get paid?",
        answer:
          "Commission moves through pending, invoiced, and paid states in the admin commissions panel. Payout timing follows the agreement recorded when your dealer profile was activated.",
      },
    ],
  },
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "general-cities",
        question: "Which cities does Bharwana cover?",
        answer:
          "The collection currently focuses on prime addresses across Pakistan's major cities, with Lahore, Karachi, and Islamabad strongly represented in the catalog. New cities are added as verified inventory is introduced.",
      },
      {
        id: "general-support",
        question: "How do I contact support?",
        answer:
          "Use the phone number in the site header, submit an inquiry on any residence, or write to us through the contact channels listed in the footer. For listing or account issues, sign in so we can locate your submission quickly.",
      },
      {
        id: "general-privacy",
        question: "Is my information kept private?",
        answer:
          "Inquiry details are stored securely and used only to facilitate introductions. We do not publish buyer contact information on listings. Review our Privacy Policy for full detail on data handling.",
      },
    ],
  },
];

export const faqTeaserIds = [
  "buyer-direct-vs-dealer",
  "buyer-platform-assisted",
  "seller-review-time",
  "general-cities",
] as const;
