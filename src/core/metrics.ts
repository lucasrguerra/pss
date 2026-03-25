import type {
  GlobalMetrics,
  Process,
  ProcessMetrics,
  ProcessRuntime,
  Thread,
  ThreadMetrics,
  ThreadRuntime,
} from "./types";

// ============================================================
// Per-process metrics
// ============================================================

export function computeProcessMetrics(rt: ProcessRuntime): ProcessMetrics {
  if (rt.startTick === null || rt.finishTick === null) {
    throw new Error(
      `Cannot compute metrics for process ${rt.processId}: not yet terminated`,
    );
  }

  const turnaroundTime = rt.finishTick - rt.arrivalTick;
  const waitingTime = turnaroundTime - rt.cpuTime - rt.ioTime;
  const responseTime = rt.startTick - rt.arrivalTick;
  const cpuUtilization =
    turnaroundTime > 0 ? (rt.cpuTime / turnaroundTime) * 100 : 0;

  const total = rt.cpuTime + rt.ioTime;
  const cpuRatio = total > 0 ? rt.cpuTime / total : 1;
  const ioRatio = total > 0 ? rt.ioTime / total : 0;

  let boundType: "CPU Bound" | "I/O Bound" | "Balanced";
  if (cpuRatio >= 0.65) {
    boundType = "CPU Bound";
  } else if (ioRatio >= 0.65) {
    boundType = "I/O Bound";
  } else {
    boundType = "Balanced";
  }

  return {
    processId: rt.processId,
    arrivalTime: rt.arrivalTick,
    startTick: rt.startTick,
    finishTick: rt.finishTick,
    responseTime,
    turnaroundTime,
    waitingTime,
    cpuTime: rt.cpuTime,
    ioTime: rt.ioTime,
    cpuUtilization,
    boundType,
  };
}

// ============================================================
// Global metrics (across all completed processes)
// ============================================================

export function computeGlobalMetrics(
  metrics: ProcessMetrics[],
  totalTicks: number,
): GlobalMetrics {
  if (metrics.length === 0) {
    return {
      avgResponseTime: 0,
      avgTurnaroundTime: 0,
      avgWaitingTime: 0,
      cpuThroughput: 0,
      cpuUtilization: 0,
      totalSimulationTime: totalTicks,
    };
  }

  const mean = (values: number[]) =>
    values.reduce((a, b) => a + b, 0) / values.length;

  const totalCpuTime = metrics.reduce((s, m) => s + m.cpuTime, 0);

  return {
    avgResponseTime: mean(metrics.map((m) => m.responseTime)),
    avgTurnaroundTime: mean(metrics.map((m) => m.turnaroundTime)),
    avgWaitingTime: mean(metrics.map((m) => m.waitingTime)),
    cpuThroughput: metrics.length / totalTicks,
    cpuUtilization: totalTicks > 0 ? (totalCpuTime / totalTicks) * 100 : 0,
    totalSimulationTime: totalTicks,
  };
}

// ============================================================
// Thread metrics
// ============================================================

export function computeThreadMetrics(
  trt: ThreadRuntime,
  thread: Thread,
  process: Process,
): ThreadMetrics {
  if (trt.startTick === null || trt.finishTick === null) {
    throw new Error(
      `Cannot compute metrics for thread ${trt.threadId}: not yet terminated`,
    );
  }

  const turnaroundTime = trt.finishTick - trt.arrivalTick;
  const responseTime = trt.startTick - trt.arrivalTick;
  const waitingTime = turnaroundTime - trt.cpuTime - trt.ioTime;

  return {
    threadId: trt.threadId,
    processId: trt.processId,
    threadName: thread.name,
    processName: process.name,
    arrivalTime: trt.arrivalTick,
    startTick: trt.startTick,
    finishTick: trt.finishTick,
    responseTime,
    turnaroundTime,
    waitingTime: Math.max(0, waitingTime),
    cpuTime: trt.cpuTime,
    ioTime: trt.ioTime,
  };
}

// ============================================================
// Classify process by declared burst ratios (static, pre-simulation)
// Used in the process list preview badge.
// ============================================================

export function classifyBound(
  bursts: { type: "cpu" | "io"; duration: number }[],
): "CPU Bound" | "I/O Bound" | "Balanced" {
  let cpu = 0;
  let io = 0;
  for (const b of bursts) {
    if (b.type === "cpu") cpu += b.duration;
    else io += b.duration;
  }
  const total = cpu + io;
  if (total === 0) return "Balanced";
  const cpuRatio = cpu / total;
  const ioRatio = io / total;
  if (cpuRatio >= 0.65) return "CPU Bound";
  if (ioRatio >= 0.65) return "I/O Bound";
  return "Balanced";
}
