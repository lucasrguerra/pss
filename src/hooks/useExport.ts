import type { ProcessMetrics, ThreadMetrics, Process } from "@core/types";

interface ProcessMap {
  [id: string]: Process;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport() {
  const exportCSV = (
    metrics: ProcessMetrics[],
    processMap: ProcessMap,
    threadMetrics?: ThreadMetrics[],
  ) => {
    // ── Seção de processos ─────────────────────────────────────────────────
    const processHeaders = [
      "PID",
      "Process",
      "Priority",
      "Arrival",
      "Start",
      "Finish",
      "Response",
      "Turnaround",
      "Waiting",
      "CPU Time",
      "I/O Time",
      "CPU%",
      "Bound",
    ];

    const processRows = metrics.map((m) => {
      const proc = processMap[m.processId];
      const pid = proc?.pid ?? "";
      const name = proc?.name ?? m.processId;
      const priority = proc?.priority ?? "";
      return [
        pid,
        name,
        priority,
        m.arrivalTime,
        m.startTick,
        m.finishTick,
        m.responseTime,
        m.turnaroundTime,
        m.waitingTime,
        m.cpuTime,
        m.ioTime,
        m.cpuUtilization.toFixed(1),
        m.boundType,
      ].join(",");
    });

    const sections: string[] = [
      "# Processes",
      processHeaders.join(","),
      ...processRows,
    ];

    // ── Seção de threads (opcional) ────────────────────────────────────────
    if (threadMetrics && threadMetrics.length > 0) {
      const threadHeaders = [
        "Thread",
        "Process",
        "Arrival",
        "Start",
        "Finish",
        "Response",
        "Turnaround",
        "Waiting",
        "CPU Time",
        "I/O Time",
      ];

      const threadRows = threadMetrics.map((t) => {
        const proc = processMap[t.processId];
        const procName = proc?.name ?? t.processId;
        return [
          t.threadName,
          procName,
          t.arrivalTime,
          t.startTick,
          t.finishTick,
          t.responseTime,
          t.turnaroundTime,
          t.waitingTime,
          t.cpuTime,
          t.ioTime,
        ].join(",");
      });

      sections.push("", "# Threads", threadHeaders.join(","), ...threadRows);
    }

    const csv = sections.join("\n");
    downloadBlob(csv, "pss-metrics.csv", "text/csv;charset=utf-8;");
  };

  return { exportCSV };
}
