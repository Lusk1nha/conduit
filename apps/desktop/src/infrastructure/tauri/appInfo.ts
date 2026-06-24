import { invoke } from "@tauri-apps/api/core";

/** Mirror of the `AppInfo` struct returned by the Rust `app_info` command. */
export interface AppInfo {
  name: string;
  version: string;
  tauri: string;
}

/**
 * Thin adapter over the Tauri IPC boundary. Application-layer hooks depend on
 * this function, never on `@tauri-apps/api` directly — keeping the IPC
 * mechanism swappable and the call sites testable.
 */
export async function fetchAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("app_info");
}
