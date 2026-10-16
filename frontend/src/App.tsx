import { CityCanvas } from './game/CityScene';
import { Hud } from './ui/Hud';

function App() {
  return (
    <div className="relative h-full w-full">
      <CityCanvas />
      <Hud />
    </div>
  );
}

export default App;
