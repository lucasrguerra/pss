import type { SchedulerAlgorithm } from "./index";

/**
 * RR — Round Robin
 * FIFO queue with a configurable quantum.
 * select() returns the front of the queue (insertion-order maintained by engine).
 * Preemption is driven by quantum expiry, not by a better candidate.
 */
export const rr: SchedulerAlgorithm = {
  select(readyQueue) {
    return readyQueue[0] ?? null;
  },

  // RR does not preempt based on candidate priority; quantum expiry handles it.
  shouldPreempt() {
    return false;
  },

  isQuantumExpired(runtime) {
    return runtime.quantumRemaining <= 0;
  },
};
