import { NavLink, Outlet } from "react-router-dom"
import {
  BroadcastIcon,
  StackIcon,
  TerminalWindowIcon,
  type Icon,
} from "@phosphor-icons/react"
import { ThemeSwitcher } from "@conduit/theme"
import { cn } from "@conduit/utils"

interface NavItem {
  to: string
  label: string
  icon: Icon
}

const NAV_ITEMS: NavItem[] = [
  { to: "/workspaces", label: "Workspaces", icon: StackIcon },
  { to: "/services", label: "Services", icon: TerminalWindowIcon },
  { to: "/relay", label: "Relay", icon: BroadcastIcon },
]

/**
 * The application shell: a persistent sidebar with primary navigation and an
 * <Outlet /> that renders the active route. Colors come from the active theme
 * via CSS variables (see @conduit/theme).
 */
export function AppLayout() {
  return (
    <div className="flex h-full bg-(--bg) text-(--fg)">
      <aside className="flex w-56 flex-col border-r border-(--border) bg-(--surface) p-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-lg text-(--accent)">◈</span>
          <span className="font-mono font-semibold tracking-tight">
            Conduit
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-sm px-3 py-2 font-mono text-sm transition-colors",
                  isActive
                    ? "bg-(--surface-2) text-(--fg)"
                    : "text-(--muted) hover:bg-(--surface-hover) hover:text-(--fg)",
                )
              }
            >
              <ItemIcon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center justify-between border-t border-(--border) pt-4">
          <span className="font-mono text-[10px] tracking-widest text-(--muted) uppercase">
            Theme
          </span>
          <ThemeSwitcher direction="up" />
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
