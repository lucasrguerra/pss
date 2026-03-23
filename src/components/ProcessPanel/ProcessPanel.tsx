import { useState } from 'react';
import { ListTree } from 'lucide-react';
import type { Process } from '@core/types';
import ProcessList from './ProcessList';
import ProcessForm from './ProcessForm';

const ProcessPanel = () => {
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleEditProcess = (process: Process) => {
    setEditingProcess(process);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingProcess(null);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingProcess(null);
  };

  return (
    <section aria-label="Processes Panel">
      <div className="flex items-center gap-2 mb-3 text-slate-300">
        <ListTree size={18} className="text-blue-400" />
        <h2 className="font-semibold uppercase text-xs tracking-wider">Processes</h2>
      </div>

      {showForm ? (
        <ProcessForm editingProcess={editingProcess} onClose={handleClose} />
      ) : (
        <ProcessList onEditProcess={handleEditProcess} onAddNew={handleAddNew} />
      )}
    </section>
  );
};

export default ProcessPanel;
