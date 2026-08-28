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
      className="relative w-full overflow-hidden"
    >
      <div className="relative aspect-[21/9] min-h-[200px] w-full sm:min-h-[300px] lg:min-h-[420px]">
        <Image
          src="/team-floor.png"
          alt="The Bharwana team floor"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    </motion.section>
  );
}
