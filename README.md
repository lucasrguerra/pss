# Process Scheduler Simulator — Especificação Técnica Completa

> **Versão:** 1.0  
> **Data:** 2026-03-19  
> **Autor:** Lucas Rayan Guerra  
> **Stack alvo:** React + Vite (Single Page Application, browser-only, sem backend)

---

## 1. Visão Geral

O **Process Scheduler Simulator** é uma ferramenta educacional interativa que roda inteiramente no navegador. Ele permite ao usuário criar processos, escolher um algoritmo de escalonamento, executar a simulação passo a passo ou de forma automática, visualizar o diagrama de Gantt em tempo real e analisar métricas detalhadas por processo e globais.

### 1.1 Objetivos

| # | Objetivo |
|---|----------|
| O1 | Simular fielmente os algoritmos clássicos de escalonamento de SO |
| O2 | Permitir execução passo a passo para fins didáticos |
| O3 | Exibir diagrama de Gantt animado com estados de CPU e I/O |
| O4 | Calcular e exibir métricas completas por processo e agregadas |
| O5 | Ser completamente autocontido — sem servidor, sem dependências externas de dados |

### 1.2 Público-Alvo

- Estudantes de Sistemas Operacionais (graduação/pós)
- Professores que queiram usar em sala de aula
- Profissionais revisando fundamentos de SO

---

## 2. Requisitos Funcionais

### RF-01 — Gerenciamento de Processos

| ID | Descrição |
|----|-----------|
| RF-01.1 | O usuário pode **criar** um processo com os atributos listados na seção 3.1 |
| RF-01.2 | O usuário pode **editar** um processo antes de iniciar a simulação |
| RF-01.3 | O usuário pode **remover** um processo individual ou **limpar** todos |
| RF-01.4 | O usuário pode **gerar processos aleatórios** com parâmetros configuráveis (quantidade, faixas de valores) |
| RF-01.5 | A lista de processos exibe uma prévia das propriedades e a classificação CPU/I/O Bound estimada |
| RF-01.6 | Mínimo de 1 processo, máximo de 16 processos por simulação |

### RF-02 — Configuração do Escalonador

| ID | Descrição |
|----|-----------|
| RF-02.1 | O usuário seleciona **um** algoritmo de escalonamento por simulação |
| RF-02.2 | Parâmetros específicos de algoritmo são exibidos dinamicamente (ex.: quantum para RR) |
| RF-02.3 | O usuário configura o **tempo de context switch** (0–10 unidades de tempo, padrão 0) |
| RF-02.4 | O usuário configura se o escalonador é **preemptivo ou cooperativo** (onde aplicável) |

### RF-03 — Simulação

| ID | Descrição |
|----|-----------|
| RF-03.1 | **Play** inicia/retoma a simulação com velocidade configurável |
| RF-03.2 | **Pause** suspende a execução sem perder o estado |
| RF-03.3 | **Step** avança exatamente 1 unidade de tempo (tick) |
| RF-03.4 | **Reset** retorna ao estado inicial sem perder a configuração de processos |
| RF-03.5 | **Velocidade** ajustável: 0.25×, 0.5×, 1×, 2×, 4× (padrão 1×) |
| RF-03.6 | A simulação termina quando todos os processos atingem estado **Terminated** |
| RF-03.7 | O tick atual é exibido em destaque no painel de controle |

### RF-04 — Diagrama de Gantt

| ID | Descrição |
|----|-----------|
| RF-04.1 | Cada processo ocupa uma linha horizontal no diagrama |
| RF-04.2 | Cada tick é representado por uma célula colorida conforme o estado |
| RF-04.3 | O tick atual é destacado com uma linha vertical animada |
| RF-04.4 | Legenda de cores dos estados exibida abaixo do diagrama |
| RF-04.5 | O diagrama faz scroll horizontal automático para acompanhar o tick atual |
| RF-04.6 | Hovering sobre uma célula exibe tooltip: processo, tick, estado, detalhes |

### RF-05 — Métricas

| ID | Descrição |
|----|-----------|
| RF-05.1 | Métricas são calculadas por processo ao final da simulação |
| RF-05.2 | Métricas globais (médias, totais) são exibidas em painel separado |
| RF-05.3 | Um gráfico de barras comparativo exibe o turnaround e waiting time por processo |
| RF-05.4 | A classificação CPU Bound / I/O Bound é determinada automaticamente (ver seção 5) |
| RF-05.5 | As métricas podem ser exportadas como CSV |

### RF-06 — Persistência Local

| ID | Descrição |
|----|-----------|
| RF-06.1 | O estado atual (processos + configuração) é salvo automaticamente no `localStorage` |
| RF-06.2 | O usuário pode exportar/importar configurações como JSON |
| RF-06.3 | Cenários pré-definidos (presets) estão disponíveis para carregamento rápido |

---

## 3. Modelo de Dados

### 3.1 Processo (`Process`)

```typescript
interface BurstSegment {
  type: "cpu" | "io";
  duration: number;        // unidades de tempo
}

interface Process {
  id: string;              // UUID gerado na criação
  name: string;            // "P1", "P2" ou nome personalizado
  arrivalTime: number;     // tick de chegada na fila ready (≥ 0)
  priority: number;        // 1 (maior prioridade) a 10 (menor); padrão 5
  color: string;           // cor HEX para o diagrama
  bursts: BurstSegment[];  // sequência alternada CPU→I/O→CPU→...
                           // deve começar e terminar com CPU
}
```

**Exemplo de processo:**

```json
{
  "id": "p1",
  "name": "P1",
  "arrivalTime": 0,
  "priority": 3,
  "color": "#4FC3F7",
  "bursts": [
    { "type": "cpu", "duration": 4 },
    { "type": "io",  "duration": 3 },
    { "type": "cpu", "duration": 2 }
  ]
}
```

> **Regra:** `bursts` deve ter estrutura CPU → (IO → CPU)\* — sempre começa com CPU. Mínimo: 1 burst CPU.

### 3.2 Configuração do Escalonador (`SchedulerConfig`)

```typescript
interface SchedulerConfig {
  algorithm: SchedulingAlgorithm;
  quantum: number;              // apenas para RR (padrão: 2)
  contextSwitchTime: number;    // overhead entre processos (padrão: 0)
  isPreemptive: boolean;        // aplicável a SJF e Priority
  agingEnabled: boolean;        // evitar starvation em Priority
  agingInterval: number;        // ticks para incremento de prioridade
}
```

### 3.3 Estado de Execução do Processo (`ProcessState`)

```typescript
type StateLabel =
  | "New"          // antes do arrivalTime
  | "Ready"        // na fila, aguardando CPU
  | "Running"      // executando burst CPU
  | "Waiting"      // executando burst I/O
  | "Terminated";  // concluído

interface ProcessRuntime {
  processId: string;
  state: StateLabel;
  remainingBurst: number;    // ticks restantes no burst atual
  burstIndex: number;        // índice atual em Process.bursts
  arrivalTick: number;       // tick em que entrou na fila Ready pela 1ª vez
  startTick: number | null;  // tick da 1ª vez em Running
  finishTick: number | null; // tick em que terminou
  waitingTime: number;       // acumulado em Ready
  cpuTime: number;           // acumulado em Running
  ioTime: number;            // acumulado em Waiting
  responseTime: number | null;
}
```

### 3.4 Tick de Simulação (`SimTick`)

```typescript
interface SimTick {
  tick: number;
  cpuProcess: string | null;         // PID executando na CPU
  ioProcesses: string[];             // PIDs em I/O
  readyQueue: string[];              // ordem da fila ready
  states: Record<string, StateLabel>;
  contextSwitching: boolean;         // overhead ativo
}
```

---

## 4. Algoritmos de Escalonamento

### 4.1 Lista de Algoritmos Suportados

| Código | Nome | Preemptivo? | Parâmetro extra |
|--------|------|-------------|-----------------|
| `FCFS` | First Come First Served | Não | — |
| `SJF_NP` | Shortest Job First (não-preemptivo) | Não | — |
| `SJF_P` | Shortest Remaining Time First (preemptivo) | Sim | — |
| `RR` | Round Robin | Sim | Quantum |
| `PRIORITY_NP` | Priority Scheduling (não-preemptivo) | Não | — |
| `PRIORITY_P` | Priority Scheduling (preemptivo) | Sim | — |
| `MULTILEVEL` | Multilevel Queue | Sim | Nº de filas, quantum por fila |
| `HRRN` | Highest Response Ratio Next | Não | — |

### 4.2 Regras de Desempate

Para todos os algoritmos, quando dois processos têm o mesmo critério de seleção, o desempate é feito por ordem de chegada (`arrivalTime`) e depois por `id` lexicográfico.

### 4.3 Especificação de Comportamento por Algoritmo

#### FCFS
- A fila ready é ordenada por `arrivalTime` ascendente.
- O processo na cabeça da fila ocupa a CPU até terminar seu burst CPU atual.
- Ao término do burst CPU, se houver burst I/O, transita para Waiting.
- Ao terminar o I/O, retorna para a fila Ready (cauda).

#### SJF Não-Preemptivo
- Na seleção, escolhe o processo com **menor burst CPU atual** (`remainingBurst`).
- Não interrompe o processo em execução.

#### SRTF (SJF Preemptivo)
- A cada tick, verifica se algum processo na fila Ready tem `remainingBurst` menor que o processo atual.
- Se sim, realiza preempção (com context switch se configurado).

#### Round Robin
- Usa fila FIFO com quantum `q`.
- Ao expirar o quantum, o processo retorna ao fim da fila Ready se ainda tiver burst CPU restante.
- I/O bursts não consomem quantum.

#### Priority (Não-Preemptivo / Preemptivo)
- Menor valor numérico = maior prioridade.
- Com aging habilitado: a cada `agingInterval` ticks em Ready, `priority--` (até mínimo 1).

#### HRRN
- `ratio = (waitingTime + burstTime) / burstTime`
- A cada seleção, escolhe o processo com maior ratio.
- Não-preemptivo.

---

## 5. Definição de CPU Bound vs. I/O Bound

A classificação é feita **por processo**, baseada na proporção de tempo total gasto:

```
cpuRatio  = cpuTime / (cpuTime + ioTime)
ioRatio   = ioTime  / (cpuTime + ioTime)

if cpuRatio >= 0.65  → "CPU Bound"
if ioRatio  >= 0.65  → "I/O Bound"
else                 → "Balanced"
```

A classificação aparece:
- Na lista de processos (badge de preview, calculado sobre os bursts declarados)
- Na tabela de métricas (calculado sobre os tempos reais simulados)

---

## 6. Métricas

### 6.1 Métricas por Processo

| Métrica | Fórmula | Descrição |
|---------|---------|-----------|
| **Arrival Time** | `arrivalTime` | Tick de chegada na fila |
| **First CPU Tick** | `startTick` | Primeiro tick em Running |
| **Finish Time** | `finishTick` | Tick de término |
| **Response Time** | `startTick − arrivalTime` | Tempo até 1ª vez na CPU |
| **Turnaround Time** | `finishTick − arrivalTime` | Tempo total de vida |
| **Waiting Time** | `turnaround − cpuTime − ioTime` | Tempo na fila Ready |
| **CPU Time** | Σ Running ticks | Total de CPU consumida |
| **I/O Time** | Σ Waiting ticks | Total de I/O |
| **CPU Utilization** | `cpuTime / turnaround × 100` | % do turnaround em CPU |
| **Bound Type** | ver seção 5 | CPU Bound / I/O Bound / Balanced |

### 6.2 Métricas Globais

| Métrica | Fórmula |
|---------|---------|
| **Avg Response Time** | Média dos response times |
| **Avg Turnaround Time** | Média dos turnarounds |
| **Avg Waiting Time** | Média dos waiting times |
| **CPU Throughput** | `processos concluídos / tempo total` |
| **CPU Utilization (global)** | `Σ Running ticks / tempo total × 100` |
| **Total Simulation Time** | Tick final |

---

## 7. Arquitetura da Aplicação

### 7.1 Stack Tecnológica

```
Runtime:     React 18 + Vite 5
Linguagem:   TypeScript 5
Estilos:     Tailwind CSS 3 + CSS Modules (para componentes específicos)
Gráficos:    Recharts (gráfico de barras de métricas)
Estado:      Zustand (store global)
Persistência: localStorage (auto-save) + JSON import/export
Testes:      Vitest + @testing-library/react
```

### 7.2 Estrutura de Pastas

```
src/
├── core/                    # Lógica pura — sem React
│   ├── algorithms/
│   │   ├── fcfs.ts
│   │   ├── sjf.ts
│   │   ├── rr.ts
│   │   ├── priority.ts
│   │   ├── hrrn.ts
│   │   ├── multilevel.ts
│   │   └── index.ts         # dispatch por algoritmo
│   ├── engine.ts            # SimulationEngine — step(), runAll()
│   ├── metrics.ts           # cálculo de métricas
│   ├── types.ts             # todas as interfaces
│   └── presets.ts           # cenários pré-definidos
│
├── store/
│   ├── processStore.ts      # CRUD de processos
│   ├── simulationStore.ts   # estado da simulação, ticks
│   └── uiStore.ts           # estado da UI (painéis abertos, velocidade)
│
├── components/
│   ├── ProcessPanel/        # criação/edição de processos
│   │   ├── ProcessList.tsx
│   │   ├── ProcessForm.tsx
│   │   └── ProcessCard.tsx
│   ├── SchedulerPanel/      # seleção de algoritmo e parâmetros
│   │   ├── AlgorithmSelector.tsx
│   │   └── SchedulerConfig.tsx
│   ├── ControlBar/          # play, pause, step, reset, velocidade
│   │   └── ControlBar.tsx
│   ├── GanttChart/          # diagrama de Gantt
│   │   ├── GanttChart.tsx
│   │   ├── GanttRow.tsx
│   │   ├── GanttCell.tsx
│   │   └── GanttLegend.tsx
│   ├── MetricsPanel/        # tabela + gráficos
│   │   ├── MetricsTable.tsx
│   │   ├── MetricsChart.tsx
│   │   └── GlobalMetrics.tsx
│   └── shared/              # botões, badges, tooltips, modais
│
├── hooks/
│   ├── useSimulation.ts     # loop de simulação com requestAnimationFrame
│   ├── useLocalStorage.ts
│   └── useExport.ts
│
├── App.tsx
└── main.tsx
```

### 7.3 Fluxo de Dados

```
[ProcessForm] ──create/edit──► [processStore]
                                      │
[AlgorithmSelector] ──config──► [simulationStore]
                                      │
                               [SimulationEngine]
                               ┌──────┴──────┐
                            step()        runAll()
                               └──────┬──────┘
                                 SimTick[]
                                      │
                    ┌─────────────────┼────────────────┐
               [GanttChart]    [ControlBar]      [MetricsPanel]
```

---

## 8. Motor de Simulação (`SimulationEngine`)

### 8.1 Interface Pública

```typescript
class SimulationEngine {
  constructor(processes: Process[], config: SchedulerConfig);

  // Avança 1 tick; retorna o snapshot daquele tick
  step(): SimTick;

  // Executa todos os ticks até o fim; retorna array completo
  runAll(): SimTick[];

  // Verdadeiro se todos os processos estão Terminated
  get isFinished(): boolean;

  // Tick atual
  get currentTick(): number;

  // Estado atual de todos os processos
  get runtimeStates(): ProcessRuntime[];
}
```

### 8.2 Loop Principal (pseudocódigo)

```
function step():
  tick++

  // 1. Verificar chegadas de novos processos
  for each process where arrivalTime == tick:
    transitionTo(process, "Ready")
    addToReadyQueue(process)

  // 2. Aging (se habilitado)
  if agingEnabled and tick % agingInterval == 0:
    for each process in readyQueue:
      process.priority = max(1, process.priority - 1)

  // 3. Verificar fim de I/O
  for each process in ioQueue:
    process.remainingBurst--
    if process.remainingBurst == 0:
      advanceBurst(process)
      if hasMoreBursts(process):
        transitionTo(process, "Ready")
        addToReadyQueue(process)
      else:
        transitionTo(process, "Terminated")
        process.finishTick = tick

  // 4. Verificar fim do burst CPU atual
  if cpuProcess != null:
    cpuProcess.remainingBurst--
    cpuProcess.cpuTime++
    if cpuProcess.remainingBurst == 0:
      advanceBurst(cpuProcess)
      if hasIoBurst(cpuProcess):
        transitionTo(cpuProcess, "Waiting")
        addToIoQueue(cpuProcess)
        cpuProcess = null
      else if hasMoreCpuBurst(cpuProcess):
        // volta pra ready (ex: após I/O futuro)
      else:
        transitionTo(cpuProcess, "Terminated")
        cpuProcess = null

  // 5. Verificar preempção (algoritmos preemptivos)
  if isPreemptive and cpuProcess != null:
    candidate = algorithm.selectFromReady(readyQueue)
    if shouldPreempt(candidate, cpuProcess):
      preempt(cpuProcess)
      cpuProcess = candidate

  // 6. Selecionar próximo processo (se CPU livre)
  if cpuProcess == null and readyQueue.length > 0:
    cpuProcess = algorithm.selectFromReady(readyQueue)
    if cpuProcess.startTick == null:
      cpuProcess.startTick = tick
    transitionTo(cpuProcess, "Running")

  // 7. Acumular waiting time
  for each process in readyQueue:
    process.waitingTime++

  return snapshot()
```

---

## 9. Interface do Usuário

### 9.1 Layout Geral (Desktop)

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: título, botão de preset, import/export                     │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                       │
│  ESQUERDA    │  CENTRO/DIREITA                                       │
│  (320px)     │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│  [Processos] │  │  BARRA DE CONTROLE (play/pause/step/reset/vel.) │ │
│  + lista     │  └─────────────────────────────────────────────────┘ │
│  + formulário│                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│  ──────────  │  │  GANTT CHART (scroll horizontal)                │ │
│              │  │  Tick: 00000000000001111111111122222222222233...  │ │
│  [Algoritmo] │  │  P1:   ██████░░░░░░██████░░░░░█████            │ │
│  + parâmetros│  │  P2:   ░░░░░░██████░░░░░░████░░░░░             │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                       │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │  MÉTRICAS (tabela por processo + gráficos)      │ │
│              │  └─────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 9.2 Cores de Estado no Gantt

| Estado | Cor | Token CSS |
|--------|-----|-----------|
| New | Cinza escuro | `--state-new` |
| Ready | Amarelo âmbar | `--state-ready` |
| Running | Verde brilhante | `--state-running` |
| Waiting (I/O) | Azul ciano | `--state-waiting` |
| Terminated | Cinza claro | `--state-terminated` |
| Context Switch | Vermelho/laranja | `--state-ctx-switch` |

### 9.3 Formulário de Processo

Campos:
- **Nome** (text, max 8 chars)
- **Arrival Time** (number, ≥ 0)
- **Priority** (1–10)
- **Cor** (color picker)
- **Bursts** — editor visual de bursts com botões +/− por segmento
  - Tipo: `CPU` | `I/O`
  - Duração (number, ≥ 1)
  - Validação: deve iniciar com CPU, alternar CPU/IO

### 9.4 Painel de Algoritmo

Exibe:
- Dropdown de seleção de algoritmo
- Campos condicionais:
  - RR → `quantum`
  - Priority → `preemptive toggle`, `aging toggle + interval`
  - Multilevel → configuração de filas
- Context switch time (sempre)
- Tooltip explicativo por algoritmo

### 9.5 Barra de Controle

```
[⏮ Reset]  [⏭ Step]  [▶ Play / ⏸ Pause]  [Tick: 0042]  [Velocidade: 1×▾]
```

### 9.6 Painel de Métricas (após simulação)

**Tab 1 — Por Processo:**

Tabela com colunas:
`Processo | Arrival | Start | Finish | Response | Turnaround | Waiting | CPU Time | I/O Time | CPU% | Bound`

**Tab 2 — Globais:**

Cards com:
- Avg Response Time
- Avg Turnaround Time
- Avg Waiting Time
- CPU Throughput
- CPU Utilization %
- Total Simulation Time

**Tab 3 — Gráfico:**

Gráfico de barras agrupadas por processo:
- Barras: Waiting Time, CPU Time, I/O Time (empilhadas para turnaround)

---

## 10. Cenários Pré-definidos (Presets)

| Nome | Descrição | Algoritmo sugerido |
|------|-----------|-------------------|
| `classic_fcfs` | 4 processos simples, sem I/O | FCFS |
| `convoy_effect` | Demonstra o efeito de comboio do FCFS | FCFS vs SJF |
| `rr_demo` | 5 processos com quantum 3 | Round Robin |
| `starvation` | Prioridades que causam starvation | Priority NP |
| `aging_fix` | Mesmo cenário, com aging ativo | Priority P + Aging |
| `io_heavy` | Processos I/O Bound vs CPU Bound misturados | SRTF |
| `multilevel_demo` | Demonstra MLQ | Multilevel |

---

## 11. Requisitos Não-Funcionais

| RNF | Requisito |
|-----|-----------|
| RNF-01 | Desempenho: simulações com até 16 processos e 1000 ticks sem travamento |
| RNF-02 | Responsividade: layout funcional em telas ≥ 768px |
| RNF-03 | Acessibilidade: ARIA labels nos controles principais, contraste WCAG AA |
| RNF-04 | Offline-first: 100% funcional sem internet após build |
| RNF-05 | Build size < 500 KB gzipped |
| RNF-06 | Suporte a Chrome 120+, Firefox 120+, Safari 17+ |

---

## 12. Plano de Implementação (Fases)

### Fase 1 — Core Engine (sem UI) — *~2 dias*
- [ ] Definir todos os tipos em `core/types.ts`
- [ ] Implementar `SimulationEngine` com suporte a FCFS
- [ ] Testes unitários: FCFS, estados de transição, métricas
- [ ] Implementar SJF NP e RR com testes
- [ ] Implementar Priority NP/P com aging e testes
- [ ] Implementar SRTF e HRRN com testes

### Fase 2 — Store & State Management — *~1 dia*
- [ ] Configurar Zustand stores
- [ ] Hook `useSimulation` com loop de animação
- [ ] Integração com localStorage

### Fase 3 — UI Base — *~2 dias*
- [ ] Layout geral (sidebar + área principal)
- [ ] `ProcessForm` e `ProcessList`
- [ ] `AlgorithmSelector` e `SchedulerConfig`
- [ ] `ControlBar`

### Fase 4 — Gantt Chart — *~2 dias*
- [ ] Renderização de células por tick e processo
- [ ] Auto-scroll horizontal
- [ ] Tooltip por célula
- [ ] Legenda de estados

### Fase 5 — Métricas e Gráficos — *~1 dia*
- [ ] Tabela de métricas por processo
- [ ] Cards de métricas globais
- [ ] Gráfico de barras com Recharts
- [ ] Export CSV

### Fase 6 — Polimento e Presets — *~1 dia*
- [ ] Presets prontos para carregar
- [ ] Gerador de processos aleatórios
- [ ] Import/export JSON
- [ ] Responsividade mobile (≥768px)
- [ ] Refinamento visual

**Total estimado: ~9 dias de trabalho focado**

---

## 13. Casos de Teste Funcionais

### CT-01: FCFS Básico

**Entrada:**
```
P1: arrival=0, bursts=[CPU:4]
P2: arrival=1, bursts=[CPU:3]
P3: arrival=2, bursts=[CPU:1]
```

**Esperado:**
```
Gantt: P1(0-4), P2(4-7), P3(7-8)
P1: response=0, turnaround=4, waiting=0
P2: response=3, turnaround=6, waiting=3
P3: response=5, turnaround=6, waiting=5
```

### CT-02: Round Robin (quantum=2)

**Entrada:**
```
P1: arrival=0, bursts=[CPU:5]
P2: arrival=0, bursts=[CPU:3]
P3: arrival=0, bursts=[CPU:1]
quantum=2
```

**Esperado:**
```
Gantt: P1(0-2), P2(2-4), P3(4-5), P1(5-7), P2(7-8), P1(8-9)
P1: response=0, turnaround=9, waiting=4
P2: response=2, turnaround=8, waiting=5
P3: response=4, turnaround=5, waiting=4
```

### CT-03: Classificação Bound

**Entrada:**
```
P1: bursts=[CPU:8, IO:1, CPU:1]  → cpuRatio = 9/10 = 90% → CPU Bound
P2: bursts=[CPU:1, IO:8, CPU:1]  → cpuRatio = 2/10 = 20% → I/O Bound
P3: bursts=[CPU:4, IO:2, CPU:4]  → cpuRatio = 8/10 = 80% → CPU Bound
```

### CT-04: Preempção SRTF

**Entrada:**
```
P1: arrival=0, bursts=[CPU:8]
P2: arrival=1, bursts=[CPU:4]
quantum=∞ (SRTF)
```

**Esperado:**
```
P1 executa tick 0-1, P2 preempta no tick 1 (remaining=3<7), P2 termina tick 5,
P1 retoma e termina tick 12
```

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **Tick** | Unidade atômica de tempo na simulação (equivale a 1 unidade de tempo de CPU) |
| **Burst** | Segmento contínuo de execução (CPU ou I/O) |
| **Quantum** | Fatia máxima de CPU no Round Robin |
| **Context Switch** | Overhead ao trocar o processo em execução na CPU |
| **Starvation** | Processo que nunca recebe CPU por processos de maior prioridade sempre chegando |
| **Aging** | Mecanismo que aumenta gradualmente a prioridade de processos esperando há muito tempo |
| **Turnaround Time** | Tempo total desde a chegada até o término do processo |
| **Response Time** | Tempo entre a chegada e o primeiro uso de CPU |
| **Waiting Time** | Tempo total em que o processo ficou na fila Ready |
| **CPU Bound** | Processo que passa a maior parte do tempo usando CPU |
| **I/O Bound** | Processo que passa a maior parte do tempo aguardando I/O |
| **FCFS** | First Come, First Served — ordem de chegada |
| **SJF** | Shortest Job First — menor burst next |
| **SRTF** | Shortest Remaining Time First — SJF preemptivo |
| **RR** | Round Robin — revezamento com quantum |
| **HRRN** | Highest Response Ratio Next — balanceia tempo de espera e burst |
