import type { ReactNode } from "react";

export function Pill({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={`pill ${tone ?? ""}`}>{children}</span>;
}

export function channelTone(channel: string) {
  if (channel === "whatsapp") return "whatsapp";
  if (channel === "email") return "email";
  return "";
}
