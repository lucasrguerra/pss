import type { MlqQueueDef, ProcessRuntime, SchedulerConfig } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * MLQ — Multilevel Queue (Fila Multinível)
 *
 * Processos são atribuídos permanentemente a filas com base em sua prioridade.
 * Cada fila tem seu próprio algoritmo interno (FCFS, RR ou PRIORITY_NP).
 *
 * Comportamento entre filas:
 *   - O escalonador sempre despacha da fila de maior prioridade não-vazia (índice 0).
 *   - Um processo de fila superior sempre preempta um processo de fila inferior.
 *   - Nenhum processo de fila inferior executa enquanto houver processos em fila superior.
 *
 * Comportamento dentro de cada fila:
 *   - FCFS: despacha na ordem de chegada; sem preempção interna.
 *   - RR:   rodízio usando o quantum da fila; sem preempção interna.
 *   - PRIORITY_NP: despacha o de maior prioridade; sem preempção interna.
 *
 * A configuração das filas vem de `config.mlqQueues`; se ausente, usa as
 * filas padrão definidas em `DEFAULT_QUEUES`.
 */
export class MultilevelQueueAlgorithm extends BaseAlgorithm {
  readonly name = "Multilevel Queue (MLQ)";
  readonly description =
    "Filas de prioridade fixas, cada uma com seu algoritmo interno (FCFS, RR, PRIORITY_NP). " +
    "A fila de maior prioridade sempre executa primeiro. Processos são atribuídos " +
    "permanentemente a uma fila conforme sua prioridade.";
  readonly isPreemptiveCapable = true;
  readonly usesQuantum = true; // verdadeiro porque a fila RR usa quantum

  /** Configuração padrão: 3 filas cobrindo prioridades 1–10. */
  private static readonly DEFAULT_QUEUES: MlqQueueDef[] = [
    { priorityMin: 1, priorityMax: 3, algorithm: "RR",          quantum: 2 },
    { priorityMin: 4, priorityMax: 7, algorithm: "PRIORITY_NP", quantum: 2 },
    { priorityMin: 8, priorityMax: 10, algorithm: "FCFS",       quantum: 2 },
  ];

  /**
   * Retorna o índice da fila à qual pertence o valor de prioridade informado.
   * Se a prioridade não se enquadrar em nenhuma fila definida, usa a última.
   */
  private static getQueueIndex(
    priority: number,
    queues: readonly MlqQueueDef[],
  ): number {
    for (let i = 0; i < queues.length; i++) {
      const q = queues[i]!;
      if (priority >= q.priorityMin && priority <= q.priorityMax) return i;
    }
    return queues.length - 1;
  }

  /**
   * Seleciona o melhor candidato dentro de uma sub-fila usando o algoritmo
   * definido para ela (RR, FCFS ou PRIORITY_NP).
   */
  private static selectWithinQueue(
    candidates: readonly ProcessRuntime[],
    queueDef: MlqQueueDef,
  ): ProcessRuntime | null {
    if (candidates.length === 0) return null;

    if (queueDef.algorithm === "RR") {
      // RR: despacha na ordem de inserção (engine mantém FIFO).
      return candidates[0]!;
    }

    if (queueDef.algorithm === "FCFS") {
      // FCFS: despacha o de chegada mais antiga (arrivalTick, depois processId).
      return candidates.reduce((best, rt) =>
        BaseAlgorithm.tiebreak(rt, best) < 0 ? rt : best,
      );
    }

    // PRIORITY_NP: despacha o de maior prioridade (menor número).
    let best = candidates[0]!;
    for (let i = 1; i < candidates.length; i++) {
      const rt = candidates[i]!;
      if (
        rt.currentPriority < best.currentPriority ||
        (rt.currentPriority === best.currentPriority &&
          BaseAlgorithm.tiebreak(rt, best) < 0)
      ) {
        best = rt;
      }
    }
    return best;
  }

  select(
    readyQueue: readonly ProcessRuntime[],
    config: SchedulerConfig,
  ): ProcessRuntime | null {
    const queues = config.mlqQueues ?? MultilevelQueueAlgorithm.DEFAULT_QUEUES;
    if (queues.length === 0) return null;

    // Itera da fila de maior prioridade (índice 0) para a de menor.
    for (let qi = 0; qi < queues.length; qi++) {
      const queueDef = queues[qi]!;
      const candidates = readyQueue.filter(
        (rt) => MultilevelQueueAlgorithm.getQueueIndex(rt.currentPriority, queues) === qi,
      );
      const selected = MultilevelQueueAlgorithm.selectWithinQueue(candidates, queueDef);
      if (selected !== null) return selected;
    }
    return null;
  }

  shouldPreempt(
    current: ProcessRuntime,
    candidate: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean {
    const queues = config.mlqQueues ?? MultilevelQueueAlgorithm.DEFAULT_QUEUES;
    const currentQueueIdx = MultilevelQueueAlgorithm.getQueueIndex(current.currentPriority, queues);
    const candidateQueueIdx = MultilevelQueueAlgorithm.getQueueIndex(candidate.currentPriority, queues);
    // Preempta apenas se o candidato pertence a uma fila de prioridade estritamente maior.
    return candidateQueueIdx < currentQueueIdx;
  }

  isQuantumExpired(
    runtime: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean {
    const queues = config.mlqQueues ?? MultilevelQueueAlgorithm.DEFAULT_QUEUES;
    const queueIdx = MultilevelQueueAlgorithm.getQueueIndex(runtime.currentPriority, queues);
    const queueDef = queues[queueIdx];
    if (!queueDef) return false;
    return queueDef.algorithm === "RR" && runtime.quantumRemaining <= 0;
  }
}
