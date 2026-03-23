import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * Priority Round Robin (PRIORITY_RR)
 *
 * Combina escalonamento por prioridade com rodízio dentro de cada banda:
 *
 * - A fila de prontos é dividida conceitualmente em bandas de prioridade.
 * - O escalonador sempre despacha da banda de maior prioridade (menor número),
 *   mantendo processos de menor prioridade em espera.
 * - Dentro de uma mesma banda, os processos compartilham a CPU via round-robin
 *   com o quantum configurado — garantindo justiça entre iguais.
 * - Preempção ocorre imediatamente ao chegar um processo de prioridade
 *   estritamente maior; prioridade igual é tratada pelo quantum.
 * - Compatível com aging: ao diminuir `currentPriority`, processos de baixa
 *   prioridade eventualmente sobem de banda, prevenindo inanição.
 *
 * Simula o comportamento de SOs reais como Windows (priority bands)
 * e POSIX SCHED_RR.
 */
export class PriorityRoundRobinAlgorithm extends BaseAlgorithm {
  readonly name = "Priority Round Robin (PRR)";
  readonly description =
    "Combina prioridade com round-robin dentro de cada banda. A banda mais " +
    "prioritária sempre executa primeiro; dentro da mesma banda, os processos " +
    "se revezam pelo quantum. Simula o escalonamento de SOs reais (Windows, POSIX).";
  readonly isPreemptiveCapable = true;
  readonly usesQuantum = true;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;

    // Localiza o nível de prioridade mais alto (menor valor numérico) presente.
    let bestPriority = Infinity;
    for (const rt of readyQueue) {
      if (rt.currentPriority < bestPriority) bestPriority = rt.currentPriority;
    }

    // Dentro da banda, retorna o primeiro processo (ordem de inserção = FIFO).
    // O engine insere processos expirados no final da fila, garantindo a rotação
    // round-robin: o processo que esgotou o quantum vai para o fim,
    // o próximo da mesma prioridade assume.
    return readyQueue.find(rt => rt.currentPriority === bestPriority) ?? null;
  }

  // Preempta APENAS por prioridade estritamente maior.
  // Processos de mesma prioridade são tratados pelo mecanismo de quantum —
  // evita trocas de contexto desnecessárias dentro da mesma banda.
  shouldPreempt(current: ProcessRuntime, candidate: ProcessRuntime): boolean {
    return candidate.currentPriority < current.currentPriority;
  }

  // A expiração do quantum conduz a rotação round-robin dentro da banda,
  // exatamente como no Round Robin puro.
  isQuantumExpired(runtime: ProcessRuntime): boolean {
    return runtime.quantumRemaining <= 0;
  }
}
