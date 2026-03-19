import ProcessPanel from '../ProcessPanel/ProcessPanel';
import SchedulerPanel from '../SchedulerPanel/SchedulerPanel';

const Sidebar = () => {
  return (
    <aside className="w-80 min-w-[20rem] h-full bg-slate-800 border-r border-slate-700 flex flex-col shadow-xl z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent truncate">
          Process Simulator
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 scrollbar-hide">
        <ProcessPanel />
        <div className="border-t border-slate-700 pt-4">
          <SchedulerPanel />
        </div>
      </div>

      <div className="h-12 border-t border-slate-700 flex items-center justify-center text-xs text-slate-500">
        PSS v1.0
      </div>
    </aside>
  );
};

export default Sidebar;
