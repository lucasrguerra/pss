import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * Comparador interno compartilhado pelas duas variantes do SJF.
 * Ordena por menor burst restante; usa tiebreak padrão em caso de empate.
 */
function sjfSort(a: ProcessRuntime, b: ProcessRuntime): number {
  if (a.remainingBurst !== b.remainingBurst)
    return a.remainingBurst - b.remainingBurst;
  return BaseAlgorithm.tiebreak(a, b);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SJF Não-Preemptivo — Shortest Job First
 *
 * Seleciona o processo com o menor burst de CPU restante. Uma vez que um
 * processo ocupa a CPU, ele roda até terminar (não pode ser interrompido).
 * Ótimo em tempo médio de espera, mas pode causar inanição (starvation)
 * de processos longos se processos curtos chegam continuamente.
 */
export class SJFNonPreemptiveAlgorithm extends BaseAlgorithm {
  readonly name = "Shortest Job First — Não-Preemptivo (SJF)";
  readonly description =
    "Seleciona o processo com menor burst restante. Não-preemptivo: " +
    "o processo rodando não pode ser interrompido. Minimiza o tempo " +
    "médio de espera, mas pode causar inanição de processos longos.";
  readonly isPreemptiveCapable = false;
  readonly usesQuantum = false;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(sjfSort)[0] ?? null;
  }

  shouldPreempt(): boolean {
    return false;
  }

  isQuantumExpired(): boolean {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SRTF — Shortest Remaining Time First (SJF Preemptivo)
 *
 * Variante preemptiva do SJF. A cada tick, se um processo recém-chegado
 * tem burst restante estritamente menor que o processo em execução, ocorre
 * preempção. Burst igual não gera troca (evita context switches desnecessários).
 * Produz o menor tempo médio de espera possível entre todos os algoritmos,
 * porém com maior overhead de trocas de contexto.
 */
export class SRTFAlgorithm extends BaseAlgorithm {
  readonly name = "Shortest Remaining Time First (SRTF)";
  readonly description =
    "Variante preemptiva do SJF. Preempta o processo rodando sempre que " +
    "um processo mais curto fica disponível. Otimiza o tempo médio de " +
    "espera, mas gera mais trocas de contexto.";
  readonly isPreemptiveCapable = true;
  readonly usesQuantum = false;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(sjfSort)[0] ?? null;
  }

  shouldPreempt(current: ProcessRuntime, candidate: ProcessRuntime): boolean {
    return candidate.remainingBurst < current.remainingBurst;
  }

  isQuantumExpired(): boolean {
    return false;
  }
}
