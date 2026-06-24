export type ThemeId =
  | "midnight"
  | "dawn"
  | "dracula"
  | "nord"
  | "catppuccin"
  | "rose-pine"
  | "solarized-light"
  | "cyberpunk"
  | "forest"
  | "tokyo-night"
  | "oled-black"
  | "synthwave"
  | "night-runner"
  | "terminal"
  | "outrun"
  | "paper"
  | "slate-light"
  | "serene"
  | "ice"
  | "coffee"

export interface Theme {
  id: ThemeId
  name: string
  description: string
  isDark: boolean
  accentHex: string
}

export const themes: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    description: "GitHub dark",
    isDark: true,
    accentHex: "#58a6ff",
  },
  {
    id: "dawn",
    name: "Dawn",
    description: "Clean minimal light",
    isDark: false,
    accentHex: "#0969da",
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "Classic vampire",
    isDark: true,
    accentHex: "#bd93f9",
  },
  {
    id: "nord",
    name: "Nord",
    description: "Arctic blue",
    isDark: true,
    accentHex: "#88c0d0",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Pastel mocha",
    isDark: true,
    accentHex: "#cba6f7",
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Warm soft dark",
    isDark: true,
    accentHex: "#c4a7e7",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon nights",
    isDark: true,
    accentHex: "#fdf500",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calm deep green",
    isDark: true,
    accentHex: "#4ade80",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "Tokyo lights",
    isDark: true,
    accentHex: "#7aa2f7",
  },
  {
    id: "oled-black",
    name: "OLED Black",
    description: "Pure black",
    isDark: true,
    accentHex: "#ffffff",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    description: "80s retro",
    isDark: true,
    accentHex: "#ff7edb",
  },
  {
    id: "night-runner",
    name: "Night Runner",
    description: "Neon asphalt",
    isDark: true,
    accentHex: "#00f0ff",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Classic hacker",
    isDark: true,
    accentHex: "#00ff41",
  },
  {
    id: "outrun",
    name: "Outrun",
    description: "Retrowave warm",
    isDark: true,
    accentHex: "#ff9e00",
  },
  {
    id: "paper",
    name: "Paper",
    description: "Aged paper comfort",
    isDark: false,
    accentHex: "#8b7355",
  },
  {
    id: "slate-light",
    name: "Slate Light",
    description: "Professional grey",
    isDark: false,
    accentHex: "#475569",
  },
  {
    id: "serene",
    name: "Serene",
    description: "Calm sand tones",
    isDark: false,
    accentHex: "#788d75",
  },
  {
    id: "ice",
    name: "Ice",
    description: "Cool refreshing",
    isDark: false,
    accentHex: "#4e8a96",
  },
  {
    id: "coffee",
    name: "Coffee",
    description: "Warm cozy brew",
    isDark: false,
    accentHex: "#765d56",
  },
]

export const defaultTheme: ThemeId = "midnight"
