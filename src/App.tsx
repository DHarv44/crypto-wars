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
  const { hasCompletedOnboarding, completeOnboarding, loadGame } = useStore();
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
