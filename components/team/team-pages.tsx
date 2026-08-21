"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/lib/mock-data/team";
import { useTeamStore } from "@/lib/team-store";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V23h-4V8.5z" />
    </svg>
  );
}

export function TeamProfile({ memberId }: { memberId: string }) {
  const { members } = useTeamStore();
  const member = members.find((item) => item.id === memberId);
  const others = members.filter((item) => item.id !== memberId).slice(0, 3);

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Team</p>
        <h1 className="mt-3 font-serif text-4xl">Profile not found</h1>
        <Button asChild className="mt-8">
          <Link href="/team">Back to the team</Link>
        </Button>
      </div>
    );
  }

  const paragraphs = member.about.split(/\n\n+/).filter(Boolean);

  return (
    <div className="bg-ivory">
      <section className="relative overflow-hidden bg-forest">
        <Image
          src="/logo.png"
          alt=""
          width={420}
          height={420}
          className="pointer-events-none absolute -right-20 top-10 h-72 w-72 object-contain opacity-[0.06]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-[3/4] overflow-hidden bg-forest-800"
          >
            <Image
              src={member.photoUrl}
              alt={member.fullName}
              fill
              priority
              className="object-contain object-bottom"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="flex flex-col justify-center text-ivory"
          >
            <Button asChild variant="ghost" className="mb-6 w-fit px-0 text-ivory/70 hover:bg-transparent hover:text-gold">
              <Link href="/team">
                <ArrowLeft className="h-4 w-4" />
                All team
              </Link>
            </Button>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">
              {member.department ?? "Team"}
            </p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl">{member.fullName}</h1>
            <div className="mt-5 h-px w-16 bg-gold/70" />
            <p className="mt-5 text-sm uppercase tracking-[0.2em] text-gold">{member.role}</p>
            {member.quote && (
              <p className="mt-8 max-w-xl font-serif text-2xl leading-snug text-ivory/90">
                “{member.quote}”
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ivory/70">
              {member.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gold" />
                  {member.location}
                </span>
              )}
              {typeof member.yearsExperience === "number" && (
                <span>{member.yearsExperience}+ years experience</span>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {member.email && (
                <Button asChild>
                  <a href={`mailto:${member.email}`}>
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </Button>
              )}
              {member.phone && (
                <Button
                  asChild
                  variant="outline"
                  className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory hover:text-forest"
                >
                  <a href={`tel:${member.phone.replace(/\s/g, "")}`}>
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                </Button>
              )}
              {member.linkedinUrl && member.linkedinUrl !== "#" && (
                <Button
                  asChild
                  variant="outline"
                  className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory hover:text-forest"
                >
                  <a href={member.linkedinUrl} target="_blank" rel="noreferrer">
                    <LinkedInIcon className="h-4 w-4" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">About</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">The full profile</h2>
            <div className="mt-4 h-px w-14 bg-gold/60" />
            <div className="mt-8 space-y-5 text-base leading-relaxed text-forest/80">
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>

            {member.highlights.length > 0 && (
              <div className="mt-12">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Highlights</p>
                <ul className="mt-5 space-y-3">
                  {member.highlights.map((item) => (
                    <li key={item} className="border-l-2 border-gold/50 pl-4 text-sm text-forest/80">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="border border-forest/10 bg-cream/40 p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gold-700">Contact</p>
              <dl className="mt-4 space-y-3 text-sm">
                {member.email && (
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd>
                      <a href={`mailto:${member.email}`} className="text-forest hover:text-gold-700">
                        {member.email}
                      </a>
                    </dd>
                  </div>
                )}
                {member.phone && (
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>{member.phone}</dd>
                  </div>
                )}
                {member.location && (
                  <div>
                    <dt className="text-muted-foreground">Based in</dt>
                    <dd>{member.location}</dd>
                  </div>
                )}
                {member.department && (
                  <div>
                    <dt className="text-muted-foreground">Department</dt>
                    <dd>{member.department}</dd>
                  </div>
                )}
              </dl>
            </div>

            {member.expertise.length > 0 && (
              <div className="border border-forest/10 bg-ivory p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold-700">Expertise</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {member.expertise.map((item) => (
                    <li
                      key={item}
                      className="border border-forest/10 bg-cream/50 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-forest"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {member.responsibilities.length > 0 && (
              <div className="border border-forest/10 bg-ivory p-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gold-700">
                  Responsibilities
                </p>
                <ul className="mt-4 space-y-3 text-sm text-forest/80">
                  {member.responsibilities.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      {others.length > 0 && (
        <section className="border-t border-forest/10 bg-cream/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Also on the floor</p>
            <h2 className="mt-2 font-serif text-3xl">More of the team</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {others.map((person) => (
                <Link
                  key={person.id}
                  href={`/team/${person.id}`}
                  className="group border border-forest/10 bg-ivory transition-colors hover:border-gold/40"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={person.photoUrl}
                      alt={person.fullName}
                      fill
                      className="object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="33vw"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-xl text-forest group-hover:text-gold-700">
                      {person.fullName}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gold-700">
                      {person.role}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function TeamDirectory() {
  const { members } = useTeamStore();

  const accents = [
    { mist: "from-ivory/25 via-ivory/5", glow: "bg-ivory/15", edge: "border-gold/50" },
    { mist: "from-gold/35 via-gold/10", glow: "bg-gold/20", edge: "border-gold/60" },
    { mist: "from-gold-600/30 via-forest/40", glow: "bg-gold/15", edge: "border-gold/45" },
    { mist: "from-forest-800/60 via-forest/30", glow: "bg-forest-800/50", edge: "border-gold/40" },
  ] as const;

  return (
    <div className="bg-forest">
      <section className="relative overflow-hidden border-b border-gold/20 bg-forest px-4 py-16 text-center sm:px-6 sm:py-20">
        <Image
          src="/logo.png"
          alt=""
          width={420}
          height={420}
          className="pointer-events-none absolute -right-12 top-1/2 h-64 w-64 -translate-y-1/2 object-contain opacity-[0.07]"
          aria-hidden
        />
        <p className="font-display text-sm tracking-crest text-gold">BHARWANA</p>
        <h1 className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">Our Team</h1>
        <div className="mx-auto mt-5 h-px w-16 bg-gold/70" />
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ivory/70">
          Leadership, design, and craft, open a profile to read every detail behind the floor.
        </p>
      </section>

      {members.map((member, index) => {
        const accent = accents[index % accents.length];
        return (
          <Link
            key={member.id}
            href={`/team/${member.id}`}
            className="group relative block min-h-[100svh] overflow-hidden bg-[#081910]"
          >
            <div
              className={`pointer-events-none absolute inset-x-[-10%] bottom-[-8%] z-[1] h-[55%] rounded-[100%] blur-3xl ${accent.glow}`}
              aria-hidden
            />
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[48%] bg-gradient-to-t ${accent.mist} to-transparent`}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-b from-forest/80 via-transparent to-[#081910]/90" aria-hidden />

            <div
              className={`pointer-events-none absolute inset-[7%] z-10 border ${accent.edge} sm:inset-[9%] lg:inset-[10%_12%]`}
              aria-hidden
            />

            <div className="relative z-20 mx-auto flex min-h-[100svh] max-w-7xl flex-col px-4 py-16 sm:px-8 lg:px-12">
              <div className="grid flex-1 items-center gap-8 pt-6 lg:grid-cols-[1fr_minmax(0,0.95fr)_1fr] lg:gap-4 lg:pt-10">
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-30 order-2 self-center text-left lg:order-1 lg:pl-2"
                >
                  <p className="font-serif text-3xl uppercase tracking-[0.08em] text-gold sm:text-4xl lg:text-5xl">
                    {member.fullName}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-ivory/65">
                    {member.role}
                  </p>
                  {member.department ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gold/70">
                      {member.department}
                    </p>
                  ) : null}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.7 }}
                  className="relative z-20 order-1 mx-auto aspect-[3/4] w-full max-w-[320px] sm:max-w-[380px] lg:order-2 lg:max-w-none lg:w-full"
                >
                  <div className="absolute -inset-x-6 bottom-0 top-1/3 bg-gradient-to-t from-[#081910] via-[#081910]/40 to-transparent lg:-inset-x-10" />
                  <Image
                    src={member.photoUrl}
                    alt={member.fullName}
                    fill
                    priority={index === 0}
                    className="object-contain object-bottom transition-transform duration-700 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 80vw, 36vw"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className="relative z-30 order-3 self-center text-left lg:pr-2 lg:text-right"
                >
                  <span className="font-serif text-5xl leading-none text-gold/50 lg:text-6xl" aria-hidden>
                    ”
                  </span>
                  <p className="mt-2 font-serif text-lg leading-snug text-ivory/85 sm:text-xl lg:text-2xl">
                    {member.quote ?? member.bio}
                  </p>
                  <span className="mt-6 inline-block text-[10px] uppercase tracking-[0.22em] text-gold transition-colors group-hover:text-ivory">
                    View full profile
                  </span>
                </motion.div>
              </div>

              <p className="relative z-30 mt-10 pb-4 text-center font-serif text-2xl uppercase tracking-[0.35em] text-gold/90 sm:text-3xl md:text-4xl lg:tracking-[0.42em]">
                Bharwana Estates
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

