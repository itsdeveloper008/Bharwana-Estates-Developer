"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function AboutFloorImage() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease }}
      className="bg-ivory px-6 py-4 sm:px-10 sm:py-6 md:px-[3in] md:py-[1in]"
    >
      <div className="relative mx-auto aspect-[21/9] min-h-[200px] w-full max-w-[1400px] overflow-hidden rounded-2xl sm:min-h-[280px] sm:rounded-3xl lg:min-h-[380px]">
        <Image
          src="/team-floor.png"
          alt="The Bharwana team floor"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, calc(100vw - 6in)"
          priority
        />
      </div>
    </motion.section>
  );
}
