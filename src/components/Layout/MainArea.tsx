import ControlBar from '../ControlBar/ControlBar';
import GanttChart from '../GanttChart/GanttChart';
import MetricsPanel from '../MetricsPanel/MetricsPanel';

const MainArea = () => {
  return (
    <main className="flex-1 flex flex-col bg-slate-900 overflow-y-auto relative">
      <ControlBar />
      <GanttChart />
      <MetricsPanel />
    </main>
  );
};

export default MainArea;
