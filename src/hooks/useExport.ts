import type { ProcessMetrics } from "@core/types";
import type { Process } from "@core/types";

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
  const exportCSV = (metrics: ProcessMetrics[], processMap: ProcessMap) => {
    const headers = [
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

    const rows = metrics.map((m) => {
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

    const csv = [headers.join(","), ...rows].join("\n");
    downloadBlob(csv, "pss-metrics.csv", "text/csv;charset=utf-8;");
  };

  return { exportCSV };
}
