import { SavedPropertiesPage } from "@/components/properties/saved-properties-page";

export const metadata = {
  title: "Saved Residences",
  description: "Your private shortlist of Bharwana residences.",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return <SavedPropertiesPage />;
}
