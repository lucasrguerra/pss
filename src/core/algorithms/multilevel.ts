import type { MlqQueueDef, ProcessRuntime } from "../types";
import type { SchedulerAlgorithm } from "./index";
import { tiebreak } from "./utils";

/**
 * MULTILEVEL — Multilevel Queue Scheduling
 *
 * Processes are permanently assigned to a queue based on their currentPriority.
 * The scheduler always dispatches from the highest-priority non-empty queue.
 * Each queue has its own scheduling algorithm (FCFS, RR, or PRIORITY_NP).
 *
 * Inter-queue behaviour:
 *   - A process from a higher-priority queue always preempts a process
 *     from a lower-priority queue.
 *   - No process from a lower-priority queue runs while a higher-priority
 *     queue has processes.
 *
 * Intra-queue behaviour:
 *   - FCFS: dispatch in arrival order; no preemption within the queue.
 *   - RR: round-robin using the queue's own quantum; no cross-queue switching.
 *   - PRIORITY_NP: dispatch the highest currentPriority process; no preemption.
 *
 * Queue assignment is derived from config.mlqQueues. Each queue definition
 * specifies [priorityMin, priorityMax] (both inclusive). If a process's
 * currentPriority falls outside all queues, it is assigned to the last queue.
 */

/** Returns the index of the queue that owns this priority value (0 = highest). */
function getQueueIndex(priority: number, queues: readonly MlqQueueDef[]): number {
  for (let i = 0; i < queues.length; i++) {
    const q = queues[i]!;
    if (priority >= q.priorityMin && priority <= q.priorityMax) return i;
  }
  // Fallback: assign to last queue if priority is out of all defined ranges.
  return queues.length - 1;
}

/** Select the best candidate from a sub-queue using the queue's algorithm. */
function selectWithinQueue(
  candidates: readonly ProcessRuntime[],
  queueDef: MlqQueueDef,
): ProcessRuntime | null {
  if (candidates.length === 0) return null;

  if (queueDef.algorithm === "RR") {
    // RR: dispatch in insertion order (engine tail-appends on preemption).
    return candidates[0]!;
  }

  if (queueDef.algorithm === "FCFS") {
    // FCFS: dispatch earliest-arriving process (by arrivalTick, then processId).
    return candidates.reduce((best, rt) =>
      tiebreak(rt, best) < 0 ? rt : best,
    );
  }

  // PRIORITY_NP: dispatch the process with the lowest currentPriority number.
  let best = candidates[0]!;
  for (let i = 1; i < candidates.length; i++) {
    const rt = candidates[i]!;
    if (
      rt.currentPriority < best.currentPriority ||
      (rt.currentPriority === best.currentPriority && tiebreak(rt, best) < 0)
    ) {
      best = rt;
    }
  }
  return best;
}

const DEFAULT_QUEUES: MlqQueueDef[] = [
  { priorityMin: 1, priorityMax: 3, algorithm: "RR", quantum: 2 },
  { priorityMin: 4, priorityMax: 7, algorithm: "PRIORITY_NP", quantum: 2 },
  { priorityMin: 8, priorityMax: 10, algorithm: "FCFS", quantum: 2 },
];

export const multilevel: SchedulerAlgorithm = {
  select(readyQueue, config): ProcessRuntime | null {
    const queues = config.mlqQueues ?? DEFAULT_QUEUES;
    if (queues.length === 0) return null;

    // Iterate from highest-priority queue (index 0) to lowest.
    for (let qi = 0; qi < queues.length; qi++) {
      const queueDef = queues[qi]!;
      const candidates = readyQueue.filter(
        (rt) => getQueueIndex(rt.currentPriority, queues) === qi,
      );
      const selected = selectWithinQueue(candidates, queueDef);
      if (selected !== null) return selected;
    }
    return null;
  },

  shouldPreempt(current, candidate, config): boolean {
    const queues = config.mlqQueues ?? DEFAULT_QUEUES;
    const currentQueueIdx = getQueueIndex(current.currentPriority, queues);
    const candidateQueueIdx = getQueueIndex(candidate.currentPriority, queues);
    // Preempt only if the candidate belongs to a strictly higher-priority queue.
    return candidateQueueIdx < currentQueueIdx;
  },

  isQuantumExpired(runtime, config): boolean {
    const queues = config.mlqQueues ?? DEFAULT_QUEUES;
    const queueIdx = getQueueIndex(runtime.currentPriority, queues);
    const queueDef = queues[queueIdx];
    if (!queueDef) return false;
    return queueDef.algorithm === "RR" && runtime.quantumRemaining <= 0;
  },
};
