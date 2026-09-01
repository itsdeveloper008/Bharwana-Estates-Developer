import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gold text-forest",
        secondary:
          "border-transparent bg-forest text-ivory",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-forest/15 text-forest",
        owner: "border-transparent bg-forest text-ivory tracking-wide",
        verified: "border-gold/40 bg-gold-50 text-gold-700 tracking-wide",
        pending: "border-amber-700/25 bg-amber-50 text-amber-900 tracking-wide",
        rejected: "border-destructive/30 bg-destructive/5 text-destructive tracking-wide",
        platform: "border-transparent bg-gold text-forest tracking-wide",
        direct: "border-forest/20 bg-transparent text-forest/70 tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
