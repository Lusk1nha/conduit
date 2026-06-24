import { cn } from "@conduit/utils"
import * as React from "react"

export interface TextareaProps extends React.ComponentPropsWithoutRef<"textarea"> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          // Base e Cores do Nexus
          "flex min-h-20 w-full rounded-sm border border-(--border) bg-(--surface) px-3 py-2 font-mono text-sm text-(--fg) transition-colors outline-none",

          // Placeholder
          "placeholder:text-(--muted)",

          // Foco
          "focus-visible:border-(--accent) focus-visible:ring-(--accent)",

          // Desabilitado
          "disabled:cursor-not-allowed disabled:opacity-40",

          // Erro (Aria Invalid)
          "aria-invalid:border-(--destructive) aria-invalid:ring-1 aria-invalid:ring-(--destructive)",

          // Permite usar a nova feature do CSS field-sizing se você quiser que ele cresça sozinho (opcional)
          "field-sizing-content",

          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
