import type { MlqQueueDef, Process, SchedulerConfig } from "./types";
// Thread preset IDs are prefixed with "t_" to avoid conflicts

export interface Preset {
  name: string;
  description: string;
  processes: Process[];
  config: SchedulerConfig;
}

const DEFAULT_MLQ_QUEUES: MlqQueueDef[] = [
  { priorityMin: 1, priorityMax: 3, algorithm: "RR", quantum: 2 },
  { priorityMin: 4, priorityMax: 7, algorithm: "PRIORITY_NP", quantum: 2 },
  { priorityMin: 8, priorityMax: 10, algorithm: "FCFS", quantum: 2 },
];

const defaultConfig = (
  overrides: Partial<SchedulerConfig> = {},
): SchedulerConfig => ({
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  mlqQueues: DEFAULT_MLQ_QUEUES,
  ...overrides,
});

export const presets: Preset[] = [
  {
    name: "classic_fcfs",
    description: "4 simple processes, no I/O — demonstrates FCFS order",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 5 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 1, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 1 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 3, priority: 5, color: "#F06292", bursts: [{ type: "cpu", duration: 7 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },
  {
    name: "rr_demo",
    description: "5 processes with quantum 3 — Round Robin rotation",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 6 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 4 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 1, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 5 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 2, priority: 5, color: "#F06292", bursts: [{ type: "cpu", duration: 2 }] },
      { pid: 5, id: "p5", name: "P5", arrivalTime: 3, priority: 5, color: "#CE93D8", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "RR", quantum: 3 }),
  },
  {
    name: "starvation",
    description: "High-priority processes starve P5 — demonstrates Priority NP starvation",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 1, priority: 1, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 1, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 3, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 5, id: "p5", name: "P5", arrivalTime: 0, priority: 10, color: "#CE93D8", bursts: [{ type: "cpu", duration: 5 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_NP" }),
  },
  {
    name: "aging_fix",
    description: "Same starvation scenario fixed with aging",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 1, priority: 1, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 1, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 3, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 5, id: "p5", name: "P5", arrivalTime: 0, priority: 10, color: "#CE93D8", bursts: [{ type: "cpu", duration: 5 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_P", isPreemptive: true, agingEnabled: true, agingInterval: 3 }),
  },
  {
    name: "priority_rr_demo",
    description: "Priority RR: P3 (priority 1) preempts mid-run; P1 & P2 (priority 2) share CPU via RR",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 2, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 4 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 0, priority: 2, color: "#81C784", bursts: [{ type: "cpu", duration: 4 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 4, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 2 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_RR", quantum: 2 }),
  },
  {
    name: "io_heavy",
    description: "Mixed CPU-bound and I/O-bound processes",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 6 }, { type: "io", duration: 1 }, { type: "cpu", duration: 2 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 1 }, { type: "io", duration: 8 }, { type: "cpu", duration: 1 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 4 }, { type: "io", duration: 2 }, { type: "cpu", duration: 4 }] },
    ],
    config: defaultConfig({ algorithm: "SJF_P", isPreemptive: true }),
  },
  {
    name: "convoy_effect",
    description: "One long process blocks shorter ones — FCFS convoy vs SJF comparison",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#EF5350", bursts: [{ type: "cpu", duration: 12 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 1, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 2 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 1 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 3, priority: 5, color: "#CE93D8", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },
  {
    name: "context_switch_demo",
    description: "3 FCFS processes with 2 ticks of overhead — see the red Context Switch cells",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 0, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS", contextSwitchTime: 2 }),
  },
  {
    name: "multilevel_demo",
    description: "MLQ: 3 priority tiers — Q0 (1–3) RR, Q1 (4–7) Priority NP, Q2 (8–10) FCFS",
    processes: [
      { pid: 1, id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#EF5350", bursts: [{ type: "cpu", duration: 4 }] },
      { pid: 2, id: "p2", name: "P2", arrivalTime: 0, priority: 1, color: "#FF8A65", bursts: [{ type: "cpu", duration: 3 }] },
      { pid: 3, id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 5 }] },
      { pid: 4, id: "p4", name: "P4", arrivalTime: 2, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 2 }] },
      { pid: 5, id: "p5", name: "P5", arrivalTime: 4, priority: 9, color: "#CE93D8", bursts: [{ type: "cpu", duration: 6 }] },
    ],
    config: defaultConfig({ algorithm: "MULTILEVEL", quantum: 2, mlqQueues: DEFAULT_MLQ_QUEUES }),
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PRESETS DE THREADS — demonstram os três modelos e conceitos de concorrência
  // ──────────────────────────────────────────────────────────────────────────

  {
    name: "many_to_one",
    description:
      "MANY_TO_ONE: 2 processos com 3 threads cada. Uma thread em I/O bloqueia todo o processo — observe como o processo fica Waiting enquanto as outras threads ficam ociosas.",
    processes: [
      {
        pid: 1,
        id: "t_p1",
        name: "Srv-A",
        arrivalTime: 0,
        priority: 5,
        color: "#4FC3F7",
        bursts: [],
        threadModel: "MANY_TO_ONE",
        threadSchedulingPolicy: "RR",
        threadQuantum: 2,
        threads: [
          {
            tid: "t_p1_t1",
            name: "A-T1",
            bursts: [
              { type: "cpu", duration: 3 },
              { type: "io", duration: 4 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t2",
            name: "A-T2",
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 2 },
              { type: "cpu", duration: 3 },
            ],
          },
          {
            tid: "t_p1_t3",
            name: "A-T3",
            bursts: [{ type: "cpu", duration: 4 }],
          },
        ],
      },
      {
        pid: 2,
        id: "t_p2",
        name: "Srv-B",
        arrivalTime: 2,
        priority: 5,
        color: "#81C784",
        bursts: [],
        threadModel: "MANY_TO_ONE",
        threadSchedulingPolicy: "FCFS",
        threads: [
          {
            tid: "t_p2_t1",
            name: "B-T1",
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 3 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p2_t2",
            name: "B-T2",
            bursts: [{ type: "cpu", duration: 5 }],
          },
        ],
      },
    ],
    config: defaultConfig({ algorithm: "RR", quantum: 4 }),
  },

  {
    name: "one_to_one",
    description:
      "ONE_TO_ONE: mesmo cenário do Many-to-One mas com kernel threads independentes. Threads em I/O não bloqueiam o processo — compare o throughput com o preset many_to_one.",
    processes: [
      {
        pid: 1,
        id: "t_p1",
        name: "Srv-A",
        arrivalTime: 0,
        priority: 5,
        color: "#4FC3F7",
        bursts: [],
        threadModel: "ONE_TO_ONE",
        threadSchedulingPolicy: "RR",
        threadQuantum: 2,
        threads: [
          {
            tid: "t_p1_t1",
            name: "A-T1",
            bursts: [
              { type: "cpu", duration: 3 },
              { type: "io", duration: 4 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t2",
            name: "A-T2",
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 2 },
              { type: "cpu", duration: 3 },
            ],
          },
          {
            tid: "t_p1_t3",
            name: "A-T3",
            bursts: [{ type: "cpu", duration: 4 }],
          },
        ],
      },
      {
        pid: 2,
        id: "t_p2",
        name: "Srv-B",
        arrivalTime: 2,
        priority: 5,
        color: "#81C784",
        bursts: [],
        threadModel: "ONE_TO_ONE",
        threadSchedulingPolicy: "FCFS",
        threads: [
          {
            tid: "t_p2_t1",
            name: "B-T1",
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 3 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p2_t2",
            name: "B-T2",
            bursts: [{ type: "cpu", duration: 5 }],
          },
        ],
      },
    ],
    config: defaultConfig({ algorithm: "RR", quantum: 4 }),
  },

  {
    name: "many_to_many",
    description:
      "MANY_TO_MANY: processo com 4 threads de usuário mas apenas 2 kernel threads (M=2). Observe threads em KernelWait aguardando slot disponível.",
    processes: [
      {
        pid: 1,
        id: "t_p1",
        name: "App",
        arrivalTime: 0,
        priority: 5,
        color: "#CE93D8",
        bursts: [],
        threadModel: "MANY_TO_MANY",
        kernelThreadCount: 2,
        threadSchedulingPolicy: "PRIORITY",
        threads: [
          {
            tid: "t_p1_t1",
            name: "Worker1",
            priority: 1,
            bursts: [
              { type: "cpu", duration: 3 },
              { type: "io", duration: 2 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t2",
            name: "Worker2",
            priority: 2,
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 3 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t3",
            name: "Worker3",
            priority: 3,
            bursts: [
              { type: "cpu", duration: 4 },
              { type: "io", duration: 1 },
              { type: "cpu", duration: 1 },
            ],
          },
          {
            tid: "t_p1_t4",
            name: "Worker4",
            priority: 4,
            bursts: [{ type: "cpu", duration: 3 }],
          },
        ],
      },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },

  {
    name: "thread_starvation",
    description:
      "Starvation de thread: processo com 3 threads em política Priority. A thread de baixa prioridade (T3) é indefinidamente preterida pelas de alta prioridade.",
    processes: [
      {
        pid: 1,
        id: "t_p1",
        name: "App",
        arrivalTime: 0,
        priority: 5,
        color: "#F06292",
        bursts: [],
        threadModel: "ONE_TO_ONE",
        threadSchedulingPolicy: "PRIORITY",
        threads: [
          {
            tid: "t_p1_t1",
            name: "High-1",
            priority: 1,
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 1 },
              { type: "cpu", duration: 2 },
              { type: "io", duration: 1 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t2",
            name: "High-2",
            priority: 2,
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 1 },
              { type: "cpu", duration: 2 },
              { type: "io", duration: 1 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t3",
            name: "Low",
            priority: 10,
            bursts: [{ type: "cpu", duration: 3 }],
          },
        ],
      },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },

  {
    name: "threads_vs_processes",
    description:
      "Threads vs Processos: P1 usa 2 threads ONE_TO_ONE para uma tarefa. P2 faz o mesmo trabalho como processo único. Compare turnaround e throughput.",
    processes: [
      {
        pid: 1,
        id: "t_p1",
        name: "Multi-T",
        arrivalTime: 0,
        priority: 5,
        color: "#4FC3F7",
        bursts: [],
        threadModel: "ONE_TO_ONE",
        threadSchedulingPolicy: "RR",
        threadQuantum: 3,
        threads: [
          {
            tid: "t_p1_t1",
            name: "T1",
            bursts: [
              { type: "cpu", duration: 3 },
              { type: "io", duration: 2 },
              { type: "cpu", duration: 2 },
            ],
          },
          {
            tid: "t_p1_t2",
            name: "T2",
            bursts: [
              { type: "cpu", duration: 2 },
              { type: "io", duration: 3 },
              { type: "cpu", duration: 3 },
            ],
          },
        ],
      },
      {
        pid: 2,
        id: "t_p2",
        name: "Single-P",
        arrivalTime: 0,
        priority: 5,
        color: "#FFB74D",
        bursts: [
          { type: "cpu", duration: 5 },
          { type: "io", duration: 3 },
          { type: "cpu", duration: 5 },
        ],
      },
    ],
    config: defaultConfig({ algorithm: "RR", quantum: 4 }),
  },
];
