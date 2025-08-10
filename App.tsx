import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store';
import { updateApiKeys } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { AIServiceProvider } from './src/providers/AIServiceProvider';
import { ThemeProvider } from './src/theme';
import secureStorage from './src/services/secureStorage';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load stored API keys on app startup
    const loadApiKeys = async () => {
      try {
        const storedKeys = await secureStorage.getApiKeys();
        if (storedKeys) {
          dispatch(updateApiKeys(storedKeys));
          console.log('Loaded API keys from secure storage:', Object.keys(storedKeys));
        } else {
          console.log('No stored API keys found');
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };

    loadApiKeys();
  }, [dispatch]);

  return (
    <ThemeProvider>
      <AIServiceProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AIServiceProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
