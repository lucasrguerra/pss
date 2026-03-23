import type {
  Process,
  ProcessRuntime,
  SchedulerConfig,
  SimTick,
  StateLabel,
} from "./types";
import { algorithms } from "./algorithms/index";
import type { BaseAlgorithm } from "./algorithms/index";

/**
 * SimulationEngine — Núcleo de execução da simulação de escalonamento.
 *
 * Responsável por avançar o simulador tick a tick, aplicando o algoritmo
 * de escalonamento configurado e mantendo o estado de todos os processos.
 *
 * Ciclo de vida de um único tick (método `step()`):
 *   1. Chegada        — processos cujo `arrivalTime` é igual ao tick atual
 *                       transitam New → Ready e entram na fila de prontos.
 *   2. Preempção      — o algoritmo decide se o processo em CPU deve ceder
 *                       lugar a um candidato mais prioritário.
 *   3. Despacho       — seleciona e despacha o próximo processo (com overhead
 *                       de troca de contexto, se configurado).
 *   4. Snapshot       — captura o estado de todos os processos neste tick.
 *   5. Passagem do tempo — decrementa bursts, acumula tempos de CPU/IO/espera.
 *   6. Aging          — decrementa prioridade dos processos em espera prolongada.
 *   7. Conclusões     — trata término de bursts de CPU e IO; avança para o
 *                       próximo burst ou termina o processo.
 *
 * Uso típico:
 * ```ts
 * const engine = new SimulationEngine(processes, config);
 * const ticks = engine.runAll(); // executa até todos os processos terminarem
 * ```
 *
 * Invariante: após `runAll()`, `isFinished` é `true` e todos os runtimes
 * têm `state === "Terminated"`.
 */
export class SimulationEngine {
  // ─── Campos privados ──────────────────────────────────────────────────────

  private readonly _processes: Process[];
  private readonly _config: SchedulerConfig;
  private readonly _algorithm: BaseAlgorithm;

  private _tick: number; // começa em -1; incrementado no início de step()
  private _runtimes: Map<string, ProcessRuntime>;
  private _cpuProcess: ProcessRuntime | null;
  private _readyQueue: ProcessRuntime[]; // array ordenado (FIFO para RR)
  private _ioQueue: ProcessRuntime[];
  private _contextSwitchRemaining: number;
  private _prevCpuProcessId: string | null; // para detectar troca de contexto

  // ─── Construtor ───────────────────────────────────────────────────────────

  constructor(processes: Process[], config: SchedulerConfig) {
    if (processes.length === 0) throw new Error("At least one process required");
    this._processes = processes;
    this._config = config;
    this._algorithm = algorithms[config.algorithm];
    this._tick = -1;
    this._cpuProcess = null;
    this._readyQueue = [];
    this._ioQueue = [];
    this._contextSwitchRemaining = 0;
    this._prevCpuProcessId = null;
    this._runtimes = new Map(
      processes.map((p) => [p.id, SimulationEngine._initRuntime(p, config)]),
    );
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  /**
   * Avança a simulação por um tick e retorna o snapshot do estado neste tick.
   *
   * Lança um erro se a simulação já tiver terminado (`isFinished === true`).
   * O número do tick é incrementado no início; o primeiro tick válido é 0.
   */
  step(): SimTick {
    if (this.isFinished) throw new Error("Simulation is already finished");

    this._tick++;

    this._handleArrivals();            // 1. New → Ready para quem chega agora
    this._checkPreemption();           // 2. Preempta CPU se candidato melhor chegou
    this._dispatchNext();              // 3. Despacha próximo (ou inicia context switch)
    const snapshot = this._snapshot(); // 4. Captura estado DURANTE este tick
    this._advanceTime();               // 5. Decrementa bursts, acumula métricas
    this._applyAging();                // 6. Aging de prioridade (se habilitado)
    this._handleCpuCompletion();       // 7a. Finaliza burst/quantum de CPU
    this._handleIoCompletions();       // 7b. Finaliza bursts de I/O

    return snapshot;
  }

  /** Executa até o fim e retorna todos os snapshots de tick. */
  runAll(): SimTick[] {
    const results: SimTick[] = [];
    while (!this.isFinished) {
      results.push(this.step());
      if (results.length > 10_000) {
        throw new Error("Simulation exceeded 10,000 ticks — check for infinite loop");
      }
    }
    return results;
  }

  /** Verdadeiro quando todos os processos estão no estado "Terminated". */
  get isFinished(): boolean {
    for (const rt of this._runtimes.values()) {
      if (rt.state !== "Terminated") return false;
    }
    return true;
  }

  /** Número do tick atual (−1 antes do primeiro `step()`). */
  get currentTick(): number {
    return this._tick;
  }

  /** Array com o estado de runtime de todos os processos. */
  get runtimeStates(): ProcessRuntime[] {
    return Array.from(this._runtimes.values());
  }

  // ─── Fases do ciclo de simulação ──────────────────────────────────────────

  /**
   * Fase 1 — Chegada de processos.
   *
   * Processos cujo `arrivalTime` é igual ao tick atual transitam do estado
   * "New" para "Ready" e são inseridos na fila de prontos.
   */
  private _handleArrivals(): void {
    for (const p of this._processes) {
      const rt = this._runtimes.get(p.id)!;
      if (p.arrivalTime === this._tick && rt.state === "New") {
        this._transition(rt, "Ready");
        this._readyQueue.push(rt);
      }
    }
  }

  /**
   * Fase 2 — Verificação de preempção.
   *
   * Consulta o algoritmo: se houver um candidato na fila de prontos que deva
   * preemptar o processo em CPU, o processo atual retorna à fila de prontos
   * e `_cpuProcess` é zerado. Chamado após a chegada para que processos
   * recém-chegados possam imediatamente preemptar.
   */
  private _checkPreemption(): void {
    if (this._cpuProcess === null || this._readyQueue.length === 0) return;
    const candidate = this._algorithm.select(this._readyQueue, this._config);
    if (
      candidate !== null &&
      this._algorithm.shouldPreempt(this._cpuProcess, candidate, this._config)
    ) {
      const cpu = this._cpuProcess;
      this._transition(cpu, "Ready");
      this._readyQueue.push(cpu);
      this._cpuProcess = null;
    }
  }

  /**
   * Fase 3 — Despacho / troca de contexto.
   *
   * Se um context switch estiver em andamento, nenhum processo é despachado
   * neste tick. Caso contrário, e se a CPU estiver ociosa com processos
   * prontos, o algoritmo seleciona o próximo processo:
   *
   *   - Se houver overhead de troca de contexto configurado e o processo
   *     selecionado for diferente do último, o processo volta ao início da
   *     fila e o contador de context-switch é iniciado.
   *   - Caso contrário, o processo é despachado imediatamente para a CPU.
   */
  private _dispatchNext(): void {
    if (this._contextSwitchRemaining > 0) return;
    if (this._cpuProcess !== null || this._readyQueue.length === 0) return;

    const next = this._algorithm.select(this._readyQueue, this._config);
    if (next === null) return;

    const idx = this._readyQueue.indexOf(next);
    if (idx !== -1) this._readyQueue.splice(idx, 1);

    if (
      this._config.contextSwitchTime > 0 &&
      this._prevCpuProcessId !== null &&
      this._prevCpuProcessId !== next.processId
    ) {
      this._readyQueue.unshift(next);
      this._contextSwitchRemaining = this._config.contextSwitchTime;
      this._prevCpuProcessId = next.processId;
    } else {
      if (next.startTick === null) next.startTick = this._tick;
      next.quantumRemaining = this._config.quantum;
      this._transition(next, "Running");
      this._prevCpuProcessId = next.processId;
      this._cpuProcess = next;
    }
  }

  /**
   * Fase 5 — Passagem do tempo.
   *
   * Simula a execução de 1 tick:
   *   - Decrementa o contador de context-switch restante (se ativo).
   *   - Decrementa o burst restante do processo em CPU e acumula cpuTime/quantum.
   *   - Decrementa o burst restante de cada processo em I/O e acumula ioTime.
   *   - Incrementa o waitingTime de todos os processos na fila de prontos.
   */
  private _advanceTime(): void {
    if (this._contextSwitchRemaining > 0) {
      this._contextSwitchRemaining--;
    }

    if (this._cpuProcess !== null) {
      const cpu = this._cpuProcess;
      cpu.remainingBurst--;
      cpu.cpuTime++;
      cpu.quantumRemaining--;
    }

    for (const rt of this._ioQueue) {
      rt.remainingBurst--;
      rt.ioTime++;
    }

    for (const rt of this._readyQueue) {
      rt.waitingTime++;
    }
  }

  /**
   * Fase 6 — Aging (envelhecimento de prioridade).
   *
   * Quando o aging está habilitado, a cada `agingInterval` ticks o valor de
   * `currentPriority` de todos os processos na fila de prontos é decrementado
   * em 1 (até o mínimo de 1). Isso previne inanição em algoritmos de prioridade.
   *
   * Não é executado no tick 0 para evitar decremento prematuro.
   */
  private _applyAging(): void {
    if (
      !this._config.agingEnabled ||
      this._tick === 0 ||
      this._tick % this._config.agingInterval !== 0
    ) {
      return;
    }
    for (const rt of this._readyQueue) {
      rt.currentPriority = Math.max(1, rt.currentPriority - 1);
    }
  }

  /**
   * Fase 7a — Conclusão de burst de CPU.
   *
   * Após a passagem do tempo, verifica se o processo em CPU terminou seu burst
   * ou esgotou o quantum:
   *
   *   - Burst zerado: avança para o próximo burst do processo.
   *     · Se o próximo for I/O  → transita para "Waiting" e entra na ioQueue.
   *     · Se o próximo for CPU  → retorna à fila de prontos ("Ready").
   *     · Se não houver próximo → termina o processo ("Terminated").
   *
   *   - Quantum expirado (sem término de burst): retorna à fila de prontos.
   */
  private _handleCpuCompletion(): void {
    if (this._cpuProcess === null) return;

    const cpu = this._cpuProcess;

    if (cpu.remainingBurst === 0) {
      this._advanceBurst(cpu);
      const process = this._processes.find((p) => p.id === cpu.processId)!;
      const nextBurst = process.bursts[cpu.burstIndex];
      if (nextBurst !== undefined && nextBurst.type === "io") {
        this._transition(cpu, "Waiting");
        this._ioQueue.push(cpu);
      } else if (nextBurst !== undefined && nextBurst.type === "cpu") {
        this._transition(cpu, "Ready");
        this._readyQueue.push(cpu);
      } else {
        this._transition(cpu, "Terminated");
        cpu.finishTick = this._tick + 1;
      }
      this._cpuProcess = null;
    } else if (this._algorithm.isQuantumExpired(cpu, this._config)) {
      this._transition(cpu, "Ready");
      this._readyQueue.push(cpu);
      this._cpuProcess = null;
    }
  }

  /**
   * Fase 7b — Conclusão de bursts de I/O.
   *
   * Percorre a ioQueue e, para cada processo cujo burst de I/O zerou:
   *   - Se houver próximo burst → transita para "Ready" e insere na readyQueue.
   *   - Caso contrário          → termina o processo ("Terminated").
   *
   * Processos ainda com I/O pendente permanecem na ioQueue.
   */
  private _handleIoCompletions(): void {
    const nextIoQueue: ProcessRuntime[] = [];
    for (const rt of this._ioQueue) {
      if (rt.remainingBurst === 0) {
        this._advanceBurst(rt);
        const process = this._processes.find((p) => p.id === rt.processId)!;
        if (rt.burstIndex < process.bursts.length) {
          this._transition(rt, "Ready");
          this._readyQueue.push(rt);
        } else {
          this._transition(rt, "Terminated");
          rt.finishTick = this._tick + 1;
        }
      } else {
        nextIoQueue.push(rt);
      }
    }
    this._ioQueue = nextIoQueue;
  }

  // ─── Helpers internos ─────────────────────────────────────────────────────

  /**
   * Aplica uma transição de estado a um runtime, atualizando `state`.
   * Centraliza todas as transições para facilitar rastreamento e depuração.
   */
  private _transition(rt: ProcessRuntime, state: StateLabel): void {
    rt.state = state;
  }

  /**
   * Avança o índice de burst de um runtime e atualiza `remainingBurst`
   * com a duração do próximo burst. Se não houver próximo burst, `remainingBurst` é 0.
   */
  private _advanceBurst(rt: ProcessRuntime): void {
    rt.burstIndex++;
    const process = this._processes.find((p) => p.id === rt.processId)!;
    const nextBurst = process.bursts[rt.burstIndex];
    rt.remainingBurst = nextBurst !== undefined ? nextBurst.duration : 0;
  }

  /**
   * Captura o estado instantâneo de todos os processos no tick atual.
   * Se um context switch estiver em andamento, `cpuProcess` é null e
   * `ctxSwitchForProcess` identifica o processo prestes a executar.
   */
  private _snapshot(): SimTick {
    const states: Record<string, StateLabel> = {};
    for (const [id, rt] of this._runtimes) {
      states[id] = rt.state;
    }
    const contextSwitching = this._contextSwitchRemaining > 0;
    return {
      tick: this._tick,
      cpuProcess: contextSwitching ? null : (this._cpuProcess?.processId ?? null),
      ioProcesses: this._ioQueue.map((rt) => rt.processId),
      readyQueue: this._readyQueue.map((rt) => rt.processId),
      states,
      contextSwitching,
      ctxSwitchForProcess: contextSwitching
        ? (this._readyQueue[0]?.processId ?? null)
        : null,
    };
  }

  // ─── Inicialização ────────────────────────────────────────────────────────

  /**
   * Inicializa o estado de runtime de um processo a partir de sua definição.
   * O primeiro burst deve ser do tipo "cpu"; caso contrário, um erro é lançado.
   */
  private static _initRuntime(p: Process, config: SchedulerConfig): ProcessRuntime {
    const firstBurst = p.bursts[0];
    if (firstBurst === undefined || firstBurst.type !== "cpu") {
      throw new Error(`Process ${p.id}: first burst must be a CPU burst`);
    }
    return {
      processId: p.id,
      state: "New",
      remainingBurst: firstBurst.duration,
      burstIndex: 0,
      arrivalTick: p.arrivalTime,
      startTick: null,
      finishTick: null,
      waitingTime: 0,
      cpuTime: 0,
      ioTime: 0,
      responseTime: null,
      quantumRemaining: config.quantum,
      currentPriority: p.priority,
    };
  }
}
