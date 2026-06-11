/**
 * Static security assertions over storage.rules (single source of truth for
 * the symposium-ai project). Ported from the symposium-ai-web repo when
 * rules ownership consolidated here.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const rules = readFileSync(join(process.cwd(), 'storage.rules'), 'utf8');

describe('storage payload rules', () => {
  it('does not allow broad owner writes under user storage', () => {
    expect(rules).not.toContain('match /users/{uid}/{allPaths=**}');
    expect(rules).not.toContain('allow read, write: if request.auth != null && request.auth.uid == uid;');
    expect(rules).toContain('match /{allPaths=**}');
    expect(rules).toContain('allow read, write: if false;');
  });

  it('keeps legacy message payload paths readable but not client-writable', () => {
    expect(rules).toContain('match /users/{uid}/sessions/{sessionId}/messages/{messageId}/{fileName}');
    expect(rules).toContain('allow read: if isOwner(uid) && isMessagePayloadFile(fileName);');
    expect(rules).toContain('allow write: if false;');
  });

  it('allows new message payload writes only with a matching reservation', () => {
    expect(rules).toContain('match /users/{uid}/sessions/{sessionId}/messages/{messageId}/payloads/{reservationId}/{fileName}');
    expect(rules).toContain('firestore.exists(/databases/(default)/documents/users/$(uid)/storageReservations/$(reservationId))');
    expect(rules).toContain('uploadReservation.status == \'reserved\'');
    expect(rules).toContain('uploadReservation.expiresAt > request.time');
    expect(rules).toContain('uploadReservation.bytes == request.resource.size');
    expect(rules).toContain('uploadReservation.contentType == request.resource.contentType');
  });

  it('keeps legacy artifact payload paths readable but not client-writable', () => {
    expect(rules).toContain('match /users/{uid}/sessions/{sessionId}/artifacts/{artifactId}/{fileName}');
    expect(rules).toContain("allow read: if isOwner(uid) && fileName == 'data.txt';");
    expect(rules).toContain('allow write: if false;');
  });

  it('allows new artifact payload writes only with a matching reservation', () => {
    expect(rules).toContain('match /users/{uid}/sessions/{sessionId}/artifacts/{artifactId}/payloads/{reservationId}/{fileName}');
    expect(rules).toContain("'artifact'");
    expect(rules).toContain("'data'");
    expect(rules).toContain('validReservation(');
  });
});
