"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#E8E2D6] shadow-[inset_0_1px_2px_rgba(15,46,29,0.08)]">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#C9A24D] to-[#D4B56A]" />
    </SliderPrimitive.Track>
    {(props.value ?? props.defaultValue ?? [0]).map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="block h-5 w-5 cursor-grab rounded-full border-[3px] border-white bg-gold shadow-[0_2px_8px_rgba(15,46,29,0.22)] ring-1 ring-forest/15 transition hover:scale-105 active:cursor-grabbing active:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:pointer-events-none disabled:opacity-50 touch-none"
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
