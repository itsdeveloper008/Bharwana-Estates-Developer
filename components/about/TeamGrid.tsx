"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TeamMemberCard } from "@/components/about/TeamMemberCard";
import { Button } from "@/components/ui/button";
import { useTeamStore } from "@/lib/team-store";

export function TeamGrid() {
  const { members } = useTeamStore();
  const [featured, ...rest] = members;

  return (
    <section className="relative overflow-hidden bg-cream/50 py-20 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #C9A24B 0.8px, transparent 0.9px), radial-gradient(circle at 80% 60%, #0F2E1D 0.7px, transparent 0.8px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-700">Our people</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Meet the Team</h2>
          <div className="mx-auto mt-5 h-px w-16 bg-gold/60" />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Open a profile for the full story — role, expertise, and every detail behind the floor.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/team">View all profiles</Link>
          </Button>
        </motion.div>

        {members.length === 0 ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            No team members to introduce yet.
          </p>
        ) : (
          <div className="mt-14 space-y-10">
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55 }}
              >
                <TeamMemberCard member={featured} featured />
              </motion.div>
            )}

            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {rest.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(index * 0.08, 0.24), duration: 0.45 }}
                  >
                    <TeamMemberCard member={member} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
