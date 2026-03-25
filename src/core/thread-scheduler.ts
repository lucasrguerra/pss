// ============================================================
// ThreadScheduler — Escalonamento intra-processo de threads
// ============================================================
//
// Responsável por selecionar qual thread executa dentro de um processo
// quando ele recebe tempo de CPU. Suporta três políticas:
//
//   FCFS     — FIFO estrito por ordem de chegada (arrivalTick)
//   RR       — Round-Robin com quantum intra-processo
//   PRIORITY — Prioridade da thread (currentPriority, menor = maior prioridade)

import type { IntraProcessPolicy, ThreadRuntime } from "./types";

export class ThreadScheduler {
  readonly policy: IntraProcessPolicy;
  readonly quantum: number;

  constructor(policy: IntraProcessPolicy = "FCFS", quantum = 2) {
    this.policy = policy;
    this.quantum = quantum;
  }

  /**
   * Seleciona a próxima thread a executar a partir da fila de prontas.
   * Não modifica o array — o engine remove a thread selecionada.
   */
  select(readyThreads: readonly ThreadRuntime[]): ThreadRuntime | null {
    if (readyThreads.length === 0) return null;

    switch (this.policy) {
      case "FCFS":
        // Primeira a chegar, primeira a ser servida
        return [...readyThreads].sort(
          (a, b) =>
            a.arrivalTick - b.arrivalTick ||
            a.threadId.localeCompare(b.threadId),
        )[0] ?? null;

      case "RR":
        // Ordem de fila (o engine mantém a ordem FIFO ao reinserir)
        return readyThreads[0] ?? null;

      case "PRIORITY":
        // Menor currentPriority = maior prioridade; desempate por arrivalTick
        return [...readyThreads].sort(
          (a, b) =>
            a.currentPriority - b.currentPriority ||
            a.arrivalTick - b.arrivalTick ||
            a.threadId.localeCompare(b.threadId),
        )[0] ?? null;
    }
  }

  /**
   * Verifica se o quantum intra-processo da thread expirou.
   * Apenas relevante para política RR.
   */
  isQuantumExpired(thread: ThreadRuntime): boolean {
    return this.policy === "RR" && thread.quantumRemaining <= 0;
  }

  /**
   * Para política PRIORITY: indica se a thread candidata deve preemptar a atual.
   */
  shouldPreemptThread(
    current: ThreadRuntime,
    candidate: ThreadRuntime,
  ): boolean {
    return (
      this.policy === "PRIORITY" &&
      candidate.currentPriority < current.currentPriority
    );
  }
}
