import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import GanttCell from "../GanttCell";
import type { Process, SimTick } from "@core/types";

describe("GanttCell", () => {
  const mockProcess: Process = {
    id: "p1",
    name: "P1",
    arrivalTime: 0,
    priority: 5,
    color: "#ff0000",
    bursts: [{ type: "cpu", duration: 5 }],
  };

  const mockTick: SimTick = {
    tick: 1,
    cpuProcess: "p1",
    ioProcesses: [],
    readyQueue: [],
    states: { p1: "Running" },
    contextSwitching: false,
  };

  const noop = () => {};

  it("renders with the correct background color for Running state", () => {
    const { container } = render(
      <GanttCell
        tick={mockTick}
        process={mockProcess}
        state="Running"
        isCtxSwitch={false}
        onMouseEnter={noop}
        onMouseLeave={noop}
      />
    );
    const cell = container.firstChild as HTMLElement;
    expect(cell.className).toContain("bg-[var(--color-state-running)]");
  });

  it("renders with the context switch color when isCtxSwitch is true", () => {
    const { container } = render(
      <GanttCell
        tick={mockTick}
        process={mockProcess}
        state="Running"
        isCtxSwitch={true}
        onMouseEnter={noop}
        onMouseLeave={noop}
      />
    );
    const cell = container.firstChild as HTMLElement;
    expect(cell.className).toContain("bg-[var(--color-state-ctx)]");
  });

  it("calls onMouseEnter with correct arguments", () => {
    const onMouseEnter = vi.fn();
    const { container } = render(
      <GanttCell
        tick={mockTick}
        process={mockProcess}
        state="Running"
        isCtxSwitch={false}
        onMouseEnter={onMouseEnter}
        onMouseLeave={noop}
      />
    );
    const cell = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(cell);
    expect(onMouseEnter).toHaveBeenCalledWith(
      expect.anything(),
      mockTick,
      mockProcess,
      "Running",
      false
    );
  });
});
