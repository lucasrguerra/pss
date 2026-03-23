import type { ProcessRuntime, SchedulerConfig } from "../types";
import { tiebreak as _tiebreak } from "./utils";

/**
 * BaseAlgorithm — Classe abstrata para algoritmos de escalonamento.
 *
 * Cada algoritmo concreto deve implementar:
 *   - Propriedades educacionais (name, description, isPreemptiveCapable, usesQuantum)
 *   - Os três métodos do contrato de escalonamento (select, shouldPreempt, isQuantumExpired)
 *
 * O método estático `tiebreak` é disponibilizado a todas as subclasses como
 * critério de desempate padrão: chegada mais cedo → ID lexicográfico menor.
 */
export abstract class BaseAlgorithm {
  /** Nome completo do algoritmo para exibição. */
  abstract readonly name: string;

  /** Breve descrição educacional do comportamento do algoritmo. */
  abstract readonly description: string;

  /** Indica se o algoritmo suporta preempção por candidato mais prioritário. */
  abstract readonly isPreemptiveCapable: boolean;

  /** Indica se o algoritmo usa fatia de tempo (quantum). */
  abstract readonly usesQuantum: boolean;

  // ─── Contrato de escalonamento ───────────────────────────────────────────

  /**
   * Seleciona o próximo processo a executar a partir da fila de prontos.
   * Não deve modificar o array — o engine remove o processo selecionado.
   * Retorna null se a fila estiver vazia.
   */
  abstract select(
    readyQueue: readonly ProcessRuntime[],
    config: SchedulerConfig,
  ): ProcessRuntime | null;

  /**
   * Para algoritmos preemptivos: indica se o processo em execução deve ser
   * interrompido em favor do candidato selecionado.
   * Chamado apenas quando há um processo rodando e um candidato disponível.
   */
  abstract shouldPreempt(
    current: ProcessRuntime,
    candidate: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean;

  /**
   * Para Round Robin: indica se o quantum do processo expirou.
   * Todos os outros algoritmos devem retornar false.
   */
  abstract isQuantumExpired(
    runtime: ProcessRuntime,
    config: SchedulerConfig,
  ): boolean;

  // ─── Helper compartilhado ────────────────────────────────────────────────

  /**
   * Critério de desempate padrão: chegada mais cedo (arrivalTick ASC),
   * depois ID do processo em ordem lexicográfica.
   * Disponível a todas as subclasses como método estático herdado.
   */
  public static tiebreak(a: ProcessRuntime, b: ProcessRuntime): number {
    return _tiebreak(a, b);
  }
}
