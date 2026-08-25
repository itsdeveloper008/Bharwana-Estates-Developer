"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

const TAGLINES = ["A key, passed quietly.", "Every address, considered.", "Quiet introductions only."];

export function AuthVisualPanel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % TAGLINES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative hidden overflow-hidden bg-forest lg:block">
      <motion.div
        className="absolute inset-0"
        animate={{ scale: [1, 1.08, 1], x: ["0%", "-2%", "0%"], y: ["0%", "1.5%", "0%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
          alt=""
          fill
          className="object-cover opacity-55"
          priority
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/55 to-forest/15" />
      <div className="absolute bottom-12 left-12 right-12 text-ivory">
        <p className="font-display text-sm tracking-crest text-gold">BHARWANA</p>
        <div className="relative mt-3 min-h-[3.5rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={TAGLINES[index]}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="font-serif text-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
            >
              {TAGLINES[index]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function AuthFormEntrance({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className="mx-auto w-full max-w-md flex-1"
    >
      {children}
    </motion.div>
  );
}

export function AuthCrossLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block text-forest transition-colors duration-200 hover:text-gold-700"
    >
      {children}
      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
