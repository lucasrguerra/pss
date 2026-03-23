import type { ProcessRuntime } from "../types";
import { BaseAlgorithm } from "./base";

/**
 * Comparador interno compartilhado pelas duas variantes de Prioridade.
 * Menor número = maior prioridade. Usa tiebreak padrão em caso de empate.
 */
function prioritySort(a: ProcessRuntime, b: ProcessRuntime): number {
  if (a.currentPriority !== b.currentPriority)
    return a.currentPriority - b.currentPriority;
  return BaseAlgorithm.tiebreak(a, b);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Priority Não-Preemptivo
 *
 * Seleciona o processo com maior prioridade (menor número). Uma vez que
 * um processo ocupa a CPU, ele roda até terminar — novos processos de alta
 * prioridade precisam esperar. Pode causar inanição (starvation) de processos
 * de baixa prioridade. O mecanismo de aging, quando ativado, incrementa
 * gradualmente a prioridade de processos em espera.
 */
export class PriorityNonPreemptiveAlgorithm extends BaseAlgorithm {
  readonly name = "Escalonamento por Prioridade — Não-Preemptivo";
  readonly description =
    "Despacha o processo de maior prioridade (menor número). Não-preemptivo: " +
    "o processo atual não é interrompido por novos de alta prioridade. " +
    "Pode causar inanição; use aging para mitigar.";
  readonly isPreemptiveCapable = false;
  readonly usesQuantum = false;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(prioritySort)[0] ?? null;
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
 * Priority Preemptivo
 *
 * Variante preemptiva: o processo em execução é interrompido imediatamente
 * ao chegar um processo com prioridade estritamente maior (número menor).
 * Prioridade igual não causa preempção (evita context switches desnecessários).
 * O aging, quando ativado no engine, decrementa `currentPriority` a cada
 * intervalo, prevenindo inanição de processos de baixa prioridade.
 */
export class PriorityPreemptiveAlgorithm extends BaseAlgorithm {
  readonly name = "Escalonamento por Prioridade — Preemptivo";
  readonly description =
    "Preempta o processo em execução quando um de maior prioridade fica pronto. " +
    "Prioridade igual não gera preempção. Suporta aging para evitar inanição.";
  readonly isPreemptiveCapable = true;
  readonly usesQuantum = false;

  select(readyQueue: readonly ProcessRuntime[]): ProcessRuntime | null {
    if (readyQueue.length === 0) return null;
    return [...readyQueue].sort(prioritySort)[0] ?? null;
  }

  shouldPreempt(current: ProcessRuntime, candidate: ProcessRuntime): boolean {
    return candidate.currentPriority < current.currentPriority;
  }

  isQuantumExpired(): boolean {
    return false;
  }
}
