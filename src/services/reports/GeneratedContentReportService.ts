import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const GENERATED_CONTENT_REPORT_REASONS = [
  'offensive',
  'hate_harassment',
  'sexual_content',
  'violence_self_harm',
  'child_safety',
  'deceptive_impersonation',
  'other',
] as const;

export type GeneratedContentReportReason = typeof GENERATED_CONTENT_REPORT_REASONS[number];
export type GeneratedContentReportSurface = 'chat' | 'compare' | 'debate' | 'create' | 'support';
export type GeneratedContentReportContentType = 'text' | 'image' | 'video' | 'audio' | 'mixed' | 'unknown';
export type GeneratedContentReportMetadataValue = string | number | boolean | null;

export interface GeneratedContentReportTarget {
  surface: GeneratedContentReportSurface;
  contentType: GeneratedContentReportContentType;
  contentId?: string;
  sessionId?: string;
  title?: string;
  prompt?: string;
  contentText?: string;
  providerId?: string;
  modelId?: string;
  metadata?: Record<string, GeneratedContentReportMetadataValue>;
}

export interface SubmitGeneratedContentReportInput {
  reason: GeneratedContentReportReason;
  details?: string;
  target: GeneratedContentReportTarget;
}

interface SubmitGeneratedContentReportRequest extends SubmitGeneratedContentReportInput {
  appContext: {
    appVersion: string;
    platform: string;
    osVersion?: string;
  };
}

interface SubmitGeneratedContentReportResponse {
  success: boolean;
  reportId: string;
}

class GeneratedContentReportService {
  static async submitReport(input: SubmitGeneratedContentReportInput): Promise<SubmitGeneratedContentReportResponse> {
    const functions = getFunctions();
    const callable = httpsCallable<
      SubmitGeneratedContentReportRequest,
      SubmitGeneratedContentReportResponse
    >(functions, 'reportGeneratedContent');

    const result = await callable({
      ...input,
      appContext: {
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        platform: Platform.OS,
        osVersion: String(Platform.Version),
      },
    });

    return result.data;
  }
}

export default GeneratedContentReportService;
