import { Settings } from 'lucide-react';
import AlgorithmSelector from './AlgorithmSelector';
import SchedulerConfig from './SchedulerConfig';

const SchedulerPanel = () => {
  return (
    <section aria-label="Painel do Escalonador" className="space-y-3">
      <div className="flex items-center gap-2 text-slate-300">
        <Settings size={18} className="text-emerald-400" />
        <h2 className="font-semibold uppercase text-xs tracking-wider">Escalonador</h2>
      </div>

      <AlgorithmSelector />
      <SchedulerConfig />
    </section>
  );
};

export default SchedulerPanel;
