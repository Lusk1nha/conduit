import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, Button } from "@conduit/ui"
import { useAppInfo } from "../../application/useAppInfo"

export function WorkspacesPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAppInfo()

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="font-mono text-2xl font-semibold tracking-tight">
        Workspaces
      </h1>
      <p className="mt-2 text-sm text-(--muted)">
        Define services once per project, then start, stop, and monitor them
        from one place. Workspace management lands in Phase 2.
      </p>

      <div className="mt-8 rounded-sm border border-(--border) bg-(--surface) p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] font-bold tracking-widest text-(--muted) uppercase">
            Rust core (via Tauri IPC)
          </h2>
          <Button
            size="sm"
            variant="ghost"
            loading={isFetching}
            onClick={() => refetch()}
          >
            <ArrowsClockwiseIcon />
            Reload
          </Button>
        </div>

        {isLoading && (
          <p className="mt-3 text-sm text-(--muted)">Loading app info…</p>
        )}

        {isError && (
          <Alert variant="warning" className="mt-3">
            <WarningIcon />
            <AlertDescription>
              IPC unavailable: {String(error)}. Run via{" "}
              <code className="rounded-sm bg-(--surface-2) px-1">pnpm dev</code>{" "}
              (Tauri) rather than the browser.
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-(--muted)">Name</dt>
            <dd className="font-mono">{data.name}</dd>
            <dt className="text-(--muted)">Version</dt>
            <dd className="font-mono">{data.version}</dd>
            <dt className="text-(--muted)">Tauri</dt>
            <dd className="font-mono">{data.tauri}</dd>
          </dl>
        )}
      </div>
    </section>
  )
}
