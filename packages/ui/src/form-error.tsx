import { AnimatePresence, motion } from "motion/react"
import { WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "./alert"

export interface FormErrorProps {
  /** O erro retornado pelo TanStack Query (isError não é necessário, verificamos se error existe) */
  error: Error | null | undefined

  /** Mensagem opcional de fallback caso o erro não tenha uma message mapeada */
  fallbackMessage?: string

  /** Margem inferior, padrão é mb-4 */
  className?: string
}

export function FormError({
  error,
  fallbackMessage = "An unexpected error occurred. Please try again.",
  className = "mb-4 overflow-hidden",
}: FormErrorProps) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          key="error"
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className={className}
        >
          <Alert variant="error">
            <WarningIcon />
            <AlertDescription>
              {error.message || fallbackMessage}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
