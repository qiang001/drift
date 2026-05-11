export type Status =
  | { kind: "Disconnected" }
  | { kind: "Connecting" }
  | { kind: "Connected" }
  | { kind: "Failed"; detail: string };

export interface ConnectionInfo {
  status: Status;
  remark: string;
  host: string;
  port: number;
  network: string;
  security: string;
  socks_port: number;
  http_port: number;
}

export interface EnvCheck {
  xray_path: string;
  xray_present: boolean;
}
