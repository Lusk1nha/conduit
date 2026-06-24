import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { SpinnerGapIcon } from "@phosphor-icons/react"
import * as React from "react"

import { cn } from "@conduit/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border border-transparent bg-clip-padding font-mono text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-(--accent) focus-visible:ring-2 focus-visible:ring-(--accent)/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-(--accent) text-(--accent-fg) hover:opacity-85",
        outline:
          "border-(--accent) bg-transparent text-(--accent) hover:bg-(--accent) hover:text-(--accent-fg)",
        secondary:
          "border-(--border) bg-(--surface) text-(--fg) hover:bg-(--surface-2)",
        ghost:
          "border-transparent bg-transparent text-(--fg) hover:border-(--border) hover:bg-(--surface)",
        destructive:
          "bg-(--destructive) text-(--destructive-fg) hover:opacity-85",
        link: "text-(--accent) underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends
    React.ComponentPropsWithoutRef<typeof ButtonPrimitive>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <SpinnerGapIcon className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
