import { TeamProfile } from "@/components/team/team-pages";
import { teamMembers } from "@/lib/mock-data/team";

export function generateStaticParams() {
  return teamMembers.map((member) => ({ id: member.id }));
}

export function generateMetadata({ params }: { params: { id: string } }) {
  const member = teamMembers.find((item) => item.id === params.id);
  return {
    title: member ? `${member.fullName} · Team` : "Team member",
    description: member?.bio,
  };
}

export default function TeamMemberPage({ params }: { params: { id: string } }) {
  return <TeamProfile memberId={params.id} />;
}
