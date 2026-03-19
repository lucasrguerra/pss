import Sidebar from './Sidebar';
import MainArea from './MainArea';

const AppLayout = () => {
  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar />
      <MainArea />
    </div>
  );
};

export default AppLayout;
