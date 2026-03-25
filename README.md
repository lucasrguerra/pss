# 🖥️ Process Scheduler Simulator

> Uma ferramenta educacional interativa para visualizar e comparar algoritmos clássicos de escalonamento de processos de Sistemas Operacionais.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ O que é?

O **Process Scheduler Simulator (PSS)** roda completamente no navegador, sem servidor e sem instalação de dependências de sistema. Você define os processos, escolhe o algoritmo, e assiste à simulação acontecer em tempo real através do diagrama de Gantt.

Ideal para:
- 📚 Estudantes de Sistemas Operacionais querendo visualizar o que antes era só teoria
- 👩‍🏫 Professores buscando uma ferramenta interativa para sala de aula
- 🔍 Profissionais revisitando fundamentos de SO

---

## 🚀 Quick Start

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- npm 10+

### Instalação e execução local

```bash
# Clone o repositório
git clone https://github.com/lucasrguerra/pss.git
cd pss

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) no seu navegador.

### Build de produção

```bash
npm run build
npm run preview
```

### Com Docker

```bash
docker compose up
```

---

## 🎮 Como usar

1. **Crie seus processos**: No painel esquerdo, adicione processos definindo nome, tempo de chegada, prioridade e sequência de bursts (CPU e I/O). Ative a opção **Usar Threads** para criar threads dentro do processo, escolhendo o modelo (MANY_TO_ONE, ONE_TO_ONE ou MANY_TO_MANY) e a política intra-processo (FCFS, RR ou Priority).
2. **Configure o escalonador**: Escolha o algoritmo e ajuste os parâmetros (quantum para RR, aging para Priority, quantuns e boost para MLFQ, etc.).
3. **Execute a simulação**: Use os controles de Play/Pause/Step para rodar a simulação na velocidade que quiser (0.25× até 4×).
4. **Analise os resultados**: O diagrama de Gantt mostra em tempo real o estado de cada processo (e suas threads, quando configuradas). Ao final, o painel de métricas exibe turnaround, waiting time, throughput, e — na aba Threads — métricas individuais por thread.

> 💡 **Dica:** Carregue um dos **presets** disponíveis para ver fenômenos clássicos como o efeito de comboio do FCFS ou starvation com Priority Scheduling.

---

## ⚙️ Algoritmos Suportados

| Algoritmo | Preemptivo? | Parâmetros |
|-----------|:-----------:|------------|
| **FCFS**: First Come, First Served | ❌ | Nenhum |
| **SJF**: Shortest Job First | ❌ | Nenhum |
| **SRTF**: Shortest Remaining Time First | ✅ | Nenhum |
| **Round Robin (RR)** | ✅ | Quantum |
| **Priority NP**: Prioridade Não-Preemptiva | ❌ | Aging (opcional) |
| **Priority P**: Prioridade Preemptiva | ✅ | Aging (opcional) |
| **Priority RR**: Prioridade com Round Robin | ✅ | Quantum + Aging (opcional) |
| **HRRN**: Highest Response Ratio Next | ❌ | Nenhum |
| **Multilevel Queue** | ✅ | Quantum por fila |
| **MLFQ**: Multilevel Feedback Queue | ✅ | Quantuns por fila + intervalo de boost |

> Consulte a [documentação dos algoritmos](./docs/algorithms.md) para detalhes sobre como cada um funciona.

---

## 📊 Métricas calculadas

Para cada processo simulado, o PSS calcula automaticamente:

- **Response Time**: tempo até o primeiro uso de CPU
- **Turnaround Time**: tempo total desde a chegada até o término
- **Waiting Time**: tempo total na fila Ready
- **CPU Time / I/O Time**: tempo efetivo em cada tipo de burst
- **CPU Utilization**: percentual do turnaround em CPU
- **Bound Type**: classificação automática em CPU Bound, I/O Bound ou Balanced

E globalmente: médias de response/turnaround/waiting, throughput e utilização global de CPU.

---

## 🗂️ Estrutura do Projeto

```
src/
├── core/                    # Lógica pura (sem React)
│   ├── algorithms/          # Implementação de cada algoritmo
│   │   ├── base.ts          # Classe abstrata BaseScheduler
│   │   ├── fcfs.ts
│   │   ├── sjf.ts
│   │   ├── rr.ts
│   │   ├── priority.ts
│   │   ├── priority_rr.ts
│   │   ├── hrrn.ts
│   │   ├── multilevel.ts
│   │   ├── mlfq.ts          # Multilevel Feedback Queue
│   │   └── index.ts         # Dispatch por algoritmo
│   ├── engine.ts            # SimulationEngine, orquestra os ticks (suporte a threads)
│   ├── thread-scheduler.ts  # Escalonador intra-processo (FCFS / RR / Priority)
│   ├── metrics.ts           # Cálculo de métricas por processo, globais e por thread
│   ├── types.ts             # Todas as interfaces TypeScript
│   └── presets.ts           # Cenários pré-definidos (processos e threads)
│
├── store/                   # Estado global com Zustand
├── components/              # Componentes React
│   ├── ProcessPanel/        # Criação e edição de processos
│   │   ├── ThreadEditor.tsx # Editor de threads (modelo, política, bursts por thread)
│   │   └── ...
│   ├── SchedulerPanel/      # Seleção de algoritmo e parâmetros
│   ├── ControlBar/          # Play, Pause, Step, Reset, velocidade
│   ├── GanttChart/          # Diagrama de Gantt interativo
│   │   ├── GanttThreadRow.tsx  # Sub-linha de thread no Gantt
│   │   └── ...
│   ├── MetricsPanel/        # Tabela, gráficos e métricas globais
│   │   ├── ThreadMetricsTable.tsx  # Tabela de métricas por thread
│   │   └── ...
│   └── shared/              # Botões, badges, tooltips, modais
│       ├── threadUtils.ts   # Derivação de cores de threads (HSL)
│       └── ...
│
└── hooks/                   # Hooks personalizados (loop de animação, export, etc.)
```

---

## 📦 Presets disponíveis

Carregue cenários clássicos com um clique para explorar fenômenos de SO:

**Processos:**

| Preset | O que demonstra |
|--------|-----------------|
| `classic_fcfs` | Execução básica com FCFS, sem I/O |
| `convoy_effect` | Efeito de comboio: um processo longo bloqueando vários curtos |
| `rr_demo` | Revezamento justo com Round Robin (quantum=3) |
| `starvation` | Processos de baixa prioridade nunca recebem CPU |
| `aging_fix` | O mesmo cenário de starvation, resolvido com aging |
| `io_heavy` | Mix de processos CPU Bound vs I/O Bound |
| `multilevel_demo` | Múltiplas filas com prioridades diferentes |

**Threads:**

| Preset | O que demonstra |
|--------|-----------------|
| `many_to_one` | Modelo N:1 — I/O de uma thread bloqueia todo o processo |
| `one_to_one` | Modelo 1:1 — threads bloqueiam independentemente |
| `many_to_many` | Modelo N:M — slots de kernel limitam o paralelismo |
| `thread_starvation` | Starvation intra-processo com política Priority |
| `threads_vs_processes` | Comparação direta: processo com threads vs processo único |

---

## 🧪 Testes

```bash
# Roda todos os testes unitários
npm test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Com relatório de cobertura
npm run test:coverage
```

Os testes cobrem a engine de simulação, todos os algoritmos de escalonamento, e o cálculo de métricas.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework UI | React 18 |
| Linguagem | TypeScript 5 |
| Build tool | Vite 6 |
| Estilos | Tailwind CSS 4 |
| Estado global | Zustand 5 |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Testes | Vitest + Testing Library |

---

## 📄 Documentação adicional

- [📐 Algoritmos de Escalonamento](./docs/algorithms.md): descrição detalhada de cada algoritmo, regras de desempate e exemplos
- [📏 Métricas](./docs/metrics.md): fórmulas e definições de todas as métricas calculadas
- [📝 JOSS Paper](./paper.md): artigo científico submetido ao Journal of Open Source Software

*Also available in: [🇺🇸 English](./README.en.md)*

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, consulte nosso guia em [CONTRIBUTING.md](./CONTRIBUTING.md) para obter detalhes sobre como configurar o ambiente de desenvolvimento, reportar bugs ou enviar um Pull Request.

---

## 📜 Licença

Distribuído sob a [Licença MIT](./LICENSE). Desenvolvido por [Lucas Rayan Guerra](https://github.com/lucasrguerra).
