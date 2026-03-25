import type {
  Process,
  ProcessRuntime,
  SchedulerConfig,
  SimTick,
  StateLabel,
  Thread,
  ThreadRuntime,
} from "./types";
import { algorithms } from "./algorithms/index";
import type { BaseAlgorithm } from "./algorithms/index";
import { ThreadScheduler } from "./thread-scheduler";

/**
 * SimulationEngine — Núcleo de execução da simulação de escalonamento.
 *
 * Responsável por avançar o simulador tick a tick, aplicando o algoritmo
 * de escalonamento configurado e mantendo o estado de todos os processos.
 *
 * Suporta dois modos de operação:
 *   - Processos simples: comportamento original, sem alterações.
 *   - Processos com threads: escalonamento em dois níveis:
 *       1. Nível de processo — algoritmo global do SchedulerConfig.
 *       2. Nível de thread   — ThreadScheduler com política intra-processo.
 *
 * Modelos de threads suportados:
 *   MANY_TO_ONE  — Uma kernel thread por processo. I/O bloqueia todo o processo.
 *   ONE_TO_ONE   — Uma kernel thread por thread de usuário. Threads bloqueiam
 *                  independentemente; o processo só bloqueia se todas as threads
 *                  estiverem em I/O.
 *   MANY_TO_MANY — M kernel threads para N threads de usuário (M ≤ N).
 *                  Slots são liberados durante I/O e reatribuídos dinamicamente.
 *
 * Ciclo de vida de um único tick (método `step()`):
 *   1. Chegada        — New → Ready para processos/threads que chegam neste tick.
 *   2. Preempção      — Algoritmo decide se processo em CPU deve ceder lugar.
 *   3. Despacho       — Seleciona e despacha próximo processo (e thread).
 *   4. Snapshot       — Captura estado completo (processos + threads).
 *   5. Passagem do tempo — Decrementa bursts, acumula tempos.
 *   6. Aging          — Envelhecimento de prioridade anti-starvation.
 *   7. Conclusões     — Trata término de bursts de CPU/IO (processo e threads).
 */
export class SimulationEngine {
  // ─── Campos privados — processos ──────────────────────────────────────────

  private readonly _processes: Process[];
  private readonly _config: SchedulerConfig;
  private readonly _algorithm: BaseAlgorithm;

  private _tick: number;
  private _runtimes: Map<string, ProcessRuntime>;
  private _cpuProcess: ProcessRuntime | null;
  private _readyQueue: ProcessRuntime[];
  private _ioQueue: ProcessRuntime[];
  private _contextSwitchRemaining: number;
  private _prevCpuProcessId: string | null;

  // ─── Campos privados — threads ────────────────────────────────────────────

  /** threadRuntimes[processId][threadId] = ThreadRuntime */
  private _threadRuntimes: Map<string, Map<string, ThreadRuntime>>;

  /** Escalonador intra-processo por processo */
  private _threadSchedulers: Map<string, ThreadScheduler>;

  /** Thread atualmente ativa na CPU para cada processo com threads */
  private _activeThreads: Map<string, ThreadRuntime | null>;

  /** Threads em I/O por processo */
  private _threadIoQueues: Map<string, ThreadRuntime[]>;

  /** Fila de threads prontas intra-processo */
  private _readyThreadQueues: Map<string, ThreadRuntime[]>;

  /** MANY_TO_MANY: slots de kernel disponíveis por processo */
  private _kernelSlotsAvailable: Map<string, number>;

  /** MANY_TO_MANY: threads aguardando slot de kernel */
  private _kernelWaitQueues: Map<string, ThreadRuntime[]>;

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

    // Inicializa runtimes de processo
    this._runtimes = new Map(
      processes.map((p) => [p.id, SimulationEngine._initProcessRuntime(p, config)]),
    );

    // Inicializa estruturas de threads
    this._threadRuntimes = new Map();
    this._threadSchedulers = new Map();
    this._activeThreads = new Map();
    this._threadIoQueues = new Map();
    this._readyThreadQueues = new Map();
    this._kernelSlotsAvailable = new Map();
    this._kernelWaitQueues = new Map();

    for (const p of processes) {
      if (this._hasThreads(p.id)) {
        this._initThreadStructures(p);
      }
    }
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  step(): SimTick {
    if (this.isFinished) throw new Error("Simulation is already finished");

    this._tick++;

    this._handleArrivals();
    this._checkPreemption();
    this._dispatchNext();
    const snapshot = this._snapshot();
    this._advanceTime();
    this._applyAging();
    this._handleCpuCompletion();
    this._handleIoCompletions();

    return snapshot;
  }

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

  get isFinished(): boolean {
    for (const rt of this._runtimes.values()) {
      if (rt.state !== "Terminated") return false;
    }
    return true;
  }

  get currentTick(): number {
    return this._tick;
  }

  get runtimeStates(): ProcessRuntime[] {
    return Array.from(this._runtimes.values());
  }

  /** Retorna todos os runtimes de threads de todos os processos. */
  get threadRuntimeStates(): ThreadRuntime[] {
    const result: ThreadRuntime[] = [];
    for (const threadMap of this._threadRuntimes.values()) {
      for (const trt of threadMap.values()) {
        result.push(trt);
      }
    }
    return result;
  }

  /** Informa se um processo possui threads definidas. */
  processHasThreads(processId: string): boolean {
    return this._hasThreads(processId);
  }

  // ─── Fases do ciclo de simulação ──────────────────────────────────────────

  /**
   * Fase 1 — Chegada de processos (e inicialização de threads).
   */
  private _handleArrivals(): void {
    for (const p of this._processes) {
      const rt = this._runtimes.get(p.id)!;
      if (p.arrivalTime === this._tick && rt.state === "New") {
        this._transition(rt, "Ready");
        this._readyQueue.push(rt);

        if (this._hasThreads(p.id)) {
          // Transiciona todas as threads New → Ready na fila intra-processo
          const threadMap = this._threadRuntimes.get(p.id)!;
          const readyQueue = this._readyThreadQueues.get(p.id)!;
          const model = p.threadModel ?? "ONE_TO_ONE";

          for (const trt of threadMap.values()) {
            if (trt.state === "New") {
              if (model === "MANY_TO_MANY") {
                const slotsAvail = this._kernelSlotsAvailable.get(p.id) ?? 0;
                if (slotsAvail > 0) {
                  this._kernelSlotsAvailable.set(p.id, slotsAvail - 1);
                  this._transitionThread(trt, "Ready");
                  readyQueue.push(trt);
                } else {
                  // Sem slot disponível → espera kernel thread
                  trt.kernelWaiting = true;
                  this._transitionThread(trt, "Ready");
                  this._kernelWaitQueues.get(p.id)!.push(trt);
                }
              } else {
                this._transitionThread(trt, "Ready");
                readyQueue.push(trt);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Fase 2 — Verificação de preempção no nível de processo.
   */
  private _checkPreemption(): void {
    if (this._cpuProcess === null || this._readyQueue.length === 0) return;
    const candidate = this._algorithm.select(this._readyQueue, this._config);
    if (
      candidate !== null &&
      this._algorithm.shouldPreempt(this._cpuProcess, candidate, this._config)
    ) {
      const cpu = this._cpuProcess;

      // Retorna thread ativa à fila intra-processo (se processo com threads)
      if (this._hasThreads(cpu.processId)) {
        const activeThread = this._activeThreads.get(cpu.processId) ?? null;
        if (activeThread !== null) {
          this._transitionThread(activeThread, "Ready");
          this._readyThreadQueues.get(cpu.processId)!.unshift(activeThread);
          this._activeThreads.set(cpu.processId, null);
        }
      }

      this._transition(cpu, "Ready");
      this._readyQueue.push(cpu);
      this._cpuProcess = null;
    }
  }

  /**
   * Fase 3 — Despacho de processo (e thread).
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
      next.quantumRemaining = this._algorithm.getQuantumForProcess(next, this._config);
      this._transition(next, "Running");
      this._prevCpuProcessId = next.processId;
      this._cpuProcess = next;

      // Despacha thread intra-processo (se aplicável)
      if (this._hasThreads(next.processId)) {
        this._dispatchThreadForProcess(next);
      }
    }
  }

  /**
   * Fase 4 — Snapshot do estado.
   */
  private _snapshot(): SimTick {
    const states: Record<string, StateLabel> = {};
    for (const [id, rt] of this._runtimes) {
      states[id] = rt.state;
    }
    const contextSwitching = this._contextSwitchRemaining > 0;

    const snap: SimTick = {
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

    // Inclui estado de threads se houver processos com threads
    if (this._threadRuntimes.size > 0) {
      const threadStates: Record<string, Record<string, StateLabel>> = {};
      const cpuThreads: Record<string, string | null> = {};
      const kernelWaitingThreads: Record<string, string[]> = {};

      for (const [processId, threadMap] of this._threadRuntimes) {
        threadStates[processId] = {};
        for (const [threadId, trt] of threadMap) {
          threadStates[processId][threadId] = trt.state;
        }
        const active = this._activeThreads.get(processId) ?? null;
        cpuThreads[processId] = active?.threadId ?? null;
        const kwQueue = this._kernelWaitQueues.get(processId) ?? [];
        if (kwQueue.length > 0) {
          kernelWaitingThreads[processId] = kwQueue.map((t) => t.threadId);
        }
      }

      snap.threadStates = threadStates;
      snap.cpuThreads = cpuThreads;
      if (Object.keys(kernelWaitingThreads).length > 0) {
        snap.kernelWaitingThreads = kernelWaitingThreads;
      }
    }

    return snap;
  }

  /**
   * Fase 5 — Passagem do tempo.
   */
  private _advanceTime(): void {
    if (this._contextSwitchRemaining > 0) {
      this._contextSwitchRemaining--;
    }

    if (this._cpuProcess !== null) {
      const cpu = this._cpuProcess;

      if (this._hasThreads(cpu.processId)) {
        // CPU time acumulado no nível de processo
        cpu.cpuTime++;
        cpu.quantumRemaining--;

        // Decrementa burst e tempo da thread ativa
        const activeThread = this._activeThreads.get(cpu.processId) ?? null;
        if (activeThread !== null) {
          activeThread.remainingBurst--;
          activeThread.cpuTime++;
          activeThread.quantumRemaining--;
          // Sincroniza processo com thread ativa
          cpu.remainingBurst = activeThread.remainingBurst;
        }
      } else {
        cpu.remainingBurst--;
        cpu.cpuTime++;
        cpu.quantumRemaining--;
      }
    }

    // I/O de processos sem threads
    for (const rt of this._ioQueue) {
      if (!this._hasThreads(rt.processId)) {
        rt.remainingBurst--;
        rt.ioTime++;
      }
      // Processos com threads (MANY_TO_ONE): tempo de I/O acumulado abaixo
    }

    // I/O de threads (todos os modelos)
    for (const [, threadIoQueue] of this._threadIoQueues) {
      for (const trt of threadIoQueue) {
        trt.remainingBurst--;
        trt.ioTime++;
      }
    }

    // Tempo de espera — fila de prontos de processos
    for (const rt of this._readyQueue) {
      rt.waitingTime++;
    }

    // Tempo de espera — fila de prontas de threads intra-processo
    for (const [, threadReadyQueue] of this._readyThreadQueues) {
      for (const trt of threadReadyQueue) {
        trt.waitingTime++;
      }
    }

    // Tempo de espera — threads em kernel wait (MANY_TO_MANY)
    for (const [, kwQueue] of this._kernelWaitQueues) {
      for (const trt of kwQueue) {
        trt.waitingTime++;
      }
    }
  }

  /**
   * Fase 6 — Aging de prioridade.
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
   */
  private _handleCpuCompletion(): void {
    if (this._cpuProcess === null) return;
    const cpu = this._cpuProcess;

    if (this._hasThreads(cpu.processId)) {
      this._handleThreadedCpuCompletion();
      return;
    }

    // ── Processo sem threads (comportamento original) ──────────────────────
    if (cpu.remainingBurst === 0) {
      this._advanceBurst(cpu);
      cpu.quantumRemaining = 1;
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
   */
  private _handleIoCompletions(): void {
    // ── Processos sem threads ──────────────────────────────────────────────
    const nextIoQueue: ProcessRuntime[] = [];
    for (const rt of this._ioQueue) {
      if (this._hasThreads(rt.processId)) {
        // Processos com threads gerenciados em _handleThreadIoCompletions
        nextIoQueue.push(rt);
        continue;
      }
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

    // ── Threads em I/O ────────────────────────────────────────────────────
    this._handleThreadIoCompletions();
  }

  // ─── Lógica de threads ────────────────────────────────────────────────────

  /**
   * Despacha a próxima thread intra-processo quando o processo recebe CPU.
   */
  private _dispatchThreadForProcess(processRt: ProcessRuntime): void {
    const processId = processRt.processId;
    const readyThreadQueue = this._readyThreadQueues.get(processId)!;
    const scheduler = this._threadSchedulers.get(processId)!;

    const nextThread = scheduler.select(readyThreadQueue);
    if (nextThread === null) {
      // Nenhuma thread pronta — mantém processo em Running mas sem thread ativa
      // (Pode ocorrer se todas as threads estão em I/O; ONE_TO_ONE pode despachar
      //  o processo mesmo assim para que ele "exista" na CPU enquanto threads esperam)
      this._activeThreads.set(processId, null);
      return;
    }

    const idx = readyThreadQueue.indexOf(nextThread);
    if (idx !== -1) readyThreadQueue.splice(idx, 1);

    if (nextThread.startTick === null) {
      nextThread.startTick = this._tick;
      nextThread.responseTime = this._tick - nextThread.arrivalTick;
    }
    nextThread.quantumRemaining = scheduler.quantum;
    nextThread.kernelWaiting = false;
    this._transitionThread(nextThread, "Running");
    this._activeThreads.set(processId, nextThread);

    // Sincroniza process runtime com thread ativa
    processRt.remainingBurst = nextThread.remainingBurst;
    if (processRt.startTick === null) {
      processRt.startTick = this._tick;
      processRt.responseTime = this._tick - processRt.arrivalTick;
    }
  }

  /**
   * Gerencia conclusão de burst de CPU para processos com threads.
   */
  private _handleThreadedCpuCompletion(): void {
    const cpu = this._cpuProcess!;
    const processId = cpu.processId;
    const process = this._processes.find((p) => p.id === processId)!;
    const policy = process.threadSchedulingPolicy ?? "FCFS";
    const scheduler = this._threadSchedulers.get(processId)!;
    const activeThread = this._activeThreads.get(processId) ?? null;

    if (activeThread === null) {
      // Sem thread ativa — verifica se processo deve continuar ou aguardar
      if (this._readyThreadQueues.get(processId)!.length > 0) {
        this._dispatchThreadForProcess(cpu);
      } else {
        // Todas as threads em I/O: processo vai para Waiting
        this._transition(cpu, "Waiting");
        if (!this._ioQueue.includes(cpu)) this._ioQueue.push(cpu);
        this._cpuProcess = null;
      }
      return;
    }

    if (activeThread.remainingBurst === 0) {
      // ── CPU burst da thread concluído ────────────────────────────────────
      this._activeThreads.set(processId, null);
      this._handleThreadBurstComplete(cpu, activeThread, process);

      // Se o quantum do processo também expirou neste mesmo tick, cede a CPU
      // agora (após tratar o burst) em vez de dar um tick extra ao processo.
      if (this._cpuProcess !== null && this._algorithm.isQuantumExpired(cpu, this._config)) {
        const activeAfter = this._activeThreads.get(processId) ?? null;
        if (activeAfter !== null) {
          this._transitionThread(activeAfter, "Ready");
          if (policy === "RR") {
            this._readyThreadQueues.get(processId)!.push(activeAfter);
          } else {
            this._readyThreadQueues.get(processId)!.unshift(activeAfter);
          }
          this._activeThreads.set(processId, null);
        }
        this._transition(cpu, "Ready");
        this._readyQueue.push(cpu);
        this._cpuProcess = null;
      }
    } else if (scheduler.isQuantumExpired(activeThread)) {
      // ── Quantum intra-processo expirou (RR): rotaciona thread ────────────
      this._transitionThread(activeThread, "Ready");
      this._readyThreadQueues.get(processId)!.push(activeThread); // reinserido no fim (FIFO)
      this._activeThreads.set(processId, null);

      // Seleciona próxima thread — processo permanece na CPU
      this._dispatchThreadForProcess(cpu);

      // Se não há próxima thread pronta, processo aguarda
      if (this._activeThreads.get(processId) === null) {
        this._transition(cpu, "Waiting");
        if (!this._ioQueue.includes(cpu)) this._ioQueue.push(cpu);
        this._cpuProcess = null;
      }
    } else if (this._algorithm.isQuantumExpired(cpu, this._config)) {
      // ── Quantum de processo expirou: devolve processo à fila global ───────
      // Thread volta à fila intra-processo
      this._transitionThread(activeThread, "Ready");
      if (policy === "RR") {
        this._readyThreadQueues.get(processId)!.push(activeThread);
      } else {
        this._readyThreadQueues.get(processId)!.unshift(activeThread);
      }
      this._activeThreads.set(processId, null);
      this._transition(cpu, "Ready");
      this._readyQueue.push(cpu);
      this._cpuProcess = null;
    }
  }

  /**
   * Trata conclusão do burst de CPU de uma thread específica.
   * Decide o próximo estado da thread e do processo conforme o modelo.
   */
  private _handleThreadBurstComplete(
    processRt: ProcessRuntime,
    thread: ThreadRuntime,
    process: Process,
  ): void {
    const processId = process.id;
    const model = process.threadModel ?? "ONE_TO_ONE";
    const threadDef = process.threads!.find((t) => t.tid === thread.threadId)!;

    // Avança ao próximo burst da thread
    thread.burstIndex++;
    const nextBurst = threadDef.bursts[thread.burstIndex];
    thread.quantumRemaining = 1; // sentinela anti-falsa-demoção

    if (nextBurst !== undefined && nextBurst.type === "io") {
      // ── Thread vai para I/O ───────────────────────────────────────────────
      thread.remainingBurst = nextBurst.duration;
      this._transitionThread(thread, "Waiting");
      this._threadIoQueues.get(processId)!.push(thread);

      // Para MANY_TO_MANY: libera slot de kernel
      if (model === "MANY_TO_MANY") {
        this._releaseKernelSlot(processId);
      }

      if (model === "MANY_TO_ONE") {
        // Kernel thread bloqueado → bloqueia todo o processo
        this._transition(processRt, "Waiting");
        this._ioQueue.push(processRt);
        this._cpuProcess = null;
      } else {
        // ONE_TO_ONE / MANY_TO_MANY: verifica se há outra thread pronta
        this._trySelectNextThreadOrBlock(processRt, process);
      }
    } else if (nextBurst !== undefined && nextBurst.type === "cpu") {
      // ── Thread tem próximo burst de CPU ───────────────────────────────────
      thread.remainingBurst = nextBurst.duration;
      this._transitionThread(thread, "Ready");
      this._readyThreadQueues.get(processId)!.push(thread);
      // Processo permanece na CPU; seleciona próxima thread
      this._dispatchThreadForProcess(processRt);
    } else {
      // ── Thread terminada ──────────────────────────────────────────────────
      this._transitionThread(thread, "Terminated");
      thread.finishTick = this._tick + 1;

      // Para MANY_TO_MANY: libera slot de kernel
      if (model === "MANY_TO_MANY") {
        this._releaseKernelSlot(processId);
      }

      // Verifica se processo deve terminar ou continuar com outra thread
      if (this._allThreadsTerminated(processId)) {
        this._transition(processRt, "Terminated");
        processRt.finishTick = this._tick + 1;
        this._cpuProcess = null;
      } else if (model === "MANY_TO_ONE") {
        // Seleciona próxima thread pronta (se houver)
        this._trySelectNextThreadOrBlock(processRt, process);
      } else {
        this._trySelectNextThreadOrBlock(processRt, process);
      }
    }
  }

  /**
   * Tenta selecionar a próxima thread pronta para o processo.
   * Se não houver threads prontas e há threads em I/O: processo aguarda.
   * Se não houver threads prontas e todas terminadas: processo termina.
   */
  private _trySelectNextThreadOrBlock(
    processRt: ProcessRuntime,
    process: Process,
  ): void {
    const processId = process.id;
    const readyThreadQueue = this._readyThreadQueues.get(processId)!;

    if (readyThreadQueue.length > 0) {
      // Há threads prontas: seleciona a próxima
      this._dispatchThreadForProcess(processRt);
    } else if (this._allThreadsTerminated(processId)) {
      this._transition(processRt, "Terminated");
      processRt.finishTick = this._tick + 1;
      this._cpuProcess = null;
    } else {
      // Todas as threads em I/O: processo aguarda
      this._transition(processRt, "Waiting");
      if (!this._ioQueue.includes(processRt)) {
        this._ioQueue.push(processRt);
      }
      this._cpuProcess = null;
    }
  }

  /**
   * Gerencia conclusão de bursts de I/O para threads.
   */
  private _handleThreadIoCompletions(): void {
    for (const [processId, threadIoQueue] of this._threadIoQueues) {
      const processRt = this._runtimes.get(processId)!;
      const process = this._processes.find((p) => p.id === processId)!;
      const model = process.threadModel ?? "ONE_TO_ONE";

      const remaining: ThreadRuntime[] = [];

      for (const trt of threadIoQueue) {
        if (trt.remainingBurst === 0) {
          // ── I/O da thread concluído ────────────────────────────────────────
          const threadDef = process.threads!.find((t) => t.tid === trt.threadId)!;
          trt.burstIndex++;
          const nextBurst = threadDef.bursts[trt.burstIndex];
          trt.quantumRemaining = 1; // sentinela

          if (nextBurst !== undefined && nextBurst.type === "cpu") {
            trt.remainingBurst = nextBurst.duration;

            if (model === "MANY_TO_MANY") {
              // Tenta adquirir slot de kernel
              const slotsAvail = this._kernelSlotsAvailable.get(processId) ?? 0;
              if (slotsAvail > 0) {
                this._kernelSlotsAvailable.set(processId, slotsAvail - 1);
                trt.kernelWaiting = false;
                this._transitionThread(trt, "Ready");
                this._readyThreadQueues.get(processId)!.push(trt);
              } else {
                // Sem slot: vai para kernel wait queue
                trt.kernelWaiting = true;
                this._kernelWaitQueues.get(processId)!.push(trt);
              }
            } else {
              this._transitionThread(trt, "Ready");
              this._readyThreadQueues.get(processId)!.push(trt);
            }
          } else {
            // Thread termina após I/O (ou sem próximo burst)
            this._transitionThread(trt, "Terminated");
            trt.finishTick = this._tick + 1;
            if (model === "MANY_TO_MANY") {
              // Não havia slot em uso durante I/O; nada a liberar
            }
          }

          // Decide estado do processo com base no modelo
          this._updateProcessStateAfterThreadIo(processRt, process, model);
        } else {
          remaining.push(trt);
        }
      }

      this._threadIoQueues.set(processId, remaining);
    }
  }

  /**
   * Atualiza o estado do processo após conclusão de I/O de uma thread.
   */
  private _updateProcessStateAfterThreadIo(
    processRt: ProcessRuntime,
    process: Process,
    model: string,
  ): void {
    const processId = process.id;

    if (model === "MANY_TO_ONE") {
      // O processo estava bloqueado (Waiting) devido ao I/O da thread
      // Agora a thread está pronta → processo volta para Ready
      if (processRt.state === "Waiting") {
        this._ioQueue = this._ioQueue.filter((r) => r.processId !== processId);
        this._transition(processRt, "Ready");
        this._readyQueue.push(processRt);
        this._activeThreads.set(processId, null); // será selecionada no dispatch
      }
    } else {
      // ONE_TO_ONE / MANY_TO_MANY
      if (processRt.state === "Waiting") {
        // Processo estava aguardando porque todas as threads estavam em I/O
        // Verifica se alguma thread ficou pronta
        const readyThreadQueue = this._readyThreadQueues.get(processId)!;
        if (readyThreadQueue.length > 0) {
          this._ioQueue = this._ioQueue.filter((r) => r.processId !== processId);
          this._transition(processRt, "Ready");
          this._readyQueue.push(processRt);
        }
      }
      // Se processo está Running: a thread retornou; será selecionada na próxima rodada
      // Se processo está Ready: a thread apenas entra na fila intra-processo
    }

    // Verifica se todas as threads terminaram
    if (this._allThreadsTerminated(processId) && processRt.state !== "Terminated") {
      this._ioQueue = this._ioQueue.filter((r) => r.processId !== processId);
      this._readyQueue = this._readyQueue.filter((r) => r.processId !== processId);
      this._transition(processRt, "Terminated");
      processRt.finishTick = this._tick + 1;
    }
  }

  // ─── MANY_TO_MANY — gerenciamento de slots de kernel ─────────────────────

  /**
   * Libera um slot de kernel e tenta promover a próxima thread da kernel wait queue.
   */
  private _releaseKernelSlot(processId: string): void {
    const kwQueue = this._kernelWaitQueues.get(processId)!;
    if (kwQueue.length > 0) {
      // Repassa o slot diretamente para a próxima thread aguardando
      const next = kwQueue.shift()!;
      next.kernelWaiting = false;
      this._transitionThread(next, "Ready");
      this._readyThreadQueues.get(processId)!.push(next);
    } else {
      this._kernelSlotsAvailable.set(
        processId,
        (this._kernelSlotsAvailable.get(processId) ?? 0) + 1,
      );
    }
  }

  // ─── Helpers internos ─────────────────────────────────────────────────────

  private _transition(rt: ProcessRuntime, state: StateLabel): void {
    rt.state = state;
  }

  private _transitionThread(trt: ThreadRuntime, state: StateLabel): void {
    trt.state = state;
  }

  private _advanceBurst(rt: ProcessRuntime): void {
    rt.burstIndex++;
    const process = this._processes.find((p) => p.id === rt.processId)!;
    const nextBurst = process.bursts[rt.burstIndex];
    rt.remainingBurst = nextBurst !== undefined ? nextBurst.duration : 0;
  }

  private _hasThreads(processId: string): boolean {
    const p = this._processes.find((proc) => proc.id === processId);
    return (p?.threads?.length ?? 0) > 0;
  }

  private _allThreadsTerminated(processId: string): boolean {
    const threadMap = this._threadRuntimes.get(processId);
    if (!threadMap) return true;
    for (const trt of threadMap.values()) {
      if (trt.state !== "Terminated") return false;
    }
    return true;
  }

  // ─── Inicialização ────────────────────────────────────────────────────────

  private static _initProcessRuntime(p: Process, config: SchedulerConfig): ProcessRuntime {
    const isThreaded = (p.threads?.length ?? 0) > 0;

    if (!isThreaded) {
      const firstBurst = p.bursts[0];
      if (firstBurst === undefined || firstBurst.type !== "cpu") {
        throw new Error(`Process ${p.id}: first burst must be a CPU burst`);
      }
    }

    return {
      processId: p.id,
      state: "New",
      remainingBurst: isThreaded ? 1 : (p.bursts[0]?.duration ?? 0),
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

  private _initThreadStructures(p: Process): void {
    const processId = p.id;
    const model = p.threadModel ?? "ONE_TO_ONE";
    const policy = p.threadSchedulingPolicy ?? "FCFS";
    const quantum = p.threadQuantum ?? 2;
    const threads = p.threads!;

    // Criação do mapa de runtimes de threads
    const threadMap = new Map<string, ThreadRuntime>(
      threads.map((t) => [
        t.tid,
        SimulationEngine._initThreadRuntime(t, processId, p.arrivalTime, quantum),
      ]),
    );
    this._threadRuntimes.set(processId, threadMap);

    // Escalonador intra-processo
    this._threadSchedulers.set(processId, new ThreadScheduler(policy, quantum));

    // Estruturas de estado
    this._activeThreads.set(processId, null);
    this._threadIoQueues.set(processId, []);
    this._readyThreadQueues.set(processId, []);

    // MANY_TO_MANY: inicializa slots de kernel
    if (model === "MANY_TO_MANY") {
      const M =
        p.kernelThreadCount ??
        Math.max(1, Math.ceil(threads.length / 2));
      this._kernelSlotsAvailable.set(processId, M);
      this._kernelWaitQueues.set(processId, []);
    } else {
      this._kernelWaitQueues.set(processId, []);
    }
  }

  private static _initThreadRuntime(
    t: Thread,
    processId: string,
    arrivalTick: number,
    quantum: number,
  ): ThreadRuntime {
    const firstBurst = t.bursts[0];
    if (firstBurst === undefined || firstBurst.type !== "cpu") {
      throw new Error(`Thread ${t.tid}: first burst must be a CPU burst`);
    }
    return {
      threadId: t.tid,
      processId,
      state: "New",
      remainingBurst: firstBurst.duration,
      burstIndex: 0,
      arrivalTick,
      startTick: null,
      finishTick: null,
      waitingTime: 0,
      cpuTime: 0,
      ioTime: 0,
      responseTime: null,
      quantumRemaining: quantum,
      currentPriority: t.priority ?? 5,
    };
  }
}
