import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import AppShell from './components/AppShell';
import OnboardingFlow from './features/onboarding/OnboardingFlow';
import { useStore } from './stores/rootStore';
import { useEffect, useState } from 'react';
import { hasSavedGame } from './utils/persistence';
import { Loader, Center } from '@mantine/core';
import { initCache } from './data/storageCache';

function App() {
  const { hasCompletedOnboarding, completeOnboarding, loadGame, processTick, saveGame } = useStore();
  const [isReady, setIsReady] = useState(false);

  // Initialize app on mount
  useEffect(() => {
    const initialize = async () => {
      console.log('[App] initialize START');

      // Initialize cache first
      await initCache();

      // Check if there's a saved game
      const hasSaved = await hasSavedGame();
      console.log('[App] hasSavedGame:', hasSaved);

      if (hasSaved) {
        // Load existing game state
        await loadGame();

        // Mark onboarding as complete
        if (!hasCompletedOnboarding) {
          completeOnboarding();
        }
      }

      setIsReady(true);
      console.log('[App] initialize COMPLETE');
    };

    initialize();
  }, []);

  // Run processTick every second when game is active
  useEffect(() => {
    if (!isReady || !hasCompletedOnboarding) return;

    const interval = setInterval(() => {
      processTick();
    }, 1000); // Every 1 second = 1 in-game tick

    return () => clearInterval(interval);
  }, [isReady, hasCompletedOnboarding, processTick]);

  // Auto-save every 5 seconds (with dirty flag check)
  useEffect(() => {
    if (!isReady || !hasCompletedOnboarding) return;

    const interval = setInterval(async () => {
      await saveGame();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [isReady, hasCompletedOnboarding, saveGame]);

  // Show loading until ready
  if (!isReady) {
    return (
      <Center h="100vh">
        <Loader color="terminal.5" />
      </Center>
    );
  }

  // Show onboarding if not completed
  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />;
  }

  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
