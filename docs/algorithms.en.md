# Scheduling Algorithms

*Também disponível em: [🇧🇷 Português](./algorithms.md)*

This document describes in detail the scheduling algorithms implemented in PSS. For each algorithm, the operating principle, parameters, tie-breaking rules, and educational examples are presented.

---

## General Rules

- **Time unit:** the simulator operates in discrete *ticks*. Each tick represents 1 CPU time unit.
- **Bursts:** each process has an alternating sequence of bursts: `CPU → I/O → CPU → ...`, always starting with CPU.
- **Tie-breaking:** when two processes are tied on the algorithm's selection criterion, priority goes to the one that arrived first (`arrivalTime`). As a second tie-breaker, `id` is used in lexicographic order.
- **Context Switch:** if configured (≥ 1 tick), an overhead is inserted every time the CPU switches processes.

---

## FCFS (First Come, First Served)

**Type:** Non-preemptive

### How it works

Perhaps the most intuitive algorithm: the process that arrived first is served first. The Ready queue is sorted by `arrivalTime`. Once a process occupies the CPU, it stays there until its current CPU burst is complete, with no interruptions.

### Example

```
P1: arrival=0, CPU: 4 ticks
P2: arrival=1, CPU: 3 ticks
P3: arrival=2, CPU: 1 tick

Gantt: | P1 P1 P1 P1 | P2 P2 P2 | P3 |
Tick:    0  1  2  3    4  5  6    7
```

| Process | Turnaround | Waiting |
|---------|:----------:|:-------:|
| P1 | 4 | 0 |
| P2 | 6 | 3 |
| P3 | 6 | 5 |

### Note: Convoy Effect

If a long process arrives before several short ones, the short ones wait a long time, even though the CPU could be serving them. This phenomenon is called the **Convoy Effect** and is one of the main drawbacks of FCFS. Try the `convoy_effect` preset to visualize it.

---

## SJF (Shortest Job First - Non-Preemptive)

**Type:** Non-preemptive

### How it works

When selecting the next process, SJF chooses the one with the **shortest remaining CPU burst** in the Ready queue. Once on the CPU, the process is not interrupted until its burst is complete.

SJF is optimal for minimizing average waiting time, but has a practical drawback: in real systems, future burst durations are unknown. In the simulator, you define bursts explicitly, so SJF can be applied perfectly.

### Parameters

No additional parameters.

---

## SRTF (Shortest Remaining Time First - Preemptive SJF)

**Type:** Preemptive

### How it works

Preemptive version of SJF. At each tick, the scheduler checks whether any process in the Ready queue has a **shorter** remaining burst than the currently running process. If so, a preemption occurs: the current process is returned to the Ready queue, and the new candidate takes the CPU.

### Example

```
P1: arrival=0, CPU: 8 ticks
P2: arrival=1, CPU: 4 ticks

Tick 0: P1 starts (remaining=8)
Tick 1: P2 arrives (remaining=4 < 7) → preemption!
Tick 5: P2 finishes → P1 resumes (remaining=7)
Tick 12: P1 finishes
```

---

## Round Robin (RR)

**Type:** Preemptive  
**Parameter:** `quantum` (time slice, default: 2)

### How it works

The Ready queue is treated as a circular queue. Each process receives at most `quantum` consecutive CPU ticks. If the process still has remaining burst at the end of the quantum, it goes back to the **end** of the Ready queue and waits its turn.

I/O bursts **do not** consume quantum, as the process voluntarily leaves the CPU when initiating I/O.

### Trade-off

The smaller the quantum, the fairer the time-sharing, but the higher the context switch overhead. The larger the quantum, the more RR behaves like FCFS.

---

## Priority Scheduling (Non-Preemptive and Preemptive)

**Type:** Non-preemptive or Preemptive (select in the panel)  
**Parameters:** Aging (optional) + aging interval

### How it works

Each process has a priority from `1` (highest) to `10` (lowest). The scheduler always selects the highest-priority process in the Ready queue.

- **Non-preemptive:** once on the CPU, the process completes its burst without interruption.
- **Preemptive:** if a higher-priority process arrives, the current one is immediately preempted.

### Starvation and Aging

The classic problem with Priority Scheduling is **starvation**: low-priority processes may *never* receive the CPU if high-priority processes keep arriving.

The solution is **aging**: every `agingInterval` ticks a process spends in the Ready queue, its priority is incremented by 1 (i.e., the numeric value decreases), down to a minimum of `1`. Over time, even low-priority processes reach the head of the queue.

Try the `starvation` and `aging_fix` presets to see this difference.

---

## HRRN (Highest Response Ratio Next)

**Type:** Non-preemptive

### How it works

HRRN tries to be fairer than SJF by taking the process's waiting time into account. At each selection, the **Response Ratio** of each process in the Ready queue is computed:

```
ratio = (waitingTime + burstTime) / burstTime
```

The process with the **highest ratio** is selected. This naturally increases the priority of processes that have been waiting a long time, preventing starvation.

| Situation | Effect on ratio |
|-----------|----------------|
| Process with short burst | high ratio from the start |
| Process that has been waiting a long time | ratio grows over time |
| Process with long burst + little wait | low ratio |

---

## Multilevel Queue

**Type:** Preemptive
**Parameters:** number of queues, quantum per queue

### How it works

Processes are distributed across multiple queues with different priorities. Each queue has its own Round Robin quantum. Higher-priority queues are always served first. A lower-priority queue only receives CPU if all queues above it are empty.

This allows different classes of processes to be treated distinctly: for example, interactive processes in high-priority queues (small quantum) and batch processes in low-priority queues (larger quantum).

---

## MLFQ (Multilevel Feedback Queue)

**Type:** Preemptive
**Parameters:** number of queues, quantum per queue (default: [2, 4, 8]), boost interval

### How it works

MLFQ is an extension of the Multilevel Queue that allows **processes to move between queues** based on their observed runtime behavior — eliminating the need to know burst durations in advance.

#### Movement rules

| Event | Action |
|-------|--------|
| Newly arrived process | Enters **queue 0** (highest priority) |
| Process exhausts the quantum of its current queue | **Demoted** to the next queue (lower priority) |
| Process returns from I/O | Stays in the **same queue** (cooperative behavior is rewarded) |
| Boost tick (configurable interval) | **All** processes are moved to queue 0 |

#### Why is MLFQ efficient?

- Interactive processes (I/O Bound) naturally stay in high-priority queues because they leave the CPU before exhausting the quantum.
- Batch processes (CPU Bound) progressively migrate to lower-priority queues where they receive larger quantums.
- The periodic boost prevents starvation: even processes that fell to lower queues eventually return to the top.

#### Example with 3 queues (quantums: 2, 4, 8)

```
Process A (CPU Bound, burst=12):
  Queue 0 → uses 2 ticks, demoted → Queue 1
  Queue 1 → uses 4 ticks, demoted → Queue 2
  Queue 2 → uses remaining 6 ticks (quantum=8, not exhausted)

Process B (I/O Bound, burst=1 CPU + I/O + burst=1 CPU):
  Queue 0 → uses 1 tick → goes to I/O → returns to Queue 0
  → always stays in the highest-priority queue
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Number of queues | 3 | Number of priority queues |
| Quantum per queue | [2, 4, 8] | Time slice for each queue |
| Boost interval | 20 ticks | Every N ticks, all processes move up to queue 0 |

---

## Thread Models

PSS supports **thread** simulation within processes, implementing the three classical models described in Operating Systems textbooks.

### General Concepts

- A process can have **N user threads**, each with its own burst sequence (CPU and I/O).
- The scheduling policy among threads within the same process is configurable: **FCFS**, **Round Robin**, or **Priority**.
- The thread model determines how user threads map to kernel threads.

### MANY_TO_ONE (N:1)

**N user threads → 1 kernel thread**

- Only one thread can use the CPU at a time within the process.
- If any thread initiates I/O, **the entire process blocks** (the kernel thread is stuck).
- No real parallelism; very simple to implement.
- Simulated by the `many_to_one` presets.

### ONE_TO_ONE (1:1)

**Each user thread → 1 dedicated kernel thread**

- Threads block **independently**: if Thread A does I/O, Threads B and C remain in the Ready queue.
- The process only terminates when **all** threads have terminated.
- The process blocks only when all threads are simultaneously in I/O.
- Simulated by the `one_to_one` presets.

### MANY_TO_MANY (N:M)

**N user threads → M kernel threads (M ≤ N)**

- The number of kernel threads (`kernelThreadCount`) is configurable.
- If all M kernel slots are occupied, additional user threads wait in the **kernel wait queue** (`KernelWait`).
- Combines flexibility with resource control: more active threads than N:1 but less overhead than 1:1.
- Simulated by the `many_to_many` presets.

### Intra-Process Policy

Defines how the scheduler selects the next thread when multiple threads are Ready within the same process:

| Policy | Behavior |
|--------|----------|
| **FCFS** | The oldest thread in the Ready queue is selected |
| **Round Robin (RR)** | Each thread receives `threadQuantum` ticks; when exhausted, it goes to the end of the queue |
| **Priority** | The highest-priority thread is selected; immediate preemption if a higher-priority thread becomes ready |

### Gantt Chart with Threads

When a process has threads, the Gantt chart displays **sub-rows** below the process row, one per thread, with colors derived from the process color (40° hue shift per thread). The state of each thread (New, Ready, Running, Waiting, Terminated) is colored using the same CSS variables as process states.

---

## References

- Silberschatz, A., Galvin, P. B., & Gagne, G., *Operating System Concepts*, 10th edition.
- Tanenbaum, A. S., *Modern Operating Systems*, 4th edition.
