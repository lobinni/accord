"use client";

/**
 * Carries the deployment configuration from the server render into client
 * components. One provider at the root; every component that needs the
 * contract address or chain reads it from here — never from its own copy.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { AppConfig, ConfigResult } from "@/lib/genlayer/config";

const ConfigContext = createContext<ConfigResult | null>(null);

export function AppConfigProvider({ result, children }: { result: ConfigResult; children: ReactNode }) {
  const value = useMemo(() => result, [result]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

/** The full result: either the config, or the list of problems to show. */
export function useConfigResult(): ConfigResult {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfigResult must be used inside AppConfigProvider");
  return ctx;
}

/** Just the config, or null while deployment is pending. */
export function useAppConfig(): AppConfig | null {
  const result = useConfigResult();
  return result.ok ? result.config : null;
}
