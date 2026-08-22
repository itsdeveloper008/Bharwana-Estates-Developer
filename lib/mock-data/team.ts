// TODO: Replace placeholder emails/phones/LinkedIn when final details are provided.
// Photos live in /public/team, edit this file (or Admin) to update profiles sitewide.

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  /** Short line for cards */
  bio: string;
  photoUrl: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  location?: string;
  department?: string;
  yearsExperience?: number;
  quote?: string;
  /** Full profile narrative */
  about: string;
  expertise: string[];
  responsibilities: string[];
  highlights: string[];
}

export interface CompanyStat {
  id: string;
  label: string;
  value: number;
  suffix?: string;
}

/** Real leadership & studio team, shared by About, /team, Admin, Firestore seed. */
export const teamMembers: TeamMember[] = [
  {
    id: "team-falak",
    fullName: "Falak Sher",
    role: "Chief Executive Officer",
    department: "Leadership",
    location: "Lahore, Pakistan",
    yearsExperience: 12,
    bio: "Leads Bharwana Estates Dealer with a clear eye for lasting homes and honest dealings.",
    about:
      "Falak Sher is the Chief Executive Officer of Bharwana Estates Dealer. He sets the tone for how every residence is introduced, with clarity, discretion, and respect for the family behind the address. Under his leadership the firm has grown as a single floor for both direct-owner homes and Dealer-verified stock, so buyers never have to choose between honesty and presentation.\n\nHe focuses on long-term trust over short-term volume: careful documentation, measured site visits, and a sales culture that moves at the pace of a viewing rather than a funnel. Clients know him for calm counsel and for insisting that every listing earns its place on the floor.",
    quote: "A house deserves a careful introduction, never a hurried pitch.",
    photoUrl: "/team/falak-sher-cutout.png",
    email: "falak@bharwana.example",
    phone: "+92 300 000 1001",
    expertise: [
      "Strategic leadership",
      "Residential acquisitions",
      "Owner & Dealer partnerships",
      "Brand stewardship",
    ],
    responsibilities: [
      "Set company vision and quality standards for every listing",
      "Oversee major negotiations and high-value introductions",
      "Guide partnerships with verified Dealers",
      "Protect the Bharwana name across markets",
    ],
    highlights: [
      "Founding executive of Bharwana Estates Dealer",
      "Built the dual-floor model: Direct Owner + Dealer Verified",
      "Known for quiet, premium presentation of residences",
    ],
  },
  {
    id: "team-talal",
    fullName: "Talal Mirza",
    role: "Managing Director",
    department: "Operations",
    location: "Lahore, Pakistan",
    yearsExperience: 10,
    bio: "Steers day-to-day operations and partnerships so buyers and owners meet on equal ground.",
    about:
      "Talal Mirza is Managing Director at Bharwana Estates Dealer. He turns strategy into a working floor, coordinating listings, sales stewardship, and the operational detail that keeps introductions precise.\n\nFrom possession checks to handover timelines, Talal keeps owners, buyers, and internal teams aligned. He is the person who makes sure a site visit is prepared, a file is complete, and a conversation ends with a clear next step.",
    quote: "Equal footing between buyer and owner is not a slogan, it is an operating standard.",
    photoUrl: "/team/talal-mirza-cutout.png",
    email: "talal@bharwana.example",
    phone: "+92 300 000 1002",
    expertise: [
      "Operations management",
      "Sales pipeline oversight",
      "Dealer relations",
      "Process & compliance",
    ],
    responsibilities: [
      "Run day-to-day marketplace and studio operations",
      "Coordinate sales reps and inquiry follow-through",
      "Maintain listing readiness and documentation standards",
      "Strengthen partnerships with project Dealers",
    ],
    highlights: [
      "Owns operational rhythm across Lahore and satellite markets",
      "Bridges leadership vision with sales-floor execution",
      "Champions transparent timelines for buyers and sellers",
    ],
  },
  {
    id: "team-abdulrehman",
    fullName: "Abdulrehman Azhar",
    role: "Architect / Interior Designer",
    department: "Design Studio",
    location: "Lahore, Pakistan",
    yearsExperience: 8,
    bio: "Shapes space, light, and finish, bringing architectural clarity to every residence.",
    about:
      "Abdulrehman Azhar is the Architect and Interior Designer for Bharwana Estates Dealer. He reads a home the way a buyer will live in it, light, proportion, material, and how rooms open into one another.\n\nHis work informs how we photograph, describe, and advise on residences. Whether refining a presentation package or advising on finish quality, he brings a designer’s eye so the floor stays as considered as the buildings themselves.",
    quote: "Space should feel inevitable, light, proportion, and finish in quiet agreement.",
    photoUrl: "/team/abdulrehman-azhar-cutout.png",
    email: "abdulrehman@bharwana.example",
    phone: "+92 300 000 1003",
    expertise: [
      "Residential architecture",
      "Interior design",
      "Spatial planning",
      "Material & finish guidance",
    ],
    responsibilities: [
      "Advise on spatial quality and presentation of listings",
      "Support photography and brochure direction",
      "Review finish and layout notes for buyers",
      "Collaborate with owners on design-led improvements",
    ],
    highlights: [
      "Design lead for how Bharwana residences are seen and understood",
      "Bridges architectural detail with marketplace storytelling",
      "Guides interior clarity for high-end homes",
    ],
  },
  {
    id: "team-asfand",
    fullName: "Asfand Qurnain Ambiya",
    role: "Video Editor",
    department: "Creative Media",
    location: "Lahore, Pakistan",
    yearsExperience: 6,
    bio: "Crafts the visual stories of our properties, quiet, cinematic frames that let the home speak.",
    about:
      "Asfand Qurnain Ambiya is Video Editor at Bharwana Estates Dealer. He shapes walkthroughs and brand films so a residence is felt before it is visited, pacing, light, and silence as much as spectacle.\n\nHis edits favour atmosphere over noise: doors opening, garden light, the weight of a hall. The goal is simple, when a buyer presses play, they should already understand the character of the home.",
    quote: "A home should be felt on screen before it is walked in person.",
    photoUrl: "/team/asfand-ambiya-cutout.png",
    email: "asfand@bharwana.example",
    phone: "+92 300 000 1004",
    expertise: [
      "Property cinematography editing",
      "Brand film pacing",
      "Colour & atmosphere",
      "Walkthrough storytelling",
    ],
    responsibilities: [
      "Edit residence walkthroughs and listing films",
      "Maintain visual tone aligned with the Bharwana brand",
      "Collaborate with photography and design on sequences",
      "Deliver media ready for web, social, and client decks",
    ],
    highlights: [
      "Defines the cinematic voice of Bharwana listings",
      "Specialises in calm, premium property storytelling",
      "Supports launch films for featured residences",
    ],
  },
];

export const companyStats: CompanyStat[] = [
  { id: "stat-listings", label: "Properties Listed", value: 120, suffix: "+" },
  { id: "stat-clients", label: "Happy Clients", value: 85, suffix: "+" },
  { id: "stat-years", label: "Years of Trust", value: 8, suffix: "+" },
];
