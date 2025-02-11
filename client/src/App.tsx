import Slideshow from '@/components/slideshow/slideshow';
import useStore from '@/store';


/**
 * Root application component that renders the main slideshow
 * @component
 * @returns {JSX.Element} Root application wrapper with slideshow component
 */
const App = () => {
  const isConnected = useStore((state) => state.isWebsocketConnected);


  return (
    <div className="App">
      <Slideshow />
    </div>
  );
};

export default App;