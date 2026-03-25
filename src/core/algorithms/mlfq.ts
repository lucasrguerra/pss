import type { MlfqLevelDef, ProcessRuntime, SchedulerConfig } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * MLFQ — Multilevel Feedback Queue (Fila Multinível com Retroalimentação)
 *
 * Ao contrário do MLQ, os processos não são atribuídos permanentemente a filas.
 * Em vez disso, o comportamento de CPU de cada processo determina dinamicamente
 * em qual nível ele se encontra:
 *
 *   - Todos os novos processos entram no nível 0 (maior prioridade).
 *   - Quando um processo esgota seu quantum, é rebaixado ao nível seguinte.
 *   - Quando um processo retorna de I/O, permanece no mesmo nível (sem rebaixamento).
 *   - Processos em níveis mais altos preemptam processos em níveis mais baixos.
 *   - Se `mlfqBoostInterval > 0`, processos que esperarem ≥ N ticks são
 *     promovidos ao nível 0 para evitar inanição.
 *
 * Cada nível tem seu próprio quantum. O último nível não sofre mais rebaixamentos.
 * Dentro de um nível, a seleção é FIFO (por arrivalTick, depois processId).
 */
export class MLFQAlgorithm extends BaseAlgorithm {
  readonly name = "Multilevel Feedback Queue (MLFQ)";
  readonly description =
    "Filas de prioridade dinâmicas: novos processos entram no nível 0 e são " +
    "rebaixados ao usar todo o quantum. Retorno de I/O não causa rebaixamento. " +
    "Boost opcional promove processos que esperaram muito tempo de volta ao nível 0.";
  readonly isPreemptiveCapable = true;
  readonly usesQuantum = true;

  static readonly DEFAULT_LEVELS: MlfqLevelDef[] = [
    { quantum: 2 },
    { quantum: 4 },
    { quantum: 8 },
  ];

  select(
    readyQueue: readonly ProcessRuntime[],
    config: SchedulerConfig,
  ): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;

    const levels = config.mlfqLevels ?? MLFQAlgorithm.DEFAULT_LEVELS;
    const maxLevel = levels.length - 1;
    const boostInterval = config.mlfqBoostInterval ?? 0;

    // Phase 1 — initialize new processes and apply demotion.
    // A process with quantumRemaining <= 0 and an already-initialized mlfqLevel
    // was preempted by quantum expiry → demote it.
    for (const rt of readyQueue) {
      if (rt.mlfqLevel === undefined) {
        // New process: assign level 0.
        rt.mlfqLevel = 0;
      } else if (rt.quantumRemaining <= 0) {
        // Quantum-expired: demote (capped at last level).
        rt.mlfqLevel = Math.min(rt.mlfqLevel + 1, maxLevel);
        // Set sentinel so we don't demote again before the next dispatch.
        rt.quantumRemaining = 1;
      }
      // quantumRemaining > 0 → returned from I/O or priority-preempted; no demotion.
    }

    // Phase 2 — priority boost.
    if (boostInterval > 0) {
      for (const rt of readyQueue) {
        if ((rt.mlfqLevel ?? 0) > 0 && rt.waitingTime >= boostInterval) {
          rt.mlfqLevel = 0;
        }
      }
    }

    // Phase 3 — pick the process at the highest level (lowest index), FIFO within.
    let best: ProcessRuntime | null = null;
    for (const rt of readyQueue) {
      if (best === null) {
        best = rt;
        continue;
      }
      const rtLevel = rt.mlfqLevel ?? 0;
      const bestLevel = best.mlfqLevel ?? 0;
      if (
        rtLevel < bestLevel ||
        (rtLevel === bestLevel && BaseAlgorithm.tiebreak(rt, best) < 0)
      ) {
        best = rt;
      }
    }
    return best;
  }

  shouldPreempt(
    current: ProcessRuntime,
    candidate: ProcessRuntime,
    _config: SchedulerConfig,
  ): boolean {
    // A candidate at a higher-priority level (lower index) preempts the running process.
    return (candidate.mlfqLevel ?? 0) < (current.mlfqLevel ?? 0);
  }

  isQuantumExpired(
    runtime: ProcessRuntime,
    _config: SchedulerConfig,
  ): boolean {
    return runtime.quantumRemaining <= 0;
  }

  override getQuantumForProcess(
    runtime: ProcessRuntime,
    config: SchedulerConfig,
  ): number {
    const levels = config.mlfqLevels ?? MLFQAlgorithm.DEFAULT_LEVELS;
    const level = runtime.mlfqLevel ?? 0;
    return levels[level]?.quantum ?? config.quantum;
  }
}
