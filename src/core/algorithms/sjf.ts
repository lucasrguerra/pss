import type { ProcessRuntime } from "../types";
import type { SchedulerAlgorithm } from "./index";
import { tiebreak } from "./utils";

function sjfSort(a: ProcessRuntime, b: ProcessRuntime): number {
  if (a.remainingBurst !== b.remainingBurst)
    return a.remainingBurst - b.remainingBurst;
  return tiebreak(a, b);
}

/**
 * SJF Non-Preemptive — Shortest Job First
 * Selects the process with the smallest remaining burst; no preemption.
 */
export const sjfNp: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(sjfSort)[0] ?? null;
  },

  shouldPreempt() {
    return false;
  },

  isQuantumExpired() {
    return false;
  },
};

/**
 * SRTF — Shortest Remaining Time First (SJF Preemptive)
 * At each tick, preempts if a ready process has strictly smaller remainingBurst.
 * Equal remaining burst → no preemption (avoids unnecessary context switches).
 */
export const srtf: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(sjfSort)[0] ?? null;
  },

  shouldPreempt(current, candidate) {
    return candidate.remainingBurst < current.remainingBurst;
  },

  isQuantumExpired() {
    return false;
  },
};
