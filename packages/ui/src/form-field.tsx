import * as React from "react"

import { Label } from "./label"
import { cn } from "@conduit/utils"

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error && (
        <p className="mt-0.5 font-mono text-xs text-(--destructive)">{error}</p>
      )}
    </div>
  )
}
