import type { ProcessRuntime } from "../types";
import type { SchedulerAlgorithm } from "./index";
import { tiebreak } from "./utils";

function hrrnRatio(rt: ProcessRuntime): number {
  // ratio = (waitingTime + burstTime) / burstTime
  // remainingBurst > 0 is guaranteed for processes in the ready queue
  if (rt.remainingBurst <= 0) return Infinity;
  return (rt.waitingTime + rt.remainingBurst) / rt.remainingBurst;
}

/**
 * HRRN — Highest Response Ratio Next
 * Non-preemptive. Balances waiting time and burst length to prevent starvation.
 */
export const hrrn: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort((a, b) => {
      const ratioDiff = hrrnRatio(b) - hrrnRatio(a); // descending
      if (ratioDiff !== 0) return ratioDiff;
      return tiebreak(a, b);
    })[0] ?? null;
  },

  shouldPreempt() {
    return false;
  },

  isQuantumExpired() {
    return false;
  },
};
