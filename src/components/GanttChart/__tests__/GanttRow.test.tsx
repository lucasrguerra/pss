import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import GanttRow from "../GanttRow";
import type { Process, SimTick } from "@core/types";

describe("GanttRow – isCtxSwitch propagation", () => {
  const p1: Process = {
    id: "p1", name: "P1", arrivalTime: 0, priority: 5,
    color: "#4FC3F7", bursts: [{ type: "cpu", duration: 2 }],
  };
  const p2: Process = {
    id: "p2", name: "P2", arrivalTime: 0, priority: 5,
    color: "#FF7043", bursts: [{ type: "cpu", duration: 2 }],
  };

  const ctxTick: SimTick = {
    tick: 2,
    cpuProcess: null,
    ioProcesses: [],
    readyQueue: ["p2"],
    states: { p1: "Ready", p2: "Ready" },
    contextSwitching: true,
    ctxSwitchForProcess: "p2",
  };

  const noop = vi.fn();

  it("renders the context-switch color on the incoming process (p2)", () => {
    const { container } = render(
      <GanttRow
        process={p2}
        ticks={[ctxTick]}
        onCellMouseEnter={noop}
        onCellMouseLeave={noop}
      />
    );
    // The outer div is the row; its first child is the GanttCell div
    const cell = container.firstChild?.firstChild as HTMLElement;
    expect(cell.className).toContain("bg-[var(--color-state-ctx)]");
  });

  it("does NOT render context-switch color on the outgoing process (p1)", () => {
    const { container } = render(
      <GanttRow
        process={p1}
        ticks={[ctxTick]}
        onCellMouseEnter={noop}
        onCellMouseLeave={noop}
      />
    );
    const cell = container.firstChild?.firstChild as HTMLElement;
    expect(cell.className).not.toContain("bg-[var(--color-state-ctx)]");
  });

  it("does not mark ctx-switch when contextSwitching is false", () => {
    const normalTick: SimTick = {
      tick: 0,
      cpuProcess: "p1",
      ioProcesses: [],
      readyQueue: [],
      states: { p1: "Running", p2: "Ready" },
      contextSwitching: false,
      ctxSwitchForProcess: null,
    };
    const { container } = render(
      <GanttRow
        process={p1}
        ticks={[normalTick]}
        onCellMouseEnter={noop}
        onCellMouseLeave={noop}
      />
    );
    const cell = container.firstChild?.firstChild as HTMLElement;
    expect(cell.className).not.toContain("bg-[var(--color-state-ctx)]");
    expect(cell.className).toContain("bg-[var(--color-state-running)]");
  });
});
