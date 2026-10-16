import { CityCanvas } from './game/CityScene';
import { Hud } from './ui/Hud';
import { Commander } from './ui/Commander';

function App() {
  return (
    <div className="relative h-full w-full">
      <CityCanvas />
      <Hud />
      <Commander />
    </div>
  );
}

export default App;
