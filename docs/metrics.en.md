# Metrics

*Também disponível em: [🇧🇷 Português](./metrics.md)*

PSS automatically computes a set of metrics at the end (or during) the simulation. This document explains each metric, its formula, what it represents, and how to read it in the charts.

---

## Per-Process Metrics

These metrics are computed individually for each simulated process.

| Metric | Formula | What it means |
|--------|---------|----------------|
| **Arrival Time** | `arrivalTime` | Tick at which the process first entered the Ready queue |
| **First CPU Tick** | `startTick` | Tick at which the process first used the CPU |
| **Finish Time** | `finishTick` | Tick at which the process completed its execution |
| **Response Time** | `startTick − arrivalTime` | How long the process waited before receiving the CPU for the first time |
| **Turnaround Time** | `finishTick − arrivalTime` | Total lifetime of the process (arrival → completion) |
| **Waiting Time** | `turnaround − cpuTime − ioTime` | Total time spent in the Ready queue (doing nothing useful) |
| **CPU Time** | Σ ticks in Running state | Total CPU actually consumed |
| **I/O Time** | Σ ticks in Waiting state | Total time waiting for I/O devices |
| **CPU Utilization** | `cpuTime / turnaround × 100` | Percentage of the turnaround time the process was actually using the CPU |
| **Bound Type** | see below | Classification of the process as CPU Bound, I/O Bound, or Balanced |

### Table visualization

In the **Per Process** tab, each row displays inline horizontal mini progress bars next to the numeric values. The bars are proportional to the **largest value of the same metric among all processes**, enabling immediate visual comparison:

| Column | Bar color |
|--------|-----------|
| Response Time | Amber |
| Turnaround Time | Blue |
| Waiting Time | Orange |
| CPU Time | Emerald |
| I/O Time | Cyan |
| CPU Utilization | Violet → Blue gradient |

---

## Global Metrics

Computed over the complete set of processes in the simulation.

| Metric | Formula |
|--------|---------|
| **Avg Response Time** | Average of all processes' response times |
| **Avg Turnaround Time** | Average of all turnaround times |
| **Avg Waiting Time** | Average of all waiting times |
| **CPU Throughput** | `completed processes / total simulation time` |
| **CPU Utilization (global)** | `Σ Running ticks / total time × 100` |
| **Total Simulation Time** | Tick of the last completion event |

In the **Global** tab, each time card (Response, Turnaround, Waiting) displays a bar proportional to the **total simulation time**, indicating "how much of that total time the average process spends in that state". The CPU Utilization bar uses an amber → green gradient to indicate utilization health.

---

## CPU Bound vs. I/O Bound Classification

At the end of the simulation, each process is automatically classified based on the proportion of time spent on CPU and I/O:

```
cpuRatio = cpuTime / (cpuTime + ioTime)
ioRatio  = ioTime  / (cpuTime + ioTime)

cpuRatio ≥ 0.65  → CPU Bound
ioRatio  ≥ 0.65  → I/O Bound
otherwise        → Balanced
```

- **CPU Bound:** the process spends most of its time using the processor.
- **I/O Bound:** the process spends most of its time waiting for I/O devices.
- **Balanced:** the process uses CPU and I/O in a balanced way.

> **In the process list:** estimate computed from the declared bursts (before simulation).  
> **In the metrics table:** classification computed from the actual recorded times.

---

## Charts ("Chart" tab)

### Comparative Profile (Radar Chart)

Displayed when there are **2 or more processes**. Each axis represents a time dimension, normalized from 0–100% relative to the largest value in that dimension among all processes:

| Axis | Meaning |
|------|---------|
| **Turnaround** | Relative total lifetime |
| **Response** | Relative time to first CPU |
| **Waiting** | Relative time in the Ready queue |
| **CPU Time** | Relative CPU usage |
| **I/O Time** | Relative I/O usage |

Each process is drawn as a colored polygon (the color configured for the process). Wider polygons indicate processes with larger times in the corresponding dimensions. The radar chart is ideal for identifying **profile differences** between processes (for example, a CPU Bound process will have a much larger CPU Time axis than I/O Time).

### Per-Process Breakdown (Stacked Bar Chart)

Always displayed. Each bar represents a process, with stacked segments:

- **Amber**: Waiting Time
- **Green**: CPU Time
- **Cyan**: I/O Time

The total height of each bar equals the **Turnaround Time** of the process.

---

## Thread Metrics

When a process has threads, PSS computes individual metrics for each thread. These metrics are displayed in the **Threads** tab of the metrics panel (visible only when there are processes with threads).

### Per-Thread Metrics

| Metric | Formula | What it means |
|--------|---------|----------------|
| **Arrival Time** | `arrivalTick` | Tick at which the thread first entered the Ready queue |
| **Start** | `startTick` | Tick at which the thread first used the CPU |
| **Finish** | `finishTick` | Tick at which the thread completed all of its bursts |
| **Response Time** | `startTick − arrivalTick` | How long the thread waited before receiving the CPU for the first time |
| **Turnaround Time** | `finishTick − arrivalTick` | Total lifetime of the thread (arrival → completion) |
| **Waiting Time** | `turnaround − cpuTime − ioTime` | Time in the Ready queue without doing anything useful |
| **CPU Time** | Σ ticks in Running state | Total CPU consumed by the thread |
| **I/O Time** | Σ ticks in Waiting state | Total time waiting for I/O |

### Thread Models and their impact on metrics

The thread model directly affects the recorded times:

| Model | Impact on Waiting Time |
|-------|------------------------|
| **MANY_TO_ONE** | Waiting Time tends to be high: any thread's I/O blocks the entire process, forcing other threads to wait |
| **ONE_TO_ONE** | Lower Waiting Time: threads block independently; while one does I/O, the others remain in the Ready queue |
| **MANY_TO_MANY** | Intermediate Waiting Time: threads that exceed the kernel slots enter `KernelWait` (shown with reduced opacity in the Gantt chart) |

### Visualization

The thread table displays inline horizontal mini progress bars in the Response, Turnaround, Waiting, CPU, and I/O columns, normalized by the largest value in each column across all threads — just like the process metrics table.

Each thread has a color derived from the parent process color (40° HSL hue shift per thread), shown as a colored dot in the table and as a sub-row in the Gantt chart.

---

## Example

Consider three processes with the following bursts:

| Process | Bursts | cpuTime | ioTime | cpuRatio | Classification |
|---------|--------|:-------:|:------:|:--------:|:--------------:|
| P1 | CPU:8, IO:1, CPU:1 | 9 | 1 | 90% | CPU Bound |
| P2 | CPU:1, IO:8, CPU:1 | 2 | 8 | 20% | I/O Bound |
| P3 | CPU:4, IO:2, CPU:4 | 8 | 2 | 80% | CPU Bound |
