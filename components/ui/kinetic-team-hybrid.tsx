"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KineticTeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  href: string;
  department?: string;
  quote?: string;
}

export default function KineticTeamHybrid({
  members,
  eyebrow = "Bharwana",
  title = "Our Team",
  subtitle = "Leadership, design, and craft behind every introduction.",
}: {
  members: KineticTeamMember[];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 22, stiffness: 140, mass: 0.55 };
  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isMobile || reduced) return;
    const cardW = 420;
    const cardH = 540;
    const pad = 24;
    const nextX = Math.min(event.clientX + 28, window.innerWidth - cardW - pad);
    const nextY = Math.min(event.clientY - cardH / 3, window.innerHeight - cardH - pad);
    mouseX.set(Math.max(pad, nextX));
    mouseY.set(Math.max(pad, nextY));
  };

  const activeMember = members.find((member) => member.id === activeId) ?? null;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[80vh] w-full cursor-default overflow-hidden bg-[#082B1D] px-5 pb-28 pt-24 text-[#F5F1E8] sm:px-8 md:px-12 md:pb-36 md:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(185,149,74,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(245,241,232,0.04),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.045] mix-blend-overlay" />

      <div className="relative mx-auto max-w-6xl">
        <motion.header
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20 flex flex-col gap-6 md:mb-28 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#B9954A]">
              {eyebrow}
            </p>
            <h1 className="mt-5 font-serif text-[2.75rem] font-normal leading-[1.05] tracking-tight text-[#F5F1E8] sm:text-6xl md:text-7xl lg:text-[5.75rem]">
              {title.split(" ").length > 1 ? (
                <>
                  {title.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-[#F5F1E8]/40">{title.split(" ").slice(-1)}</span>
                </>
              ) : (
                title
              )}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#F5F1E8]/55 sm:text-lg">
              {subtitle}
            </p>
          </div>
          <div className="mx-10 hidden h-px flex-1 bg-gradient-to-r from-transparent via-[#B9954A]/35 to-transparent md:mb-4 md:block" />
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#F5F1E8]/35 md:mb-3">
            People · Perspectives
          </p>
        </motion.header>

        <div className="flex flex-col border-y border-[#F5F1E8]/10">
          {members.map((member, index) => (
            <TeamRow
              key={member.id}
              data={member}
              index={index}
              isActive={activeId === member.id}
              setActiveId={setActiveId}
              isMobile={isMobile}
              isAnyActive={activeId !== null}
              reduced={Boolean(reduced)}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16 hidden text-center font-serif text-xl italic text-[#F5F1E8]/45 md:mt-20 md:block md:text-2xl"
        >
          Hover a name to preview. Click to open the full profile.
        </motion.p>
      </div>

      {!isMobile && !reduced && (
        <motion.div
          style={{ x: cursorX, y: cursorY }}
          className="pointer-events-none fixed left-0 top-0 z-50 hidden md:block"
        >
          <AnimatePresence mode="wait">
            {activeMember && (
              <motion.div
                key={activeMember.id}
                initial={{ opacity: 0, scale: 0.82, rotate: -2, filter: "blur(12px)" }}
                animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.88, filter: "blur(8px)" }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="relative h-[540px] w-[420px] overflow-hidden border border-[#F5F1E8]/12 bg-[#0c2418] shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
              >
                <Image
                  src={activeMember.image}
                  alt={activeMember.name}
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="420px"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#082B1D]/95 via-[#082B1D]/50 to-transparent px-7 pb-7 pt-20">
                  <p className="font-serif text-2xl leading-snug text-[#F5F1E8]">{activeMember.name}</p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-[#F5F1E8]/60">
                    {activeMember.role}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function TeamRow({
  data,
  index,
  isActive,
  setActiveId,
  isMobile,
  isAnyActive,
  reduced,
}: {
  data: KineticTeamMember;
  index: number;
  isActive: boolean;
  setActiveId: (id: string | null) => void;
  isMobile: boolean;
  isAnyActive: boolean;
  reduced: boolean;
}) {
  const isDimmed = isAnyActive && !isActive;

  return (
    <motion.div
      layout
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }}
      animate={{
        opacity: isDimmed ? 0.22 : 1,
        y: 0,
        backgroundColor: isActive ? "rgba(245,241,232,0.035)" : "transparent",
      }}
      transition={{ duration: 0.45, delay: reduced ? 0 : index * 0.06 }}
      onMouseEnter={() => !isMobile && setActiveId(data.id)}
      onMouseLeave={() => !isMobile && setActiveId(null)}
      onClick={() => isMobile && setActiveId(isActive ? null : data.id)}
      className={cn(
        "group relative border-b border-[#F5F1E8]/10 transition-colors duration-500 last:border-b-0",
        isMobile ? "cursor-pointer" : "cursor-default",
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-[#B9954A] transition-transform duration-500",
          isActive && "scale-y-100",
        )}
      />

      <div className="relative z-10 flex flex-col py-10 md:flex-row md:items-center md:justify-between md:py-14 lg:py-16">
        <div className="flex items-baseline gap-5 pl-2 transition-transform duration-500 group-hover:translate-x-4 md:gap-12 md:pl-3">
          <div>
            <h2 className="font-serif text-[2rem] font-normal tracking-tight text-[#F5F1E8]/40 transition-colors duration-300 group-hover:text-[#F5F1E8] sm:text-4xl md:text-5xl lg:text-[3.75rem] lg:leading-[1.05]">
              {isMobile ? (
                data.name
              ) : (
                <Link
                  href={data.href}
                  className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B9954A]"
                  onClick={(event) => event.stopPropagation()}
                >
                  {data.name}
                </Link>
              )}
            </h2>
            {data.department ? (
              <p className="mt-2 hidden text-[10px] uppercase tracking-[0.22em] text-[#F5F1E8]/30 transition-colors group-hover:text-[#B9954A]/80 md:block">
                {data.department}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between pl-2 pr-1 md:mt-0 md:justify-end md:gap-12 md:pl-0 md:pr-2">
          <span className="max-w-[14rem] text-left text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5F1E8]/35 transition-colors group-hover:text-[#F5F1E8]/70 md:text-right">
            {data.role}
          </span>

          <div className="block text-[#F5F1E8]/50 md:hidden">
            {isActive ? <Minus size={20} strokeWidth={1.5} /> : <Plus size={20} strokeWidth={1.5} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobile && isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden bg-[#0c2418]/90"
          >
            <div className="px-3 pb-6 pt-1">
              <Link href={data.href} className="relative block h-[520px] w-full overflow-hidden sm:h-[580px]">
                <Image
                  src={data.image}
                  alt={data.name}
                  fill
                  className="object-cover object-top"
                  sizes="100vw"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#082B1D]/95 via-[#082B1D]/45 to-transparent px-6 pb-6 pt-16">
                  <p className="font-serif text-2xl text-[#F5F1E8]">{data.name}</p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-[#F5F1E8]/60">
                    {data.role}
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
