import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

try { admin.app(); } catch { admin.initializeApp(); }

const REPORT_REASONS = [
  'offensive',
  'hate_harassment',
  'sexual_content',
  'violence_self_harm',
  'child_safety',
  'deceptive_impersonation',
  'other',
] as const;

const REPORT_SURFACES = ['chat', 'compare', 'debate', 'create', 'support'] as const;
const CONTENT_TYPES = ['text', 'image', 'video', 'audio', 'mixed', 'unknown'] as const;

type ReportReason = typeof REPORT_REASONS[number];
type ReportSurface = typeof REPORT_SURFACES[number];
type ReportContentType = typeof CONTENT_TYPES[number];
type MetadataValue = string | number | boolean | null;

interface ReportTarget {
  surface: ReportSurface;
  contentType: ReportContentType;
  contentId?: string;
  sessionId?: string;
  title?: string;
  prompt?: string;
  contentText?: string;
  providerId?: string;
  modelId?: string;
  metadata?: Record<string, MetadataValue>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value
    .replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]+/g, '[base64 omitted]')
    .trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function sanitizeMetadata(value: unknown): Record<string, MetadataValue> | undefined {
  if (!isRecord(value)) return undefined;

  const result: Record<string, MetadataValue> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!key || key.length > 80) continue;
    if (
      typeof rawValue === 'string'
      || typeof rawValue === 'number'
      || typeof rawValue === 'boolean'
      || rawValue === null
    ) {
      result[key] = typeof rawValue === 'string'
        ? sanitizeString(rawValue, 500) ?? ''
        : rawValue;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function readEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fieldName: string
): T[number] {
  if (typeof value === 'string' && allowed.includes(value)) {
    return value as T[number];
  }
  throw new HttpsError('invalid-argument', `Invalid ${fieldName}`);
}

function readTarget(value: unknown): ReportTarget {
  if (!isRecord(value)) {
    throw new HttpsError('invalid-argument', 'Report target is required');
  }

  const surface = readEnum(value.surface, REPORT_SURFACES, 'target surface');
  const contentType = readEnum(value.contentType, CONTENT_TYPES, 'target content type');
  const target: ReportTarget = {
    surface,
    contentType,
  };

  const contentId = sanitizeString(value.contentId, 160);
  const sessionId = sanitizeString(value.sessionId, 160);
  const title = sanitizeString(value.title, 240);
  const prompt = sanitizeString(value.prompt, 1600);
  const contentText = sanitizeString(value.contentText, 2400);
  const providerId = sanitizeString(value.providerId, 80);
  const modelId = sanitizeString(value.modelId, 160);
  const metadata = sanitizeMetadata(value.metadata);

  if (contentId) target.contentId = contentId;
  if (sessionId) target.sessionId = sessionId;
  if (title) target.title = title;
  if (prompt) target.prompt = prompt;
  if (contentText) target.contentText = contentText;
  if (providerId) target.providerId = providerId;
  if (modelId) target.modelId = modelId;
  if (metadata) target.metadata = metadata;

  return target;
}

export const reportGeneratedContent = onCall(
  {
    timeoutSeconds: 10,
    memory: '256MiB',
  },
  async (request) => {
    // Require authentication so the reports collection can't be spammed by
    // anonymous callers (Firestore storage/cost DoS + moderation-queue flooding).
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to report content');
    }

    if (!isRecord(request.data)) {
      throw new HttpsError('invalid-argument', 'Report payload is required');
    }

    const reason = readEnum(request.data.reason, REPORT_REASONS, 'report reason') as ReportReason;
    const details = sanitizeString(request.data.details, 1600);
    const target = readTarget(request.data.target);
    const appContext = sanitizeMetadata(request.data.appContext);
    const uid = request.auth.uid;
    const reporterEmail = sanitizeString(request.auth.token.email, 240) ?? null;

    const report = {
      reason,
      details: details ?? null,
      target,
      appContext: appContext ?? null,
      uid,
      reporterEmail,
      status: 'new',
      source: 'mobile',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await getFirestore()
      .collection('generatedContentReports')
      .add(report);

    console.log(`Generated content report submitted: ${docRef.id} (${target.surface}/${target.contentType})`);
    return { success: true, reportId: docRef.id };
  }
);
