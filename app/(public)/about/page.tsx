import { AboutCTA } from "@/components/about/AboutCTA";
import { AboutHero } from "@/components/about/AboutHero";
import { HowItWorks } from "@/components/about/HowItWorks";
import { OurStory } from "@/components/about/OurStory";
import { TeamGrid } from "@/components/about/TeamGrid";
import { TrustAffiliation } from "@/components/about/TrustAffiliation";
import { ValuesGrid } from "@/components/about/ValuesGrid";

export const metadata = {
  title: "About Us",
  description:
    "The story, values, and people behind Bharwana Estates Dealer, private homes and Dealer-verified residences.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <OurStory />
      <HowItWorks />
      <ValuesGrid />
      <TrustAffiliation />
      <TeamGrid />
      <AboutCTA />
    </>
  );
}
