import AppLayout from './components/Layout/AppLayout';
import { useSimulation } from './hooks/useSimulation';

function App() {
  useSimulation();
  return (
    <AppLayout />
  );
}

export default App;
