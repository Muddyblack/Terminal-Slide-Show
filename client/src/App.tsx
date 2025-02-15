import { ServerStatusProvider } from '@/contexts/ServerStatusContext';
import Slideshow from '@/components/slideshow/slideshow';

/**
 * Root application component that renders the main slideshow
 * @component
 * @returns {JSX.Element} Root application wrapper with slideshow component
 */
const App = () => {
  return (
    <ServerStatusProvider>
      <Slideshow />
    </ServerStatusProvider>
  );
};

export default App;