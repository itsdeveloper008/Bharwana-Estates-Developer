import { TeamProfile } from "@/components/team/team-pages";
import { teamMembers } from "@/lib/mock-data/team";

export function generateStaticParams() {
  return teamMembers.map((member) => ({ id: member.id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const member = teamMembers.find((item) => item.id === params.id);
  return {
    title: member ? `${member.fullName} · Team` : "Team member",
    description: member?.bio,
  };
}

export default async function TeamMemberPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <TeamProfile memberId={params.id} />;
}
