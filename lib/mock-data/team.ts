// TODO: Replace placeholder bios/emails when final copy is provided.
// Photos live in /public/team — TeamGrid/TeamMemberCard need no code changes for new members.

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  bio: string;
  photoUrl: string;
  linkedinUrl?: string;
  email?: string;
}

export interface CompanyStat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
}

/** Real leadership & studio team — edit this array to update Admin + About. */
export const teamMembers: TeamMember[] = [
  {
    id: "team-falak",
    fullName: "Falak Sher",
    role: "Chief Executive Officer",
    bio: "Leads Bharwana Estates Developer with a clear eye for lasting homes and honest dealings — every address introduced with the gravity it deserves.",
    photoUrl: "/team/falak-sher.jpeg",
    email: "falak@bharwana.example",
  },
  {
    id: "team-talal",
    fullName: "Talal Mirza",
    role: "Managing Director",
    bio: "Steers day-to-day operations and partnerships so buyers and owners meet on equal, well-prepared ground.",
    photoUrl: "/team/talal-mirza.jpeg",
    email: "talal@bharwana.example",
  },
  {
    id: "team-abdulrehman",
    fullName: "Abdulrehman Azhar",
    role: "Architect / Interior Designer",
    bio: "Shapes space, light, and finish — bringing architectural clarity to how each residence is seen and understood.",
    photoUrl: "/team/abdulrehman-azhar.jpg",
    email: "abdulrehman@bharwana.example",
  },
  {
    id: "team-asfand",
    fullName: "Asfand Qurnain Ambiya",
    role: "Video Editor",
    bio: "Crafts the visual stories of our properties — quiet, cinematic frames that let the home speak first.",
    photoUrl: "/team/asfand-ambiya.jpg",
    email: "asfand@bharwana.example",
  },
];

/** Placeholder stats — replace values when real figures are available. */
export const companyStats: CompanyStat[] = [
  {
    id: "stat-listings",
    label: "Properties Listed",
    value: 120,
    suffix: "+",
  },
  {
    id: "stat-clients",
    label: "Happy Clients",
    value: 85,
    suffix: "+",
  },
  {
    id: "stat-years",
    label: "Years of Trust",
    value: 8,
    suffix: "+",
  },
];
