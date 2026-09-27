// insurance.ts — the ONE place `Tenant.insurance_mode` is fetched, so
// InsuranceSection (Section 01, clinic-level) and ProfessionalInsuranceSection
// (Section 05, per-professional) — two components with no other shared
// ancestor state — agree on the same value without two independent GETs, and
// so saving a new mode in one place is instantly visible in the other.
//
// Deliberately NOT part of the hydration/snapshot/save machinery in
// ./hydration.ts / ./snapshot.ts / ./save.ts: `insurance_mode` is its own
// hub resource with an immediate GET/PUT, not a field on TenantConfigWire —
// see the note on ClinicCtx in ./types.ts for the full reasoning.

import { useCallback, useEffect, useState } from "react";
import {
  getInsuranceMode,
  setInsuranceMode,
  type InsuranceMode,
} from "@/lib/secretaria-hub";
import type { Session } from "@/lib/manage-api";

export type InsuranceModeState = {
  /** `undefined` = not loaded yet; `null` = loaded, clinic has not chosen one. */
  mode: InsuranceMode | null | undefined;
  error: boolean;
  reload: () => void;
  /** Saves a new mode and updates `mode` from the server's echoed value. */
  save: (next: InsuranceMode) => Promise<void>;
  /**
   * Bumped by InsuranceSection after any write to the CLINIC's plan list
   * (membership toggle, "Cobrar sinal", a new "Outro"). In `clinic_with_
   * exceptions` mode the clinic's list IS ProfessionalInsuranceSection's
   * `selectable` — without this, a professional's panel would keep showing
   * the catalog as it was when IT last mounted, missing a plan the clinic
   * just added until something else happens to remount it.
   */
  plansVersion: number;
  notifyPlansChanged: () => void;
};

export function useInsuranceMode(session: Session | null): InsuranceModeState {
  const [mode, setMode] = useState<InsuranceMode | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [plansVersion, setPlansVersion] = useState(0);
  const notifyPlansChanged = useCallback(() => setPlansVersion((v) => v + 1), []);

  const reload = useCallback(() => {
    if (!session) return;
    setError(false);
    getInsuranceMode(session)
      .then((res) => setMode(res.mode))
      .catch((e) => {
        console.error("secretaria configuracao: failed to load insurance mode", e);
        setError(true);
      });
  }, [session]);

  // Resets to "not loaded" and re-fetches on every session change (tenant
  // swap, logout, login) in ONE effect, so a stale mode from a previous
  // clinic is never briefly readable as this one's between the reset and the
  // new GET landing.
  useEffect(() => {
    setMode(undefined);
    reload();
  }, [reload]);

  const save = useCallback(
    async (next: InsuranceMode) => {
      if (!session) return;
      const res = await setInsuranceMode(session, next);
      setMode(res.mode);
    },
    [session],
  );

  return { mode, error, reload, save, plansVersion, notifyPlansChanged };
}
