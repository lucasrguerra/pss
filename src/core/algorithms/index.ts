import type { SchedulingAlgorithm } from "../types";
import { BaseAlgorithm } from "./base";
import { FCFSAlgorithm } from "./fcfs";
import { SJFNonPreemptiveAlgorithm, SRTFAlgorithm } from "./sjf";
import { RoundRobinAlgorithm } from "./rr";
import { PriorityNonPreemptiveAlgorithm, PriorityPreemptiveAlgorithm } from "./priority";
import { PriorityRoundRobinAlgorithm } from "./priority_rr";
import { HRRNAlgorithm } from "./hrrn";
import { MultilevelQueueAlgorithm } from "./multilevel";

export type { BaseAlgorithm };

// ============================================================
// Tabela de despacho — o engine busca o algoritmo pelo nome
// ============================================================
//
// As instâncias são criadas uma única vez no carregamento do módulo.
// Isso é seguro pois todas as classes são stateless: todo estado mutável
// da simulação vive em ProcessRuntime, gerenciado pelo SimulationEngine.

export const algorithms: Record<SchedulingAlgorithm, BaseAlgorithm> = {
  FCFS:        new FCFSAlgorithm(),
  SJF_NP:      new SJFNonPreemptiveAlgorithm(),
  SJF_P:       new SRTFAlgorithm(),
  RR:          new RoundRobinAlgorithm(),
  PRIORITY_NP: new PriorityNonPreemptiveAlgorithm(),
  PRIORITY_P:  new PriorityPreemptiveAlgorithm(),
  PRIORITY_RR: new PriorityRoundRobinAlgorithm(),
  HRRN:        new HRRNAlgorithm(),
  MULTILEVEL:  new MultilevelQueueAlgorithm(),
};
