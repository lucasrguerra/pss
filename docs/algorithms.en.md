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

## FCFS — First Come, First Served

**Type:** Non-preemptive

### How it works

Perhaps the most intuitive algorithm: the process that arrived first is served first. The Ready queue is sorted by `arrivalTime`. Once a process occupies the CPU, it stays there until its current CPU burst is complete — no interruptions.

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

If a long process arrives before several short ones, the short ones wait a long time — even though the CPU could be serving them. This phenomenon is called the **Convoy Effect** and is one of the main drawbacks of FCFS. Try the `convoy_effect` preset to visualize it.

---

## SJF — Shortest Job First (Non-Preemptive)

**Type:** Non-preemptive

### How it works

When selecting the next process, SJF chooses the one with the **shortest remaining CPU burst** in the Ready queue. Once on the CPU, the process is not interrupted until its burst is complete.

SJF is optimal for minimizing average waiting time, but has a practical drawback: in real systems, future burst durations are unknown. In the simulator, you define bursts explicitly, so SJF can be applied perfectly.

### Parameters

No additional parameters.

---

## SRTF — Shortest Remaining Time First (Preemptive SJF)

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

I/O bursts **do not** consume quantum — the process voluntarily leaves the CPU when initiating I/O.

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

## HRRN — Highest Response Ratio Next

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

Processes are distributed across multiple queues with different priorities. Each queue has its own Round Robin quantum. Higher-priority queues are always served first — a lower-priority queue only receives CPU if all queues above it are empty.

This allows different classes of processes to be treated distinctly: for example, interactive processes in high-priority queues (small quantum) and batch processes in low-priority queues (larger quantum).

---

## References

- Silberschatz, A., Galvin, P. B., & Gagne, G. — *Operating System Concepts*, 10th edition
- Tanenbaum, A. S. — *Modern Operating Systems*, 4th edition
