/**
 * VerificationService - Provider verification state management
 * Extracted from APIConfigScreen for better separation of concerns
 */

import { Dispatch } from '@reduxjs/toolkit';
import { addVerifiedProvider, removeVerifiedProvider, setVerifiedProviders } from '../store';
import TimeFormatterService from './TimeFormatterService';

export interface VerificationStatus {
  isVerified: boolean;
  timestamp?: number;
  message?: string;
  model?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  model?: string;
  timestamp?: number;
}

export class VerificationService {
  private static instance: VerificationService;

  static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Verify a provider and update Redux state
   */
  verifyProvider(
    providerId: string, 
    dispatch: Dispatch,
    result: VerificationResult
  ): void {
    if (result.success) {
      dispatch(addVerifiedProvider(providerId));
    } else {
      dispatch(removeVerifiedProvider(providerId));
    }
  }

  /**
   * Remove verification for a provider
   */
  removeVerification(providerId: string, dispatch: Dispatch): void {
    dispatch(removeVerifiedProvider(providerId));
  }

  /**
   * Clear all verifications
   */
  clearAllVerifications(dispatch: Dispatch): void {
    dispatch(setVerifiedProviders([]));
  }

  /**
   * Get verification status for a provider
   */
  getVerificationStatus(
    providerId: string,
    verifiedProviders: string[],
    verificationTimestamps: Record<string, number>,
    hasApiKey: boolean
  ): VerificationStatus {
    const isVerified = verifiedProviders.includes(providerId);
    const timestamp = verificationTimestamps[providerId];

    if (!hasApiKey) {
      return {
        isVerified: false
      };
    }

    if (isVerified && timestamp) {
      return {
        isVerified: true,
        timestamp,
        message: TimeFormatterService.formatVerificationTime(timestamp)
      };
    }

    return {
      isVerified: false
    };
  }

  /**
   * Format verification message for display
   */
  formatVerificationMessage(
    providerId: string,
    verifiedProviders: string[],
    verificationTimestamps: Record<string, number>,
    hasApiKey: boolean
  ): string | undefined {
    const status = this.getVerificationStatus(
      providerId,
      verifiedProviders,
      verificationTimestamps,
      hasApiKey
    );

    return status.message;
  }

  /**
   * Check if verification is fresh (within last hour)
   */
  isVerificationFresh(
    providerId: string,
    verificationTimestamps: Record<string, number>
  ): boolean {
    const timestamp = verificationTimestamps[providerId];
    if (!timestamp) return false;

    return TimeFormatterService.isVerificationFresh(timestamp);
  }

  /**
   * Check if verification is stale (older than 24 hours)
   */
  isVerificationStale(
    providerId: string,
    verificationTimestamps: Record<string, number>
  ): boolean {
    const timestamp = verificationTimestamps[providerId];
    if (!timestamp) return true;

    return TimeFormatterService.isVerificationStale(timestamp);
  }

  /**
   * Get verification age status
   */
  getVerificationAge(
    providerId: string,
    verificationTimestamps: Record<string, number>
  ): 'fresh' | 'recent' | 'stale' | 'none' {
    const timestamp = verificationTimestamps[providerId];
    if (!timestamp) return 'none';

    return TimeFormatterService.getVerificationStatus(timestamp);
  }

  /**
   * Get providers that need re-verification (stale)
   */
  getStaleProviders(
    verifiedProviders: string[],
    verificationTimestamps: Record<string, number>
  ): string[] {
    return verifiedProviders.filter(providerId => 
      this.isVerificationStale(providerId, verificationTimestamps)
    );
  }

  /**
   * Get recently verified providers (within last hour)
   */
  getFreshlyVerifiedProviders(
    verifiedProviders: string[],
    verificationTimestamps: Record<string, number>
  ): string[] {
    return verifiedProviders.filter(providerId => 
      this.isVerificationFresh(providerId, verificationTimestamps)
    );
  }

  /**
   * Count verified providers
   */
  getVerifiedCount(verifiedProviders: string[]): number {
    return verifiedProviders.length;
  }

  /**
   * Check if all providers in a list are verified
   */
  areAllProvidersVerified(
    providerIds: string[],
    verifiedProviders: string[]
  ): boolean {
    return providerIds.every(id => verifiedProviders.includes(id));
  }

  /**
   * Get unverified providers from a list
   */
  getUnverifiedProviders(
    providerIds: string[],
    verifiedProviders: string[]
  ): string[] {
    return providerIds.filter(id => !verifiedProviders.includes(id));
  }

  /**
   * Create verification result object
   */
  createVerificationResult(
    success: boolean,
    message: string,
    model?: string
  ): VerificationResult {
    return {
      success,
      message,
      model,
      timestamp: success ? Date.now() : undefined
    };
  }

  /**
   * Update verification timestamp for a provider
   */
  updateTimestamp(providerId: string, dispatch: Dispatch): void {
    // The timestamp is automatically updated when addVerifiedProvider is called
    // This method is for explicit timestamp updates if needed
    dispatch(addVerifiedProvider(providerId));
  }

  /**
   * Bulk verify multiple providers
   */
  bulkVerifyProviders(
    providerIds: string[],
    dispatch: Dispatch,
    results: Record<string, VerificationResult>
  ): void {
    const verifiedProviders: string[] = [];

    providerIds.forEach(providerId => {
      const result = results[providerId];
      if (result && result.success) {
        verifiedProviders.push(providerId);
      }
    });

    // Update verified providers in batch
    dispatch(setVerifiedProviders(verifiedProviders));
  }

  /**
   * Get verification summary
   */
  getVerificationSummary(
    providerIds: string[],
    verifiedProviders: string[],
    verificationTimestamps: Record<string, number>
  ): {
    total: number;
    verified: number;
    fresh: number;
    stale: number;
    percentage: number;
  } {
    const total = providerIds.length;
    const verified = verifiedProviders.filter(id => providerIds.includes(id)).length;
    const fresh = this.getFreshlyVerifiedProviders(verifiedProviders, verificationTimestamps).length;
    const stale = this.getStaleProviders(verifiedProviders, verificationTimestamps).length;
    const percentage = total > 0 ? (verified / total) * 100 : 0;

    return {
      total,
      verified,
      fresh,
      stale,
      percentage
    };
  }
}

export default VerificationService.getInstance();