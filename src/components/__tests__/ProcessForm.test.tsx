import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProcessForm from '../ProcessPanel/ProcessForm';
import { useProcessStore } from '../../store/processStore';

// Reset Zustand processStore between tests
beforeEach(() => {
  useProcessStore.setState({ processes: [], config: useProcessStore.getState().config });
  vi.clearAllMocks();
});

describe('ProcessForm', () => {
  it('renders the "New Process" form with default fields', () => {
    render(<ProcessForm onClose={() => {}} />);
    expect(screen.getByTestId('process-form')).toBeInTheDocument();
    expect(screen.getByText('New Process')).toBeInTheDocument();
    expect(screen.getByLabelText('Process name')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrival time')).toBeInTheDocument();
    expect(screen.getByLabelText('Process priority')).toBeInTheDocument();
  });

  it('shows "Edit Process" title when editingProcess is provided', () => {
    const proc = {
      id: 'p1', name: 'P1', arrivalTime: 0, priority: 5, color: '#fff',
      bursts: [{ type: 'cpu' as const, duration: 4 }],
    };
    render(<ProcessForm editingProcess={proc} onClose={() => {}} />);
    expect(screen.getByText('Edit Process')).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    render(<ProcessForm onClose={() => {}} />);
    const nameInput = screen.getByLabelText('Process name');
    await user.clear(nameInput);
    const submitBtn = screen.getByRole('button', { name: /Create/i });
    await user.click(submitBtn);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
  });

  it('shows validation error when arrival time is negative', async () => {
    const user = userEvent.setup();
    render(<ProcessForm onClose={() => {}} />);
    const nameInput = screen.getByLabelText('Process name');
    await user.type(nameInput, 'P1');
    const arrivalInput = screen.getByLabelText('Arrival time');
    // fireEvent.change used to reliably set a negative number bypassing HTML min attribute
    fireEvent.change(arrivalInput, { target: { value: '-1' } });
    const submitBtn = screen.getByRole('button', { name: /Create/i });
    await user.click(submitBtn);
    expect(screen.getByText(/Arrival Time must be ≥ 0/i)).toBeInTheDocument();
  });

  it('shows validation error for name longer than 8 chars', async () => {
    const user = userEvent.setup();
    render(<ProcessForm onClose={() => {}} />);
    const nameInput = screen.getByLabelText('Process name');
    // Bypass the HTML maxLength attribute via fireEvent to test the JS validation
    fireEvent.change(nameInput, { target: { value: 'ProcessXXLong' } });
    await user.click(screen.getByRole('button', { name: /Create/i }));
    expect(screen.getByText(/Name must be at most 8 characters/i)).toBeInTheDocument();
  });

  it('adds a new burst with alternating type when clicking + button', async () => {
    const user = userEvent.setup();
    render(<ProcessForm onClose={() => {}} />);
    const addBurstBtn = screen.getByLabelText('Add burst');
    await user.click(addBurstBtn);
    // After one CPU burst at start, clicking + adds IO burst
    // getAllByText with exact matches for the type labels
    const cpuLabels = screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent?.trim().toUpperCase() === 'CPU');
    const ioLabels = screen.getAllByText((_, el) => el?.tagName === 'SPAN' && el.textContent?.trim().toUpperCase() === 'IO');
    expect(cpuLabels.length).toBeGreaterThanOrEqual(1);
    expect(ioLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose after successful form submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProcessForm onClose={onClose} />);
    const nameInput = screen.getByLabelText('Process name');
    await user.type(nameInput, 'P1');
    const submitBtn = screen.getByRole('button', { name: /Create/i });
    await user.click(submitBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('adds the process to the store after successful submission', async () => {
    const user = userEvent.setup();
    render(<ProcessForm onClose={() => {}} />);
    const nameInput = screen.getByLabelText('Process name');
    await user.type(nameInput, 'Test1');
    await user.click(screen.getByRole('button', { name: /Create/i }));
    const processes = useProcessStore.getState().processes;
    expect(processes).toHaveLength(1);
    expect(processes[0]?.name).toBe('Test1');
  });
});
