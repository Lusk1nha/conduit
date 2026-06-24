import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@conduit/utils"

export interface InputProps extends React.ComponentPropsWithoutRef<
  typeof InputPrimitive
> {
  error?: boolean
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      aria-invalid={error ? true : undefined}
      className={cn(
        "flex h-9 w-full min-w-0 rounded-sm border border-(--border) bg-(--surface) px-3 py-1 font-mono text-sm text-(--fg) transition-colors outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-(--fg)",
        "placeholder:text-(--muted)",
        "focus-visible:border-(--accent) focus-visible:ring-(--accent)",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "aria-invalid:border-(--destructive) aria-invalid:focus-visible:ring-(--destructive)",
        className
      )}
      {...props}
    />
  )
}

export { Input }
