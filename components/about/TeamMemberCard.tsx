"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import type { TeamMember } from "@/lib/mock-data/team";
import { cn } from "@/lib/utils";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.49V23h-4V8.5z" />
    </svg>
  );
}

export function TeamMemberCard({
  member,
  featured = false,
}: {
  member: TeamMember;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <Link
        href={`/team/${member.id}`}
        className="group relative grid overflow-hidden bg-forest lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      >
        <div className="relative aspect-[4/5] min-h-[360px] lg:aspect-auto lg:min-h-[520px]">
          <Image
            src={member.photoUrl}
            alt={member.fullName}
            fill
            className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/50 via-transparent to-transparent lg:hidden" />
        </div>
        <div className="relative flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-14">
          <Image
            src="/logo.png"
            alt=""
            width={200}
            height={200}
            className="pointer-events-none absolute -right-6 top-6 h-40 w-40 object-contain opacity-[0.08]"
            aria-hidden
          />
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Leadership</p>
          <h3 className="mt-4 font-serif text-4xl text-ivory sm:text-5xl">{member.fullName}</h3>
          <div className="mt-4 h-px w-14 bg-gold/70" />
          <p className="mt-4 text-[12px] uppercase tracking-[0.2em] text-gold">{member.role}</p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ivory/75">{member.bio}</p>
          <span className="mt-8 text-[11px] uppercase tracking-[0.2em] text-gold group-hover:underline">
            View full profile
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/team/${member.id}`}
      className={cn(
        "group block overflow-hidden border border-forest/10 bg-ivory transition-all duration-500",
        "hover:-translate-y-1.5 hover:border-gold/50 hover:shadow-lift",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-cream">
        <Image
          src={member.photoUrl}
          alt={member.fullName}
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/80 via-forest/20 to-transparent p-5 pt-16 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-3 text-sm leading-relaxed text-ivory/90">{member.bio}</p>
        </div>
      </div>
      <div className="border-t border-forest/5 px-5 py-5">
        <h3 className="font-serif text-xl text-forest transition-colors group-hover:text-gold-700">
          {member.fullName}
        </h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gold-700">{member.role}</p>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-forest/40 group-hover:text-gold-700">
          Full profile →
        </p>
        {(member.linkedinUrl || member.email) && (
          <div className="mt-3 flex gap-3" onClick={(event) => event.preventDefault()}>
            {member.linkedinUrl && (
              <a
                href={member.linkedinUrl}
                aria-label={`${member.fullName} on LinkedIn`}
                className="text-forest/40 transition-colors hover:text-gold"
                onClick={(event) => {
                  event.stopPropagation();
                  if (member.linkedinUrl === "#") event.preventDefault();
                }}
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                aria-label={`Email ${member.fullName}`}
                className="text-forest/40 transition-colors hover:text-gold"
                onClick={(event) => event.stopPropagation()}
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
