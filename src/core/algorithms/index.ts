import type { ProcessRuntime, SchedulerConfig, SchedulingAlgorithm } from "../types";
import { fcfs } from "./fcfs";
import { sjfNp, srtf } from "./sjf";
import { rr } from "./rr";
import { priorityNp, priorityP } from "./priority";
import { hrrn } from "./hrrn";
import { multilevel } from "./multilevel";

// ============================================================
// SchedulerAlgorithm interface
// All implementations must be pure (no mutation of the queue).
// ============================================================

export interface SchedulerAlgorithm {
  /**
   * Select the best process to dispatch from the ready queue.
   * Returns null if the queue is empty.
   * Must NOT mutate the array; the engine handles removal.
   */
  select(
    readyQueue: readonly ProcessRuntime[],
    config: SchedulerConfig,
  ): ProcessRuntime | null;

  /**
   * For preemptive algorithms: should the currently-running process
   * be replaced by `candidate`?
   * Called only when cpuProcess != null and a candidate exists.
   */
  shouldPreempt(
    current: ProcessRuntime,
    candidate: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean;

  /**
   * RR only: has the process exhausted its quantum?
   * For all other algorithms this must return false.
   */
  isQuantumExpired(
    runtime: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean;
}

// ============================================================
// Dispatch table — engine looks up algorithm by name
// ============================================================

export const algorithms: Record<SchedulingAlgorithm, SchedulerAlgorithm> = {
  FCFS: fcfs,
  SJF_NP: sjfNp,
  SJF_P: srtf,
  RR: rr,
  PRIORITY_NP: priorityNp,
  PRIORITY_P: priorityP,
  HRRN: hrrn,
  MULTILEVEL: multilevel,
};
