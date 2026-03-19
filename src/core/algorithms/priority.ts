import type { ProcessRuntime } from "../types";
import type { SchedulerAlgorithm } from "./index";
import { tiebreak } from "./utils";

function prioritySort(a: ProcessRuntime, b: ProcessRuntime): number {
  // Lower number = higher priority
  if (a.currentPriority !== b.currentPriority)
    return a.currentPriority - b.currentPriority;
  return tiebreak(a, b);
}

/**
 * Priority Non-Preemptive
 * Selects process with lowest priority number; does not interrupt running process.
 */
export const priorityNp: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(prioritySort)[0] ?? null;
  },

  shouldPreempt() {
    return false;
  },

  isQuantumExpired() {
    return false;
  },
};

/**
 * Priority Preemptive
 * Preempts running process if a higher-priority (lower number) process arrives.
 * Aging is applied by the engine — currentPriority decrements over time.
 */
export const priorityP: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(prioritySort)[0] ?? null;
  },

  shouldPreempt(current, candidate) {
    return candidate.currentPriority < current.currentPriority;
  },

  isQuantumExpired() {
    return false;
  },
};
