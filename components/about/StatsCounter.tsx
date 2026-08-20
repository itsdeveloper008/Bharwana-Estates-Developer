"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { CompanyStat } from "@/lib/mock-data/team";

function AnimatedValue({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span ref={ref} className="font-serif text-4xl text-gold-700 sm:text-5xl">
      {display}
      {suffix}
    </span>
  );
}

export function StatsCounter({ stats }: { stats: CompanyStat[] }) {
  return (
    <div className="mt-12 grid gap-8 border-t border-forest/10 pt-10 sm:grid-cols-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.45 }}
          className="text-center sm:text-left"
        >
          <AnimatedValue value={stat.value} suffix={stat.suffix} />
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {stat.label}
            <span className="ml-1 text-forest/40">(placeholder)</span>
          </p>
        </motion.div>
      ))}
    </div>
  );
}
