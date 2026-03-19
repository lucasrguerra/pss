import type { ProcessRuntime } from "../types";

// ============================================================
// Shared tiebreak helper (all algorithms use this)
// Primary: arrivalTick ASC  Secondary: processId lexicographic ASC
// ============================================================

export function tiebreak(a: ProcessRuntime, b: ProcessRuntime): number {
  if (a.arrivalTick !== b.arrivalTick) return a.arrivalTick - b.arrivalTick;
  return a.processId.localeCompare(b.processId);
}
