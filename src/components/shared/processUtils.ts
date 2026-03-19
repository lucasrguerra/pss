import type { BurstSegment } from '@core/types';

/**
 * Classifies a process as CPU Bound, I/O Bound, or Balanced
 * based on declared burst segments (used for preview in ProcessCard).
 */
export function classifyBound(bursts: BurstSegment[]): 'CPU Bound' | 'I/O Bound' | 'Balanced' {
  const cpuTotal = bursts.filter(b => b.type === 'cpu').reduce((a, b) => a + b.duration, 0);
  const ioTotal = bursts.filter(b => b.type === 'io').reduce((a, b) => a + b.duration, 0);
  const total = cpuTotal + ioTotal;
  if (total === 0) return 'Balanced';
  const cpuRatio = cpuTotal / total;
  const ioRatio = ioTotal / total;
  if (cpuRatio >= 0.65) return 'CPU Bound';
  if (ioRatio >= 0.65) return 'I/O Bound';
  return 'Balanced';
}

/** Generate a short unique id */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/** Random vivid HEX color */
const PALETTE = [
  '#60a5fa','#34d399','#f472b6','#fb923c','#a78bfa',
  '#38bdf8','#facc15','#4ade80','#f87171','#c084fc',
];
let _paletteIndex = 0;
export function nextColor(): string {
  return PALETTE[_paletteIndex++ % PALETTE.length]!;
}
