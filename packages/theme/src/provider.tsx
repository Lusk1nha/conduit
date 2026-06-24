import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { defaultTheme, type ThemeId } from "./themes"

const STORAGE_KEY = "conduit:theme"
const USER_STORAGE_KEY = "conduit:theme-user"

interface ThemeContextValue {
  theme: ThemeId
  /** User explicitly picks a theme — persists as their personal preference. */
  setTheme: (id: ThemeId) => void
  /** Apply a default (e.g. workspace theme) — ignored if the user already chose one. */
  applyDefault: (id: ThemeId) => void
  /** Preview a theme visually without persisting anything (used by showcase mode). */
  previewTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): ThemeId {
  try {
    // Explicit user preference wins.
    const userPref = localStorage.getItem(USER_STORAGE_KEY)
    if (userPref) return userPref as ThemeId
    // Last active theme as a paint-flash reducer.
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) return cached as ThemeId
  } catch {
    /* storage blocked */
  }
  return defaultTheme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (id: ThemeId) => {
    localStorage.setItem(USER_STORAGE_KEY, id)
    setThemeState(id)
  }

  const applyDefault = (id: ThemeId) => {
    const hasUserPref = localStorage.getItem(USER_STORAGE_KEY) != null
    if (!hasUserPref) setThemeState(id)
  }

  const previewTheme = (id: ThemeId) => {
    // Only update DOM and React state — no localStorage writes.
    setThemeState(id)
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, applyDefault, previewTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>")
  return ctx
}
