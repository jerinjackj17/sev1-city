import { CityCanvas } from './game/CityScene';
import { Hud } from './ui/Hud';
import { Commander } from './ui/Commander';
import { StartScreen, EndScreen } from './ui/Overlays';

function App() {
  return (
    <div className="relative h-full w-full">
      <CityCanvas />
      <Hud />
      <Commander />
      <StartScreen />
      <EndScreen />
    </div>
  );
}

export default App;
