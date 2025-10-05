import { useStore } from '../../stores/rootStore';
import Screen0ColdOpen from './Screen0ColdOpen';
import ScreenProfileSelect from './ScreenProfileSelect';
import Screen1Handle from './Screen1Handle';
import Screen2Archetype from './Screen2Archetype';
import Screen3Vibe from './Screen3Vibe';

export default function OnboardingFlow() {
  const { currentScreen } = useStore();

  switch (currentScreen) {
    case 0:
      return <Screen0ColdOpen />;
    case 0.5:
      return <ScreenProfileSelect />;
    case 1:
      return <Screen1Handle />;
    case 2:
      return <Screen2Archetype />;
    case 3:
      return <Screen3Vibe />;
    default:
      return <Screen0ColdOpen />;
  }
}
