import type { SchedulerAlgorithm } from "./index";
import { tiebreak } from "./utils";

/**
 * FCFS — First Come, First Served
 * Non-preemptive. Selects the process with earliest arrival; tiebreak by id.
 */
export const fcfs: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(tiebreak)[0] ?? null;
  },

  shouldPreempt() {
    return false;
  },

  isQuantumExpired() {
    return false;
  },
};
