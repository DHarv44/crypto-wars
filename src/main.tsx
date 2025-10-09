import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { mantineTheme } from './theme/mantineTheme';
import App from './App';
import { initDebugUtils } from './testing/debugUtils';

// Initialize debug utilities in dev mode
initDebugUtils();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
      <Notifications position="top-right" zIndex={2000} />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
