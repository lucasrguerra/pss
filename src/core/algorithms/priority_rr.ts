import type { SchedulerAlgorithm } from "./index";

/**
 * Priority Round Robin (PRIORITY_RR)
 *
 * Mimics real-OS scheduling (Windows priority bands, POSIX SCHED_RR):
 *
 * - The ready queue is conceptually divided into priority bands.
 * - The scheduler always dispatches from the highest-priority band
 *   (lowest numeric value), leaving lower-priority processes waiting.
 * - Within the same priority band, processes share the CPU via round-robin
 *   with the configured quantum — fairness among equals.
 * - A running process is preempted immediately when a STRICTLY higher-priority
 *   process becomes ready (arrival or I/O completion).
 * - Quantum expiry only rotates within the same priority band; it does not
 *   allow a lower-priority process to run while a same-priority one is waiting.
 * - Compatible with the aging mechanism: as low-priority processes age their
 *   currentPriority decreases, eventually entering a higher-priority band.
 */
export const priorityRr: SchedulerAlgorithm = {
  select(readyQueue) {
    if (readyQueue.length === 0) return null;

    // Find the highest priority level (smallest numeric value) present.
    let bestPriority = Infinity;
    for (const rt of readyQueue) {
      if (rt.currentPriority < bestPriority) bestPriority = rt.currentPriority;
    }

    // Within that band, return the first process (FIFO insertion order).
    // The engine maintains insertion order, so this gives round-robin rotation
    // after quantum expiry: the expired process goes to the tail, the next
    // same-priority process is now at the head.
    return readyQueue.find(rt => rt.currentPriority === bestPriority) ?? null;
  },

  // Preempt ONLY for strictly higher priority.
  // Same-priority candidates are handled by quantum expiry — no unnecessary
  // context switches within a priority band.
  shouldPreempt(current, candidate) {
    return candidate.currentPriority < current.currentPriority;
  },

  // Quantum expiry drives round-robin rotation within a priority band,
  // exactly like plain Round Robin.
  isQuantumExpired(runtime) {
    return runtime.quantumRemaining <= 0;
  },
};
