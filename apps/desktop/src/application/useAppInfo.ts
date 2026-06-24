import { useQuery } from "@tanstack/react-query";
import { fetchAppInfo, type AppInfo } from "../infrastructure/tauri/appInfo";

/**
 * Loads application/runtime info from the Rust core over Tauri IPC.
 *
 * Demonstrates the full React → TanStack Query → infrastructure adapter → IPC
 * path that every data-fetching feature will follow.
 */
export function useAppInfo() {
  return useQuery<AppInfo>({
    queryKey: ["app-info"],
    queryFn: fetchAppInfo,
    staleTime: Infinity,
  });
}
