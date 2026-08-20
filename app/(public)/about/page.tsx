import { AboutCTA } from "@/components/about/AboutCTA";
import { AboutHero } from "@/components/about/AboutHero";
import { OurStory } from "@/components/about/OurStory";
import { TeamGrid } from "@/components/about/TeamGrid";
import { ValuesGrid } from "@/components/about/ValuesGrid";

export const metadata = {
  title: "About Us",
  description:
    "The story, values, and people behind Bharwana Estates Developer — private homes and developer-verified residences.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <OurStory />
      <ValuesGrid />
      <TeamGrid />
      <AboutCTA />
    </>
  );
}
