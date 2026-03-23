import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * RR — Round Robin
 *
 * Mantém a fila de prontos como FIFO e concede a cada processo uma fatia
 * de tempo (quantum). Ao esgotar o quantum, o processo vai para o fim da
 * fila e o próximo assume a CPU. Garante justiça e baixo tempo de resposta,
 * ao custo de maior tempo de turnaround para processos curtos.
 *
 * A rotação é garantida pelo engine: ao expirar o quantum, o processo é
 * reinserido no final da fila — select() simplesmente retorna o primeiro.
 */
export class RoundRobinAlgorithm extends BaseAlgorithm {
  readonly name = "Round Robin (RR)";
  readonly description =
    "Fila FIFO com quantum configurável. Cada processo recebe uma fatia " +
    "de tempo igual. Garante justiça e baixo tempo de resposta, mas pode " +
    "aumentar o turnaround de processos longos.";
  readonly isPreemptiveCapable = false; // preempção é por expiração de quantum, não por candidato
  readonly usesQuantum = true;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    return readyQueue[0] ?? null;
  }

  // RR não preempta por candidato mais prioritário; a troca ocorre via quantum.
  shouldPreempt(): boolean {
    return false;
  }

  isQuantumExpired(runtime: ProcessRuntime): boolean {
    return runtime.quantumRemaining <= 0;
  }
}
