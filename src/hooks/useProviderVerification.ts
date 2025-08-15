import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
// Removed unused imports - actions are used in VerificationService
import VerificationService, { VerificationStatus, VerificationResult } from '../services/VerificationService';

export interface UseProviderVerificationReturn {
  verifiedProviders: string[];
  verificationTimestamps: Record<string, number>;
  verifyProvider: (providerId: string, result: VerificationResult) => void;
  removeVerification: (providerId: string) => void;
  clearAllVerifications: () => void;
  getVerificationStatus: (providerId: string, hasApiKey: boolean) => VerificationStatus;
  getVerificationMessage: (providerId: string, hasApiKey: boolean) => string | undefined;
  isVerificationFresh: (providerId: string) => boolean;
  isVerificationStale: (providerId: string) => boolean;
  getVerificationAge: (providerId: string) => 'fresh' | 'recent' | 'stale' | 'none';
  getVerifiedCount: () => number;
  getUnverifiedProviders: (providerIds: string[]) => string[];
  areAllProvidersVerified: (providerIds: string[]) => boolean;
  getVerificationSummary: (providerIds: string[]) => {
    total: number;
    verified: number;
    fresh: number;
    stale: number;
    percentage: number;
  };
}

export const useProviderVerification = (): UseProviderVerificationReturn => {
  const dispatch = useDispatch();
  const verifiedProviders = useSelector((state: RootState) => state.settings.verifiedProviders || []);
  const verificationTimestamps = useSelector((state: RootState) => state.settings.verificationTimestamps || {});

  /**
   * Verify a provider and update state
   */
  const verifyProvider = useCallback((providerId: string, result: VerificationResult) => {
    VerificationService.verifyProvider(providerId, dispatch, result);
  }, [dispatch]);

  /**
   * Remove verification for a provider
   */
  const removeVerification = useCallback((providerId: string) => {
    VerificationService.removeVerification(providerId, dispatch);
  }, [dispatch]);

  /**
   * Clear all verifications
   */
  const clearAllVerifications = useCallback(() => {
    VerificationService.clearAllVerifications(dispatch);
  }, [dispatch]);

  /**
   * Get verification status for a provider
   */
  const getVerificationStatus = useCallback((providerId: string, hasApiKey: boolean): VerificationStatus => {
    return VerificationService.getVerificationStatus(
      providerId,
      verifiedProviders,
      verificationTimestamps,
      hasApiKey
    );
  }, [verifiedProviders, verificationTimestamps]);

  /**
   * Get verification message for display
   */
  const getVerificationMessage = useCallback((providerId: string, hasApiKey: boolean): string | undefined => {
    return VerificationService.formatVerificationMessage(
      providerId,
      verifiedProviders,
      verificationTimestamps,
      hasApiKey
    );
  }, [verifiedProviders, verificationTimestamps]);

  /**
   * Check if verification is fresh (within last hour)
   */
  const isVerificationFresh = useCallback((providerId: string): boolean => {
    return VerificationService.isVerificationFresh(providerId, verificationTimestamps);
  }, [verificationTimestamps]);

  /**
   * Check if verification is stale (older than 24 hours)
   */
  const isVerificationStale = useCallback((providerId: string): boolean => {
    return VerificationService.isVerificationStale(providerId, verificationTimestamps);
  }, [verificationTimestamps]);

  /**
   * Get verification age status
   */
  const getVerificationAge = useCallback((providerId: string): 'fresh' | 'recent' | 'stale' | 'none' => {
    return VerificationService.getVerificationAge(providerId, verificationTimestamps);
  }, [verificationTimestamps]);

  /**
   * Get count of verified providers
   */
  const getVerifiedCount = useCallback((): number => {
    return VerificationService.getVerifiedCount(verifiedProviders);
  }, [verifiedProviders]);

  /**
   * Get unverified providers from a list
   */
  const getUnverifiedProviders = useCallback((providerIds: string[]): string[] => {
    return VerificationService.getUnverifiedProviders(providerIds, verifiedProviders);
  }, [verifiedProviders]);

  /**
   * Check if all providers in a list are verified
   */
  const areAllProvidersVerified = useCallback((providerIds: string[]): boolean => {
    return VerificationService.areAllProvidersVerified(providerIds, verifiedProviders);
  }, [verifiedProviders]);

  /**
   * Get verification summary for providers
   */
  const getVerificationSummary = useCallback((providerIds: string[]) => {
    return VerificationService.getVerificationSummary(
      providerIds,
      verifiedProviders,
      verificationTimestamps
    );
  }, [verifiedProviders, verificationTimestamps]);

  return {
    verifiedProviders,
    verificationTimestamps,
    verifyProvider,
    removeVerification,
    clearAllVerifications,
    getVerificationStatus,
    getVerificationMessage,
    isVerificationFresh,
    isVerificationStale,
    getVerificationAge,
    getVerifiedCount,
    getUnverifiedProviders,
    areAllProvidersVerified,
    getVerificationSummary,
  };
};