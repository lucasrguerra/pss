import type { SchedulerAlgorithm } from "./index";

/**
 * MULTILEVEL — Multilevel Queue (stub)
 * Not yet implemented. Deferred to a later phase.
 */
export const multilevel: SchedulerAlgorithm = {
  select() {
    throw new Error("MULTILEVEL scheduling is not yet implemented");
  },

  shouldPreempt() {
    throw new Error("MULTILEVEL scheduling is not yet implemented");
  },

  isQuantumExpired() {
    throw new Error("MULTILEVEL scheduling is not yet implemented");
  },
};
