import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import { updateApiKeys, restoreVerificationData } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { AIServiceProvider } from './src/providers/AIServiceProvider';
import { ThemeProvider } from './src/theme';
import secureStorage from './src/services/secureStorage';
import VerificationPersistenceService from './src/services/VerificationPersistenceService';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize app on startup
    const initializeApp = async () => {
      try {
        // Load stored API keys
        const storedKeys = await secureStorage.getApiKeys();
        if (storedKeys) {
          dispatch(updateApiKeys(storedKeys));
          console.log('Loaded API keys from secure storage:', Object.keys(storedKeys));
        } else {
          console.log('No stored API keys found');
        }

        // Load verification data
        const verificationData = await VerificationPersistenceService.loadVerificationData();
        if (verificationData) {
          // Update Redux store with persisted verification data
          dispatch(restoreVerificationData(verificationData));
          console.log('Loaded verification data:', verificationData.verifiedProviders);
        } else {
          console.log('No verification data found');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AIServiceProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AIServiceProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
