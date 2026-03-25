# 🖥️ Process Scheduler Simulator

> An interactive educational tool for visualizing and comparing classical CPU scheduling algorithms from Operating Systems.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ What is it?

The **Process Scheduler Simulator (PSS)** runs entirely in the browser, completely free of servers and system dependencies. You define the processes, choose the algorithm, and watch the simulation unfold in real time through the Gantt chart.

Ideal for:
- 📚 Operating Systems students who want to visualize what was once only theory
- 👩‍🏫 Instructors looking for an interactive classroom tool
- 🔍 Professionals revisiting OS fundamentals

A live demo is available at: **https://pss.lucasrguerra.dev.br/**

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm 10+

### Local installation and run

```bash
# Clone the repository
git clone https://github.com/lucasrguerra/pss.git
cd pss

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production build

```bash
npm run build
npm run preview
```

### With Docker

```bash
docker compose up
```

---

## 🎮 How to use

1. **Create your processes**: In the left panel, add processes by defining name, arrival time, priority, and a sequence of bursts (CPU and I/O). Enable the **Use Threads** toggle to create threads within a process, choosing the model (MANY_TO_ONE, ONE_TO_ONE, or MANY_TO_MANY) and the intra-process policy (FCFS, RR, or Priority).
2. **Configure the scheduler**: Choose an algorithm and adjust the parameters (quantum for RR, aging for Priority, quantums and boost interval for MLFQ, etc.).
3. **Run the simulation**: Use the Play/Pause/Step controls to run the simulation at the speed you want (0.25× to 4×).
4. **Analyze the results**: The Gantt chart shows each process's state in real time (and its threads, when configured). At the end, the metrics panel displays turnaround, waiting time, throughput, and — in the Threads tab — individual per-thread metrics.

> 💡 **Tip:** Load one of the built-in **presets** to see classic phenomena such as the FCFS convoy effect or priority starvation.

---

## ⚙️ Supported Algorithms

| Algorithm | Preemptive? | Parameters |
|-----------|:-----------:|------------|
| **FCFS**: First Come, First Served | ❌ | None |
| **SJF**: Shortest Job First | ❌ | None |
| **SRTF**: Shortest Remaining Time First | ✅ | None |
| **Round Robin (RR)** | ✅ | Quantum |
| **Priority NP**: Non-Preemptive Priority | ❌ | Aging (optional) |
| **Priority P**: Preemptive Priority | ✅ | Aging (optional) |
| **Priority RR**: Priority with Round Robin | ✅ | Quantum + Aging (optional) |
| **HRRN**: Highest Response Ratio Next | ❌ | None |
| **Multilevel Queue** | ✅ | Quantum per queue |
| **MLFQ**: Multilevel Feedback Queue | ✅ | Quantums per queue + boost interval |

> See the [algorithms documentation](./docs/algorithms.en.md) for details on how each one works.

---

## 📊 Computed Metrics

For each simulated process, PSS automatically computes:

- **Response Time**: time until the first CPU usage
- **Turnaround Time**: total time from arrival to completion
- **Waiting Time**: total time spent in the Ready queue
- **CPU Time / I/O Time**: effective time in each type of burst
- **CPU Utilization**: percentage of turnaround time spent on CPU
- **Bound Type**: automatic classification as CPU Bound, I/O Bound, or Balanced

Globally: averages for response/turnaround/waiting, throughput, and overall CPU utilization.

---

## 🗂️ Project Structure

```
src/
├── core/                    # Pure logic (no React)
│   ├── algorithms/          # Implementation of each algorithm
│   │   ├── base.ts          # Abstract class BaseScheduler
│   │   ├── fcfs.ts
│   │   ├── sjf.ts
│   │   ├── rr.ts
│   │   ├── priority.ts
│   │   ├── priority_rr.ts
│   │   ├── hrrn.ts
│   │   ├── multilevel.ts
│   │   ├── mlfq.ts          # Multilevel Feedback Queue
│   │   └── index.ts         # Dispatch by algorithm
│   ├── engine.ts            # SimulationEngine, orchestrates the ticks (thread-aware)
│   ├── thread-scheduler.ts  # Intra-process scheduler (FCFS / RR / Priority)
│   ├── metrics.ts           # Per-process, global, and per-thread metrics computation
│   ├── types.ts             # All TypeScript interfaces
│   └── presets.ts           # Pre-defined scenarios (processes and threads)
│
├── store/                   # Global state with Zustand
├── components/              # React components
│   ├── ProcessPanel/        # Process creation and editing
│   │   ├── ThreadEditor.tsx # Thread editor (model, policy, per-thread bursts)
│   │   └── ...
│   ├── SchedulerPanel/      # Algorithm selection and parameters
│   ├── ControlBar/          # Play, Pause, Step, Reset, speed
│   ├── GanttChart/          # Interactive Gantt chart
│   │   ├── GanttThreadRow.tsx  # Thread sub-row in the Gantt chart
│   │   └── ...
│   ├── MetricsPanel/        # Table, charts, and global metrics
│   │   ├── ThreadMetricsTable.tsx  # Per-thread metrics table
│   │   └── ...
│   └── shared/              # Buttons, badges, tooltips, modals
│       ├── threadUtils.ts   # Thread color derivation (HSL)
│       └── ...
│
└── hooks/                   # Custom hooks (animation loop, export, etc.)
```

---

## 📦 Available Presets

Load classic scenarios with a single click to explore OS phenomena:

**Processes:**

| Preset | What it demonstrates |
|--------|----------------------|
| `classic_fcfs` | Basic execution with FCFS, no I/O |
| `convoy_effect` | Convoy effect: one long process blocking many short ones |
| `rr_demo` | Fair time-sharing with Round Robin (quantum=3) |
| `starvation` | Low-priority processes never receive CPU |
| `aging_fix` | The same starvation scenario, solved with aging |
| `io_heavy` | Mix of CPU Bound vs. I/O Bound processes |
| `multilevel_demo` | Multiple queues with different priorities |

**Threads:**

| Preset | What it demonstrates |
|--------|----------------------|
| `many_to_one` | N:1 model — any thread's I/O blocks the entire process |
| `one_to_one` | 1:1 model — threads block independently |
| `many_to_many` | N:M model — kernel slots limit parallelism |
| `thread_starvation` | Intra-process starvation with Priority policy |
| `threads_vs_processes` | Direct comparison: threaded process vs single-burst process |

---

## 🧪 Tests

```bash
# Run all unit tests
npm test

# Watch mode (re-runs on save)
npm run test:watch

# With coverage report
npm run test:coverage
```

Tests cover the simulation engine, all scheduling algorithms, and metrics computation.

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Language | TypeScript 5 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Global state | Zustand 5 |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Vitest + Testing Library |

---

## 📄 Additional Documentation

- [📐 Scheduling Algorithms](./docs/algorithms.en.md): detailed description of each algorithm, tie-breaking rules, and examples
- [📏 Metrics](./docs/metrics.en.md): formulas and definitions for all computed metrics
- [📝 JOSS Paper](./paper.md): scientific paper submitted to the Journal of Open Source Software

*Também disponível em: [🇧🇷 Português](./README.md)*

---

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) guide for details on our code of conduct, and the process for submitting Pull Requests to us.

---

## 📜 License

Distributed under the [MIT License](./LICENSE). Developed by [Lucas Rayan Guerra](https://github.com/lucasrguerra).
