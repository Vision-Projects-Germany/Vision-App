import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

let tauriDetection: Promise<boolean> | null = null;

export async function isRunningInTauri() {
  if (!tauriDetection) {
    tauriDetection = Promise.resolve(isTauri());
  }
  return tauriDetection;
}

export async function openExternalUrl(url: string) {
  if (await isRunningInTauri()) {
    await openUrl(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
