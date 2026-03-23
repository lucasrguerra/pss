import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * FCFS — First Come, First Served (Primeiro a Chegar, Primeiro a Ser Servido)
 *
 * Algoritmo não-preemptivo mais simples: processa os jobs na ordem exata
 * de chegada. Fácil de implementar, mas pode causar o "efeito comboio"
 * (convoy effect), onde processos curtos ficam presos atrás de um longo.
 */
export class FCFSAlgorithm extends BaseAlgorithm {
  readonly name = "First Come, First Served (FCFS)";
  readonly description =
    "Não-preemptivo. Despacha processos na ordem de chegada. " +
    "Simples, mas pode causar o efeito comboio: processos curtos " +
    "aguardam atrás de um processo longo.";
  readonly isPreemptiveCapable = false;
  readonly usesQuantum = false;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(FCFSAlgorithm.tiebreak)[0] ?? null;
  }

  shouldPreempt(): boolean {
    return false;
  }

  isQuantumExpired(): boolean {
    return false;
  }
}
