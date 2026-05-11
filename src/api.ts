import { invoke } from "@tauri-apps/api/core";
import type { ConnectionInfo, EnvCheck, Status } from "./types";

export const api = {
  connect: (url: string) => invoke<ConnectionInfo>("connect", { url }),
  disconnect: () => invoke<void>("disconnect"),
  getStatus: () => invoke<Status>("get_status"),
  getLogs: () => invoke<string[]>("get_logs"),
  envCheck: () => invoke<EnvCheck>("env_check"),
};
