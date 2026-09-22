"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Off-screen mount point for Firebase RecaptchaVerifier.
 *
 * The real `#id` host is created imperatively so `clearRecaptchaContainer` can
 * replaceChild it without React losing track of a managed DOM node (which causes
 * NotFoundError: insertBefore). Do not put aria-hidden here — the invisible
 * challenge iframe can take focus and Chromium blocks aria-hidden ancestors.
 */
export function PhoneRecaptchaHost({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let host = document.getElementById(id);
    if (host && !wrap.contains(host)) {
      host.remove();
      host = null;
    }
    if (!host) {
      host = document.createElement("div");
      host.id = id;
      wrap.appendChild(host);
    }

    return () => {
      const current = document.getElementById(id);
      if (current?.parentElement === wrap) {
        current.remove();
      }
    };
  }, [id]);

  return (
    <div
      ref={wrapRef}
      className={cn("absolute -left-[9999px] h-0 w-0 overflow-hidden", className)}
    />
  );
}
