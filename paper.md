---
title: 'PSS: A Browser-Based Interactive Simulator for CPU Scheduling Algorithms'
tags:
  - operating systems
  - CPU scheduling
  - process scheduling
  - computer science education
  - simulation
  - visualization
  - TypeScript
  - React
authors:
  - name: Lucas Rayan Guerra
    orcid: 0009-0002-3170-4126
    affiliation: 1
    email: lucas.guerra@ufrpe.br
affiliations:
  - name: Universidade Federal Rural de Pernambuco (UFRPE), Brazil
    index: 1
date: 23 March 2026
bibliography: references.bib
---

# Summary

The **Process Scheduler Simulator (PSS)** is an open-source, browser-based interactive tool designed to help students, instructors, and practitioners understand and compare classical CPU scheduling algorithms from the field of Operating Systems (OS). PSS runs entirely client-side — no server, no installation — making it instantly accessible via any modern web browser at [https://pss.lucasrguerra.dev.br](https://pss.lucasrguerra.dev.br).

Users define a set of processes, each with an arbitrary sequence of alternating CPU and I/O bursts, and select one of eight scheduling algorithms. The simulator then executes the schedule tick by tick, rendering a live Gantt chart and computing a comprehensive set of performance metrics for each process and for the simulation as a whole. PSS supports First Come First Served (FCFS), Shortest Job First (SJF), Shortest Remaining Time First (SRTF), Round Robin (RR), non-preemptive and preemptive Priority Scheduling (with optional aging), Highest Response Ratio Next (HRRN), and Multilevel Queue scheduling.

# Statement of Need

CPU scheduling is a foundational topic in Operating Systems curricula worldwide. However, the subject is widely known to be challenging for students to grasp through lecture and textbook alone: algorithms such as SRTF, aging-based Priority Scheduling, and Multilevel Queue involve complex, time-dependent state transitions that are difficult to internalize from a static Gantt diagram drawn on a blackboard.

Existing textbooks [@silberschatz2018; @tanenbaum2015] include static examples and exercises, but provide no means for students to interactively explore edge cases, compare algorithms, or observe emergent phenomena such as the convoy effect or starvation in real time. Laboratory environments that require OS installation or command-line configuration create friction that discourages experimentation, particularly for students in resource-constrained settings.

PSS addresses this gap by providing a zero-installation, zero-configuration simulation environment that runs directly in the browser. The target audience includes:

- **Students** in introductory and intermediate Operating Systems courses who want to visualize abstract algorithm behavior;
- **Instructors** seeking a live, configurable demonstration tool for classroom or remote teaching;
- **Researchers and practitioners** who need a quick, reproducible environment to illustrate scheduling concepts.

The configurable parameters — quantum for Round Robin, aging interval and threshold for Priority Scheduling, and per-queue quantum for Multilevel — enable learners to observe how parameter choices affect fairness, throughput, and starvation, all within a single interactive session.

# State of the Field

Several browser-based and desktop scheduling simulators exist. OS-sim [@ossim] offers a graphical simulation of a full operating system, including scheduling, but targets upper-division students and requires local installation. The CPU Scheduling Simulator by Mitchell [@mitchelljava] is a Java desktop application that covers a subset of algorithms without I/O burst modeling. Web-based tools such as Process Scheduling Simulator by Nikhil Anand cover FCFS, SJF, and RR, but do not support aging, HRRN, or Multilevel Queue, and lack composable I/O burst sequences.

PSS distinguishes itself in three key ways. First, it models **full CPU-I/O burst sequences** for each process, rather than a single CPU burst, enabling simulation of realistic workloads and the CPU Bound vs. I/O Bound classification. Second, it implements a broader set of algorithms — including HRRN and Multilevel Queue with per-queue quantum — than most comparable tools. Third, the entire application is deployed as a **static single-page application** with no backend dependency, enabling one-click access and offline use via Docker, which lowers the barrier for classroom adoption.

# Software Design

PSS is built with React 18 [@react] and TypeScript 5, bundled with Vite 6, and styled with Tailwind CSS 4. The architecture enforces a strict separation between the **simulation core** and the **presentation layer**.

The `src/core/` directory contains pure TypeScript modules with no React dependency: `engine.ts` orchestrates the simulation loop on a tick-by-tick basis, `algorithms/` implements each scheduling algorithm as a subclass of an abstract `BaseScheduler`, and `metrics.ts` computes all per-process and global metrics from the recorded state history. This separation ensures that the core logic is independently testable and reusable outside the browser context.

The React layer delegates all state mutations to a Zustand 5 store, which acts as a single source of truth for the process list, scheduler configuration, simulation state, and computed metrics. Components are purely presentational: they read from the store and dispatch actions, never computing scheduling logic directly.

This architecture was chosen to maximize testability: the `src/core/` package is covered by Vitest unit tests that verify algorithm correctness against hand-crafted Gantt chart expectations and metric values. The current test suite covers all eight scheduling algorithms, the simulation engine, and the metrics module, reaching 100% statement coverage of the core layer.

The Gantt chart is rendered as a custom React component with SVG-free CSS layout, enabling smooth 60 fps animation at playback speeds ranging from 0.25× to 4×. Charts in the metrics panel (radar chart for comparative process profiles, stacked bar chart for time breakdown) are rendered with Recharts [@recharts].

# Research Impact Statement

PSS was developed as part of the Computer Science undergraduate program at the Universidade Federal Rural de Pernambuco (UFRPE, Brazil). The tool has been used in the Operating Systems course at UFRPE to supplement lectures on CPU scheduling, providing students with a hands-on environment to experiment with algorithm parameters and verify their understanding of course material.

The availability of PSS as a fully open-source project under the MIT license, with Docker and `npm run dev` deployment paths, enables any institution to adopt or adapt the simulator without cost or proprietary dependency. The live deployment at [https://pss.lucasrguerra.dev.br](https://pss.lucasrguerra.dev.br) provides a stable public URL suitable for sharing in syllabi, assignments, and online course materials.

The built-in preset scenarios — including `convoy_effect`, `starvation`, and `aging_fix` — provide reproducible, named examples of classical OS phenomena that instructors can reference directly in lectures, assignments, or exam questions, facilitating standardized discussion of algorithm trade-offs.

# AI Usage Disclosure

The author used AI-assisted coding tools (GitHub Copilot and Google Gemini) during development for code completion, documentation drafting, and test generation. All AI-generated content was reviewed, tested, and verified by the author before inclusion in the repository. The core scheduling algorithms were validated against hand-computed examples from [@silberschatz2018] and [@tanenbaum2015].

# Acknowledgements

The author thanks the professors and students of the Operating Systems course at UFRPE whose feedback shaped the features and usability of PSS.

# References
