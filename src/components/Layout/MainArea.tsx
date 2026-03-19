import ControlBar from '../ControlBar/ControlBar';

const MainArea = () => {
  return (
    <main className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden relative">
      <div className="flex-1 flex flex-col">
        <ControlBar />

        {/* Placeholder for GanttChart — Phase 4 */}
        <div className="border-b border-slate-800 h-80 flex items-center justify-center text-slate-600 bg-slate-900/50 text-sm">
          [ Gantt Chart — Fase 4 ]
        </div>

        {/* Placeholder for MetricsPanel — Phase 5 */}
        <div className="flex-1 flex items-center justify-center text-slate-600 bg-slate-950 p-6">
          <div className="w-full h-full border border-dashed border-slate-700 rounded-xl flex items-center justify-center text-sm">
            [ Metrics Panel — Fase 5 ]
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainArea;
