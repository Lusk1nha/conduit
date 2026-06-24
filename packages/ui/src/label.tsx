import * as React from "react"

import { cn } from "@conduit/utils"

export interface LabelProps extends React.ComponentProps<"label"> {
  required?: boolean
}

function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "font-mono text-xs font-medium tracking-widest text-(--muted) uppercase",
        "flex items-center gap-1 leading-none select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="text-(--accent) select-none">{">"}</span>
      {children}
      {required && <span className="text-(--destructive)">*</span>}
    </label>
  )
}

export { Label }
