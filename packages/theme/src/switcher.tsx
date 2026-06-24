import { MonitorIcon, PlayIcon, StopIcon } from "@phosphor-icons/react"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "./provider"
import { themes, type ThemeId } from "./themes"
import { cn } from "@conduit/utils"

export function ThemeSwitcher({
  className,
  direction = "down",
}: {
  className?: string
  /** Which way the menu opens. Use "up" when the trigger sits near the bottom. */
  direction?: "up" | "down"
}) {
  const { theme, setTheme, previewTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"dark" | "light">("dark")
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  )
  // Remember the theme that was active when showcase started so we can restore it.
  const themeBeforeShowcase = useRef<ThemeId | null>(null)

  useEffect(() => {
    if (isAutoPlaying) {
      themeBeforeShowcase.current = theme
      intervalRef.current = setInterval(() => {
        const idx = Math.floor(Math.random() * themes.length)
        previewTheme(themes[idx]!.id as ThemeId)
      }, 2000)
    } else {
      clearInterval(intervalRef.current)
      // Restore the theme that was showing before showcase started.
      if (themeBeforeShowcase.current) {
        previewTheme(themeBeforeShowcase.current)
        themeBeforeShowcase.current = null
      }
    }
    return () => clearInterval(intervalRef.current)
  }, [isAutoPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 items-center gap-1.5 px-2",
          "font-mono text-xs text-(--muted)",
          "rounded-sm border border-(--border) bg-(--surface)",
          "transition-colors hover:border-(--muted) hover:text-(--fg)"
        )}
      >
        <MonitorIcon className="h-3 w-3" />
        <span className="hidden sm:inline">
          {themes.find((t) => t.id === theme)?.name ?? "Theme"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className={cn(
              "absolute right-0 z-50 w-64 overflow-hidden rounded-sm border border-(--border) bg-(--surface) shadow-xl shadow-black/20",
              direction === "up" ? "bottom-full left-full mb-1" : "top-full mt-1"
            )}
          >
            <div className="flex items-center border-b border-(--border)">
              {(["dark", "light"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold tracking-wider uppercase",
                    activeTab === tab
                      ? "border-b-2 border-(--accent) text-(--fg)"
                      : "text-(--muted) hover:text-(--fg)"
                  )}
                >
                  {tab}
                </button>
              ))}

              <button
                onClick={() => setIsAutoPlaying((p) => !p)}
                className={cn(
                  "px-3 transition-colors hover:text-(--fg)",
                  isAutoPlaying ? "text-(--accent)" : "text-(--muted)"
                )}
                title={isAutoPlaying ? "Stop showcase" : "Start showcase mode"}
              >
                {isAutoPlaying ? (
                  <StopIcon className="h-3.5 w-3.5" />
                ) : (
                  <PlayIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto p-2">
              {themes
                .filter((t) => (activeTab === "dark" ? t.isDark : !t.isDark))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id as ThemeId)
                      setIsAutoPlaying(false)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left font-mono text-xs text-(--muted)",
                      "hover:bg-(--surface-2) hover:text-(--fg)",
                      theme === t.id &&
                        "bg-(--surface-2) font-medium text-(--fg)"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: t.accentHex }}
                    />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
