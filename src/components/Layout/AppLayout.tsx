import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import MainArea from './MainArea';

const AppLayout = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainArea />
      </div>
    </div>
  );
};

export default AppLayout;
