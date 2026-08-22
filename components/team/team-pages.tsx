"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const profile = members.find((member) => member.id === profileId) ?? null;

  return (
    <div className="relative bg-gradient-to-b from-forest via-[#0c2418] to-[#081910] text-ivory">
      <section className="relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-20">
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

      <nav
        className="pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 xl:flex"
        aria-label="Team index"
      >
        {members.map((member) => {
          const initials = member.fullName
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2);
          const active = activeId === member.id;
          return (
            <a
              key={member.id}
              href={`#${member.id}`}
              className={`pointer-events-auto border px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-ivory/15 text-ivory/45 hover:border-gold/40 hover:text-gold"
              }`}
            >
              {initials}
            </a>
          );
        })}
      </nav>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {members.map((member, index) => {
          const reversed = index % 2 === 1;
          return (
            <motion.article
              key={member.id}
              id={member.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              onViewportEnter={() => setActiveId(member.id)}
              transition={{ duration: 0.45, ease: "easeOut", delay: Math.min(index * 0.04, 0.16) }}
              className={`grid items-center gap-8 py-12 sm:gap-10 sm:py-14 lg:grid-cols-2 lg:gap-14 lg:py-16 ${
                index > 0 ? "border-t border-gold/15" : ""
              }`}
            >
              <div
                className={`group relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-forest-800 ${
                  reversed ? "lg:order-2" : ""
                }`}
              >
                <Image
                  src={member.photoUrl}
                  alt={member.fullName}
                  fill
                  priority={index === 0}
                  className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 90vw, 420px"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest/50 via-transparent to-forest/10 opacity-70 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-90" />
                <div className="pointer-events-none absolute inset-0 bg-gold/0 transition-colors duration-500 group-hover:bg-gold/10" />
              </div>

              <div className={`max-w-xl ${reversed ? "lg:order-1 lg:text-right" : ""}`}>
                <h2 className="font-serif text-3xl text-ivory sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  {member.fullName}
                </h2>
                <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-gold">{member.role}</p>
                {member.department ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ivory/45">
                    {member.department}
                  </p>
                ) : null}
                <div className={`mt-6 ${reversed ? "lg:ml-auto" : ""}`}>
                  <span className="font-serif text-3xl leading-none text-gold/45" aria-hidden>
                    ”
                  </span>
                  <p
                    className={`mt-1 font-serif text-lg italic leading-relaxed text-ivory/80 sm:text-xl ${
                      reversed ? "lg:text-right" : ""
                    }`}
                  >
                    {member.quote ?? member.bio}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileId(member.id)}
                  className={`mt-8 inline-flex text-[11px] uppercase tracking-[0.2em] text-gold transition-colors hover:text-ivory ${
                    reversed ? "lg:ml-auto" : ""
                  }`}
                >
                  <span className="border-b border-gold/40 pb-0.5 transition-colors hover:border-gold">
                    View full profile →
                  </span>
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>

      <Sheet open={Boolean(profile)} onOpenChange={(open) => !open && setProfileId(null)}>
        <SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-lg">
          {profile && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-3xl text-forest">{profile.fullName}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="relative aspect-[4/5] max-h-[360px] overflow-hidden bg-forest">
                  <Image
                    src={profile.photoUrl}
                    alt={profile.fullName}
                    fill
                    className="object-cover object-top"
                    sizes="480px"
                  />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">{profile.role}</p>
                  {profile.department ? (
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {profile.department}
                    </p>
                  ) : null}
                  {profile.quote ? (
                    <p className="mt-5 font-serif text-xl italic leading-snug text-forest/85">
                      “{profile.quote}”
                    </p>
                  ) : null}
                  <p className="mt-5 text-sm leading-relaxed text-forest/75 whitespace-pre-line">
                    {profile.about || profile.bio}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {profile.email && (
                    <Button asChild size="sm">
                      <a href={`mailto:${profile.email}`}>
                        <Mail className="h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  )}
                  {profile.phone && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  )}
                  {profile.linkedinUrl && profile.linkedinUrl !== "#" && (
                    <Button asChild size="sm" variant="outline">
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                        <LinkedInIcon className="h-4 w-4" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/team/${profile.id}`}>Open full page</Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

