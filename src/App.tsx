import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import AppShell from './components/AppShell';
import OnboardingFlow from './features/onboarding/OnboardingFlow';
import { useStore } from './stores/rootStore';
import { useEffect, useState } from 'react';
import { initCache } from './data/storageCache';
import { hasSavedGame } from './utils/storage';
import { Loader, Center } from '@mantine/core';

function App() {
  const { hasCompletedOnboarding, completeOnboarding } = useStore();
  const [cacheReady, setCacheReady] = useState(false);

  // Initialize storage cache on mount
  useEffect(() => {
    const initialize = async () => {
      await initCache();
      setCacheReady(true);

      // If there's an active session game, skip onboarding
      if (hasSavedGame() && !hasCompletedOnboarding) {
        completeOnboarding();
      }
    };

    initialize();
  }, []);

  // Show loading until cache is ready
  if (!cacheReady) {
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
