import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-forest shadow-none hover:bg-gold-600",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-forest/20 bg-transparent text-forest hover:bg-forest hover:text-ivory",
        secondary:
          "bg-forest text-ivory hover:bg-forest-800",
        ghost: "hover:bg-cream hover:text-forest",
        link: "text-forest underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-2 md:h-9 md:min-h-9",
        sm: "h-10 min-h-10 rounded-xl px-3 text-xs md:h-8 md:min-h-8",
        lg: "h-12 min-h-12 rounded-xl px-8 md:h-10 md:min-h-10",
        icon: "h-11 w-11 min-h-11 min-w-11 md:h-9 md:w-9 md:min-h-9 md:min-w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
