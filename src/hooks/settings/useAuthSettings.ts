import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { RootState } from '../../store';
import { logout } from '../../store';

interface UseAuthSettingsReturn {
  currentUser: unknown; // Type from your user state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signOutWithConfirmation: () => void;
  clearError: () => void;
}

export const useAuthSettings = (): UseAuthSettingsReturn => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign out user and clear all data
   */
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Dispatch logout action
      dispatch(logout());
      
      // Additional cleanup could be added here:
      // - Clear AsyncStorage
      // - Cancel ongoing requests
      // - Clear secure storage
      // - Reset navigation state
      
    } catch (err) {
      console.error('Failed to sign out:', err);
      setError('Failed to sign out');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  /**
   * Show confirmation dialog before signing out
   */
  const signOutWithConfirmation = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will clear all your local data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut().catch(err => {
              console.error('Sign out failed:', err);
              Alert.alert(
                'Error',
                'Failed to sign out. Please try again.',
                [{ text: 'OK' }]
              );
            });
          },
        },
      ]
    );
  }, [signOut]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const isAuthenticated = !!currentUser;

  return {
    currentUser,
    isAuthenticated,
    isLoading,
    error,
    signOut,
    signOutWithConfirmation,
    clearError,
  };
};