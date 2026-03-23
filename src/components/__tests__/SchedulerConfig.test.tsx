import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SchedulerConfig from '../SchedulerPanel/SchedulerConfig';
import { useProcessStore } from '../../store/processStore';
import type { SchedulingAlgorithm } from '@core/types';

const setAlgorithm = (algo: SchedulingAlgorithm) => {
  useProcessStore.setState(s => ({ config: { ...s.config, algorithm: algo } }));
};

beforeEach(() => {
  useProcessStore.setState(s => ({
    config: {
      ...s.config,
      algorithm: 'FCFS',
      quantum: 2,
      contextSwitchTime: 0,
      isPreemptive: false,
      agingEnabled: false,
      agingInterval: 5,
    },
  }));
});

describe('SchedulerConfig', () => {
  it('always shows Context Switch field regardless of algorithm', () => {
    render(<SchedulerConfig />);
    expect(screen.getByLabelText('Context switch time')).toBeInTheDocument();
  });

  it('always shows read-only preemptive badge', () => {
    render(<SchedulerConfig />);
    expect(screen.getByTestId('preemptive-badge')).toBeInTheDocument();
  });

  it('badge shows "Non-preemptive" for FCFS', () => {
    render(<SchedulerConfig />);
    expect(screen.getByTestId('preemptive-badge')).toHaveTextContent('Non-preemptive');
  });

  it('badge shows "Preemptive" for SJF_P (SRTF)', () => {
    setAlgorithm('SJF_P');
    render(<SchedulerConfig />);
    expect(screen.getByTestId('preemptive-badge')).toHaveTextContent('Preemptive');
  });

  it('badge shows "Non-preemptive" for SJF_NP (preemptive toggle no longer exists)', () => {
    setAlgorithm('SJF_NP');
    render(<SchedulerConfig />);
    expect(screen.getByTestId('preemptive-badge')).toHaveTextContent('Non-preemptive');
    // Confirm the old interactive preemptive switch is gone
    expect(screen.queryByRole('switch', { name: /Preemptive/i })).not.toBeInTheDocument();
  });

  it('does NOT show Quantum field for FCFS', () => {
    render(<SchedulerConfig />);
    expect(screen.queryByTestId('quantum-field')).not.toBeInTheDocument();
  });

  it('shows Quantum field when algorithm is RR', () => {
    setAlgorithm('RR');
    render(<SchedulerConfig />);
    expect(screen.getByTestId('quantum-field')).toBeInTheDocument();
    expect(screen.getByLabelText('Round Robin quantum')).toBeInTheDocument();
  });

  it('shows MLQ queue config panel when algorithm is MULTILEVEL', () => {
    setAlgorithm('MULTILEVEL');
    render(<SchedulerConfig />);
    expect(screen.getByTestId('mlq-queues-config')).toBeInTheDocument();
  });

  it('does NOT show Quantum field for SJF_NP', () => {
    setAlgorithm('SJF_NP');
    render(<SchedulerConfig />);
    expect(screen.queryByTestId('quantum-field')).not.toBeInTheDocument();
  });

  it('shows Aging toggle for PRIORITY_NP', () => {
    setAlgorithm('PRIORITY_NP');
    render(<SchedulerConfig />);
    expect(screen.getByRole('switch', { name: /Aging/i })).toBeInTheDocument();
  });

  it('shows Aging toggle for PRIORITY_P', () => {
    setAlgorithm('PRIORITY_P');
    render(<SchedulerConfig />);
    expect(screen.getByRole('switch', { name: /Aging/i })).toBeInTheDocument();
  });

  it('shows Aging interval field only when aging is enabled', async () => {
    const user = userEvent.setup();
    setAlgorithm('PRIORITY_NP');
    render(<SchedulerConfig />);
    expect(screen.queryByTestId('aging-interval-field')).not.toBeInTheDocument();
    const agingToggle = screen.getByRole('switch', { name: /Aging/i });
    await user.click(agingToggle);
    expect(screen.getByTestId('aging-interval-field')).toBeInTheDocument();
    expect(screen.getByLabelText('Aging interval')).toBeInTheDocument();
  });

  it('updates the store when Quantum field is changed', () => {
    setAlgorithm('RR');
    render(<SchedulerConfig />);
    const quantumInput = screen.getByLabelText('Round Robin quantum');
    fireEvent.change(quantumInput, { target: { value: '5' } });
    expect(useProcessStore.getState().config.quantum).toBe(5);
  });

  it('does NOT show Aging toggle for FCFS', () => {
    setAlgorithm('FCFS');
    render(<SchedulerConfig />);
    expect(screen.queryByRole('switch', { name: /Aging/i })).not.toBeInTheDocument();
  });

  it('does NOT show Aging toggle for HRRN', () => {
    setAlgorithm('HRRN');
    render(<SchedulerConfig />);
    expect(screen.queryByRole('switch', { name: /Aging/i })).not.toBeInTheDocument();
  });
});

