import { useEffect } from 'react';

import Slideshow from '@/components/slideshow/slideshow';
import { wsService } from '@/services/websocket';
import useStore from '@/store';


/**
 * Root application component that renders the main slideshow
 * @component
 * @returns {JSX.Element} Root application wrapper with slideshow component
 */
const App = () => {
  const isConnected = useStore((state) => state.isWebsocketConnected);

  useEffect(() => {
    wsService.connect();
    return () => wsService.disconnect();
  }, []);

  return (
    <div className="App">
      <Slideshow />
    </div>
  );
};

export default App;