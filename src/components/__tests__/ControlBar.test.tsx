import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ControlBar from '../ControlBar/ControlBar';
import { useProcessStore } from '../../store/processStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useUiStore } from '../../store/uiStore';
import type { Process } from '@core/types';

const MOCK_PROCESS: Process = {
  id: 'p1',
  name: 'P1',
  arrivalTime: 0,
  priority: 5,
  color: '#60a5fa',
  bursts: [{ type: 'cpu', duration: 4 }],
};

beforeEach(() => {
  useProcessStore.setState({ processes: [], config: useProcessStore.getState().config });
  useSimulationStore.setState({ status: 'idle', ticks: [], engine: null, _processes: [], _config: null });
  useUiStore.setState({ speed: 1 });
});

describe('ControlBar', () => {
  it('renders the toolbar with all main controls', () => {
    render(<ControlBar />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('btn-play')).toBeInTheDocument();
    expect(screen.getByTestId('btn-step')).toBeInTheDocument();
    expect(screen.getByTestId('btn-reset')).toBeInTheDocument();
    expect(screen.getByTestId('tick-display')).toBeInTheDocument();
    expect(screen.getByTestId('speed-select')).toBeInTheDocument();
  });

  it('displays tick 0000 on initial render', () => {
    render(<ControlBar />);
    expect(screen.getByTestId('tick-display')).toHaveTextContent('0000');
  });

  it('shows "Ready" status when idle', () => {
    render(<ControlBar />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('Play button is disabled when no processes are loaded', () => {
    render(<ControlBar />);
    expect(screen.getByTestId('btn-play')).toBeDisabled();
  });

  it('Step button initialises simulation and advances tick', async () => {
    const user = userEvent.setup();
    useProcessStore.setState({ processes: [MOCK_PROCESS] });
    render(<ControlBar />);
    const stepBtn = screen.getByTestId('btn-step');
    await user.click(stepBtn);
    expect(screen.getByTestId('tick-display')).toHaveTextContent('0001');
  });

  it('Play button triggers init and sets status to running', async () => {
    const user = userEvent.setup();
    useProcessStore.setState({ processes: [MOCK_PROCESS] });
    render(<ControlBar />);
    await user.click(screen.getByTestId('btn-play'));
    expect(useSimulationStore.getState().status).toBe('running');
  });

  it('Pause button is shown (and plays) when simulation is running', async () => {
    const user = userEvent.setup();
    useProcessStore.setState({ processes: [MOCK_PROCESS] });
    render(<ControlBar />);
    await user.click(screen.getByTestId('btn-play'));
    expect(screen.getByTestId('btn-pause')).toBeInTheDocument();
    await user.click(screen.getByTestId('btn-pause'));
    expect(useSimulationStore.getState().status).toBe('paused');
  });

  it('changing speed updates uiStore', async () => {
    const user = userEvent.setup();
    render(<ControlBar />);
    const speedSelect = screen.getByTestId('speed-select');
    await user.selectOptions(speedSelect, '2');
    expect(useUiStore.getState().speed).toBe(2);
  });

  it('Reset is disabled when status is idle', () => {
    render(<ControlBar />);
    expect(screen.getByTestId('btn-reset')).toBeDisabled();
  });

  it('Reset becomes enabled after simulation starts and returns tick to 0', async () => {
    const user = userEvent.setup();
    useProcessStore.setState({ processes: [MOCK_PROCESS] });
    render(<ControlBar />);
    await user.click(screen.getByTestId('btn-step'));
    expect(screen.getByTestId('tick-display')).toHaveTextContent('0001');
    await user.click(screen.getByTestId('btn-reset'));
    expect(screen.getByTestId('tick-display')).toHaveTextContent('0000');
  });
});
