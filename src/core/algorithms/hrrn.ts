import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * HRRN — Highest Response Ratio Next
 *
 * Algoritmo não-preemptivo que equilibra o tempo de burst e o tempo de espera
 * para evitar inanição. A cada decisão de escalonamento, calcula a razão de
 * resposta de cada processo na fila e despacha o de maior razão.
 *
 * Fórmula:  ratio = (waitingTime + remainingBurst) / remainingBurst
 *
 * - Processos longos que esperam muito aumentam sua razão, evitando inanição.
 * - Processos curtos naturalmente têm razão alta (denominador pequeno).
 * - Oferece um balanço entre SJF (favorece curtos) e FCFS (favorece chegada).
 */
export class HRRNAlgorithm extends BaseAlgorithm {
  readonly name = "Highest Response Ratio Next (HRRN)";
  readonly description =
    "Não-preemptivo. Despacha o processo com maior razão de resposta: " +
    "(espera + burst) / burst. Equilibra duração e tempo de espera, " +
    "prevenindo inanição sem precisar de aging explícito.";
  readonly isPreemptiveCapable = false;
  readonly usesQuantum = false;

  /**
   * Calcula a razão de resposta de um processo.
   * Retorna Infinity se remainingBurst <= 0 (não deve ocorrer na fila de prontos,
   * mas garante ordenação segura em casos de borda).
   */
  private static hrrnRatio(rt: ProcessRuntime): number {
    if (rt.remainingBurst <= 0) return Infinity;
    return (rt.waitingTime + rt.remainingBurst) / rt.remainingBurst;
  }

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort((a, b) => {
      const ratioDiff = HRRNAlgorithm.hrrnRatio(b) - HRRNAlgorithm.hrrnRatio(a); // descendente
      if (ratioDiff !== 0) return ratioDiff;
      return HRRNAlgorithm.tiebreak(a, b);
    })[0] ?? null;
  }

  shouldPreempt(): boolean {
    return false;
  }

  isQuantumExpired(): boolean {
    return false;
  }
}
