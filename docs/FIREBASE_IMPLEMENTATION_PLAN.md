# Firebase Implementation Plan for DebateAI
## Fresh Deployment - No Migration Required

*Last Updated: August 2025*

---

## Executive Summary

This document provides a comprehensive, step-by-step implementation plan for integrating Firebase into the DebateAI React Native app. This is a **fresh implementation** with no existing users or data migration required. The plan covers authentication, data storage, real-time features, security, and React Native best practices.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Firebase Architecture Design](#2-firebase-architecture-design)
3. [Data Model & Firestore Structure](#3-data-model--firestore-structure)
4. [Implementation Phases](#4-implementation-phases)
5. [Phase 1: Firebase Setup & Authentication](#5-phase-1-firebase-setup--authentication)
6. [Phase 2: Firestore Database & Data Layer](#6-phase-2-firestore-database--data-layer)
7. [Phase 3: Real-time Features](#7-phase-3-real-time-features)
8. [Phase 4: Security & Performance](#8-phase-4-security--performance)
9. [Phase 5: Testing & Launch](#9-phase-5-testing--launch)
10. [Cost Estimates & Optimization](#10-cost-estimates--optimization)

---

## 1. Project Overview

### Current State
- **App Name**: DebateAI (previously My AI Friends)
- **Bundle ID**: `com.braveheartinnovations.debateai`
- **Architecture**: React Native with Expo, Redux Toolkit, TypeScript
- **Current Storage**: Local only (expo-secure-store for API keys)
- **Authentication**: None (app starts directly)

### Firebase Requirements
- **Authentication**: Email/password, Google, Apple Sign-In
- **Data Storage**: User profiles, debate history, chat sessions, API keys
- **Real-time**: Live debate updates, chat synchronization
- **Offline Support**: Full offline capability with sync
- **Security**: Encrypted API key storage, user data isolation

---

## 2. Firebase Architecture Design

### Service Architecture

```
┌─────────────────────────────────────────┐
│           React Native App              │
├─────────────────────────────────────────┤
│         Firebase Service Layer          │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │   Auth   │ │Firestore │ │Storage │ │
│  └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Analytics │ │Functions │ │Config  │ │
│  └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────┤
│          Redux Store (Local)            │
│  - User State                           │
│  - Chat Sessions                        │
│  - Debate Stats                         │
│  - Settings & Preferences               │
└─────────────────────────────────────────┘
```

### Data Flow Architecture

1. **Authentication Flow**
   - User signs up/in → Firebase Auth → Create/update Firestore user doc → Update Redux store
   
2. **Data Synchronization**
   - Local Redux changes → Firestore listeners → Real-time sync across devices
   
3. **Offline-First Strategy**
   - All operations work offline → Queue changes → Sync when online

---

## 3. Data Model & Firestore Structure

### Collections Structure

```typescript
// users/{userId}
interface UserDocument {
  // Profile Information
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Subscription & Features
  subscription: 'free' | 'pro' | 'business';
  subscriptionExpiry?: Timestamp;
  features: {
    customDebateTopics: boolean;
    personalities: boolean;
    expertMode: boolean;
    unlimitedDebates: boolean;
  };
  
  // Settings & Preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    uiMode: 'simple' | 'expert';
    notifications: {
      debates: boolean;
      updates: boolean;
      marketing: boolean;
    };
  };
  
  // Metadata
  createdAt: Timestamp;
  lastActive: Timestamp;
  deviceTokens?: string[]; // For push notifications
  
  // Statistics Summary (denormalized for performance)
  stats: {
    totalDebates: number;
    totalChats: number;
    favoriteAI?: string;
    lastDebateId?: string;
  };
}

// users/{userId}/apiKeys/{keyId}
interface ApiKeyDocument {
  provider: string; // 'claude', 'openai', 'google', etc.
  encryptedKey: string; // Encrypted with user-specific key
  addedAt: Timestamp;
  lastUsed?: Timestamp;
  isValid: boolean;
  usageCount: number;
}

// debates/{debateId}
interface DebateDocument {
  id: string;
  userId: string; // Owner
  topic: string;
  topicMode: 'preset' | 'custom';
  participants: Array<{
    aiId: string;
    provider: string;
    name: string;
    personality?: string;
  }>;
  rounds: Array<{
    number: number;
    arguments: Array<{
      aiId: string;
      content: string;
      timestamp: Timestamp;
    }>;
    winnerId?: string;
  }>;
  overallWinner?: string;
  status: 'active' | 'completed' | 'abandoned';
  visibility: 'private' | 'public'; // For sharing
  shareCode?: string; // For viral sharing
  
  // Metadata
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // in seconds
  
  // Engagement metrics
  views?: number;
  shares?: number;
  reactions?: Map<string, number>; // emoji -> count
}

// chats/{chatId}
interface ChatDocument {
  id: string;
  userId: string;
  sessionType: 'multi-ai' | 'single-ai';
  selectedAIs: Array<{
    id: string;
    provider: string;
    name: string;
    personality?: string;
    model?: string;
  }>;
  messages: Array<{
    id: string;
    sender: string;
    senderType: 'user' | 'ai';
    content: string;
    timestamp: Timestamp;
    mentions?: string[];
    metadata?: {
      responseTime?: number;
      wordCount?: number;
      model?: string;
      cost?: number;
    };
  }>;
  
  // Session metadata
  title?: string; // Auto-generated or user-defined
  summary?: string; // AI-generated summary
  tags?: string[];
  isActive: boolean;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
}

// sharedDebates/{shareCode}
interface SharedDebateDocument {
  debateId: string;
  userId: string;
  topic: string;
  participants: string[];
  winner: string;
  highlights: string[]; // Best arguments
  shareCode: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // 30 days
  stats: {
    views: number;
    reactions: Map<string, number>;
    appInstalls: number; // Track viral growth
  };
}

// aiStats/{aiId}
interface AIStatsDocument {
  aiId: string;
  provider: string;
  name: string;
  
  // Global statistics across all users
  globalStats: {
    totalDebates: number;
    totalWins: number;
    winRate: number;
    avgResponseTime: number;
    popularTopics: Map<string, number>;
    lastUpdated: Timestamp;
  };
  
  // Leaderboard position
  leaderboard: {
    overall: number;
    byTopic: Map<string, number>;
  };
}
```

### Indexes Required

```javascript
// Firestore composite indexes needed:

// 1. User's debates (sorted by date)
debates: userId, startedAt DESC

// 2. User's chats (sorted by last message)
chats: userId, lastMessageAt DESC

// 3. Public debates for discovery
debates: visibility == 'public', completedAt DESC

// 4. AI leaderboard
aiStats: globalStats.winRate DESC

// 5. Shared debates by popularity
sharedDebates: stats.views DESC
```

---

## 4. Implementation Phases

### Timeline Overview
- **Phase 1**: Firebase Setup & Authentication (3-4 days)
- **Phase 2**: Firestore Database & Data Layer (4-5 days)
- **Phase 3**: Real-time Features (3-4 days)
- **Phase 4**: Security & Performance (2-3 days)
- **Phase 5**: Testing & Launch (2-3 days)

**Total: 14-19 days**

---

## 5. Phase 1: Firebase Setup & Authentication

### Step 1.1: Firebase Project Setup

```bash
# 1. Create new Firebase project
Project Name: debateai-prod
Project ID: debateai-prod
Analytics: Enabled
Region: us-central1
```

### Step 1.2: Install Firebase Dependencies

```bash
# Core Firebase packages
npm install @react-native-firebase/app@^21.0.0
npm install @react-native-firebase/auth@^21.0.0
npm install @react-native-firebase/firestore@^21.0.0

# Additional services
npm install @react-native-firebase/analytics@^21.0.0
npm install @react-native-firebase/crashlytics@^21.0.0
npm install @react-native-firebase/remote-config@^21.0.0
npm install @react-native-firebase/storage@^21.0.0
npm install @react-native-firebase/functions@^21.0.0

# Social authentication
npm install @react-native-google-signin/google-signin@^13.0.0
npm install @invertase/react-native-apple-authentication@^2.3.0

# Encryption for API keys
npm install react-native-crypto-js
```

### Step 1.3: Platform Configuration

#### iOS Setup
```xml
<!-- ios/DebateAI/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- Google Sign-In -->
      <string>REVERSED_CLIENT_ID_FROM_GOOGLE_SERVICES</string>
      <!-- Deep linking -->
      <string>debateai</string>
    </array>
  </dict>
</array>

<!-- Apple Sign-In Capability -->
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

#### Android Setup
```gradle
// android/app/build.gradle
dependencies {
    implementation platform('com.google.firebase:firebase-bom:33.2.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-firestore'
}
```

### Step 1.4: Authentication Service Implementation

```typescript
// src/services/firebase/auth.ts
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

export class AuthService {
  private currentUser: FirebaseAuthTypes.User | null = null;

  constructor() {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: 'YOUR_WEB_CLIENT_ID',
      offlineAccess: true,
    });

    // Listen to auth state changes
    auth().onAuthStateChanged(this.onAuthStateChanged);
  }

  private onAuthStateChanged = async (user: FirebaseAuthTypes.User | null) => {
    this.currentUser = user;
    
    if (user) {
      // Update user document
      await this.updateUserDocument(user);
      // Sync with Redux store
      await this.syncWithRedux(user);
    }
  };

  // Email/Password Sign Up
  async signUpWithEmail(email: string, password: string, displayName: string) {
    const credential = await auth().createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName });
    await this.createUserDocument(credential.user);
    return credential.user;
  }

  // Email/Password Sign In
  async signInWithEmail(email: string, password: string) {
    const credential = await auth().signInWithEmailAndPassword(email, password);
    return credential.user;
  }

  // Google Sign In
  async signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const { idToken } = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const credential = await auth().signInWithCredential(googleCredential);
    await this.createUserDocument(credential.user);
    return credential.user;
  }

  // Apple Sign In
  async signInWithApple() {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    if (!appleAuthRequestResponse.identityToken) {
      throw new Error('Apple Sign-In failed');
    }

    const { identityToken, nonce } = appleAuthRequestResponse;
    const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
    const credential = await auth().signInWithCredential(appleCredential);
    await this.createUserDocument(credential.user);
    return credential.user;
  }

  // Create/Update user document in Firestore
  private async createUserDocument(user: FirebaseAuthTypes.User) {
    const userRef = firestore().collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      // Create new user document
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'DebateAI User',
        photoURL: user.photoURL,
        subscription: 'free',
        features: {
          customDebateTopics: false,
          personalities: false,
          expertMode: false,
          unlimitedDebates: false,
        },
        preferences: {
          theme: 'auto',
          fontSize: 'medium',
          uiMode: 'simple',
          notifications: {
            debates: true,
            updates: true,
            marketing: false,
          },
        },
        stats: {
          totalDebates: 0,
          totalChats: 0,
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActive: firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Update last active
      await userRef.update({
        lastActive: firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Sign out
  async signOut() {
    await auth().signOut();
    await GoogleSignin.signOut();
  }
}

export default new AuthService();
```

### Step 1.5: Redux Integration

```typescript
// src/services/firebase/reduxSync.ts
import { store } from '../../store';
import { setUser, logout } from '../../store';
import firestore from '@react-native-firebase/firestore';

export class ReduxFirebaseSync {
  private unsubscribers: Array<() => void> = [];

  // Sync user data from Firestore to Redux
  async syncUserToRedux(uid: string) {
    const unsubscribe = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            const userData = doc.data();
            store.dispatch(setUser({
              id: uid,
              email: userData?.email,
              subscription: userData?.subscription || 'free',
              uiMode: userData?.preferences?.uiMode || 'simple',
              preferences: userData?.preferences || {
                theme: 'auto',
                fontSize: 'medium',
              },
            }));
          }
        },
        (error) => {
          console.error('User sync error:', error);
        }
      );

    this.unsubscribers.push(unsubscribe);
  }

  // Sync Redux changes to Firestore
  async syncReduxToFirestore(uid: string, changes: any) {
    try {
      await firestore()
        .collection('users')
        .doc(uid)
        .update({
          ...changes,
          lastActive: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Firestore sync error:', error);
    }
  }

  // Clean up listeners
  cleanup() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }
}
```

---

## 6. Phase 2: Firestore Database & Data Layer

### Step 2.1: API Key Management Service

```typescript
// src/services/firebase/apiKeys.ts
import firestore from '@react-native-firebase/firestore';
import CryptoJS from 'react-native-crypto-js';
import auth from '@react-native-firebase/auth';

export class APIKeyService {
  private encryptionKey: string = '';

  constructor() {
    // Generate user-specific encryption key
    const user = auth().currentUser;
    if (user) {
      this.encryptionKey = CryptoJS.SHA256(user.uid + 'debate-ai-salt').toString();
    }
  }

  // Save encrypted API key
  async saveAPIKey(provider: string, key: string) {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const encrypted = CryptoJS.AES.encrypt(key, this.encryptionKey).toString();
    
    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('apiKeys')
      .doc(provider)
      .set({
        provider,
        encryptedKey: encrypted,
        addedAt: firestore.FieldValue.serverTimestamp(),
        isValid: true,
        usageCount: 0,
      });
  }

  // Retrieve and decrypt API keys
  async getAPIKeys(): Promise<Record<string, string>> {
    const user = auth().currentUser;
    if (!user) return {};

    const snapshot = await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('apiKeys')
      .get();

    const keys: Record<string, string> = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const decrypted = CryptoJS.AES.decrypt(
        data.encryptedKey,
        this.encryptionKey
      ).toString(CryptoJS.enc.Utf8);
      
      keys[data.provider] = decrypted;
    });

    return keys;
  }

  // Delete API key
  async deleteAPIKey(provider: string) {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('apiKeys')
      .doc(provider)
      .delete();
  }
}
```

### Step 2.2: Debate Service

```typescript
// src/services/firebase/debates.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export class DebateService {
  // Create new debate
  async createDebate(topic: string, participants: any[], topicMode: 'preset' | 'custom') {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const debateRef = firestore().collection('debates').doc();
    
    await debateRef.set({
      id: debateRef.id,
      userId: user.uid,
      topic,
      topicMode,
      participants,
      rounds: [],
      status: 'active',
      visibility: 'private',
      startedAt: firestore.FieldValue.serverTimestamp(),
    });

    return debateRef.id;
  }

  // Add round to debate
  async addRound(debateId: string, round: any) {
    await firestore()
      .collection('debates')
      .doc(debateId)
      .update({
        rounds: firestore.FieldValue.arrayUnion(round),
      });
  }

  // Complete debate
  async completeDebate(debateId: string, winner: string) {
    const debateRef = firestore().collection('debates').doc(debateId);
    
    await debateRef.update({
      overallWinner: winner,
      status: 'completed',
      completedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Update AI stats
    await this.updateAIStats(debateId);
  }

  // Get user's debate history
  async getDebateHistory(limit = 20) {
    const user = auth().currentUser;
    if (!user) return [];

    const snapshot = await firestore()
      .collection('debates')
      .where('userId', '==', user.uid)
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // Real-time debate subscription
  subscribeToDebate(debateId: string, callback: (debate: any) => void) {
    return firestore()
      .collection('debates')
      .doc(debateId)
      .onSnapshot(doc => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        }
      });
  }

  // Share debate
  async shareDebate(debateId: string) {
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await firestore()
      .collection('debates')
      .doc(debateId)
      .update({
        visibility: 'public',
        shareCode,
      });

    // Create shared debate document
    await firestore()
      .collection('sharedDebates')
      .doc(shareCode)
      .set({
        debateId,
        shareCode,
        createdAt: firestore.FieldValue.serverTimestamp(),
        expiresAt: firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        ),
        stats: {
          views: 0,
          reactions: {},
          appInstalls: 0,
        },
      });

    return shareCode;
  }

  // Update AI global statistics
  private async updateAIStats(debateId: string) {
    const debate = await firestore()
      .collection('debates')
      .doc(debateId)
      .get();

    if (!debate.exists) return;

    const data = debate.data();
    const winner = data?.overallWinner;

    // Update winner stats
    if (winner) {
      const aiStatsRef = firestore().collection('aiStats').doc(winner);
      await firestore().runTransaction(async (transaction) => {
        const aiDoc = await transaction.get(aiStatsRef);
        
        if (aiDoc.exists) {
          const currentStats = aiDoc.data()?.globalStats || {};
          transaction.update(aiStatsRef, {
            'globalStats.totalDebates': (currentStats.totalDebates || 0) + 1,
            'globalStats.totalWins': (currentStats.totalWins || 0) + 1,
            'globalStats.winRate': 
              ((currentStats.totalWins || 0) + 1) / ((currentStats.totalDebates || 0) + 1) * 100,
            'globalStats.lastUpdated': firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(aiStatsRef, {
            aiId: winner,
            globalStats: {
              totalDebates: 1,
              totalWins: 1,
              winRate: 100,
              lastUpdated: firestore.FieldValue.serverTimestamp(),
            },
          });
        }
      });
    }
  }
}
```

### Step 2.3: Chat Service

```typescript
// src/services/firebase/chats.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export class ChatService {
  // Create new chat session
  async createChatSession(selectedAIs: any[]) {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const chatRef = firestore().collection('chats').doc();
    
    await chatRef.set({
      id: chatRef.id,
      userId: user.uid,
      sessionType: selectedAIs.length > 1 ? 'multi-ai' : 'single-ai',
      selectedAIs,
      messages: [],
      isActive: true,
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastMessageAt: firestore.FieldValue.serverTimestamp(),
      messageCount: 0,
    });

    return chatRef.id;
  }

  // Add message to chat
  async addMessage(chatId: string, message: any) {
    const chatRef = firestore().collection('chats').doc(chatId);
    
    await chatRef.update({
      messages: firestore.FieldValue.arrayUnion({
        ...message,
        timestamp: firestore.FieldValue.serverTimestamp(),
      }),
      lastMessageAt: firestore.FieldValue.serverTimestamp(),
      messageCount: firestore.FieldValue.increment(1),
    });
  }

  // Get chat history
  async getChatHistory(limit = 20) {
    const user = auth().currentUser;
    if (!user) return [];

    const snapshot = await firestore()
      .collection('chats')
      .where('userId', '==', user.uid)
      .orderBy('lastMessageAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  // Real-time chat subscription
  subscribeToChatSession(chatId: string, callback: (chat: any) => void) {
    return firestore()
      .collection('chats')
      .doc(chatId)
      .onSnapshot(doc => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        }
      });
  }

  // End chat session
  async endChatSession(chatId: string) {
    await firestore()
      .collection('chats')
      .doc(chatId)
      .update({
        isActive: false,
      });
  }
}
```

---

## 7. Phase 3: Real-time Features

### Step 3.1: Real-time Debate Updates

```typescript
// src/hooks/useRealtimeDebate.ts
import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';

export function useRealtimeDebate(debateId: string) {
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!debateId) return;

    const unsubscribe = firestore()
      .collection('debates')
      .doc(debateId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            setDebate({ id: doc.id, ...doc.data() });
          }
          setLoading(false);
        },
        (err) => {
          setError(err);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [debateId]);

  return { debate, loading, error };
}
```

### Step 3.2: Offline Support Configuration

```typescript
// src/services/firebase/offline.ts
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

export class OfflineManager {
  constructor() {
    this.configureOfflineSupport();
    this.monitorConnectivity();
  }

  private async configureOfflineSupport() {
    // Enable offline persistence
    await firestore().settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });

    // Enable multi-tab synchronization
    await firestore().enableNetwork();
  }

  private monitorConnectivity() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Sync pending writes
        this.syncPendingData();
      }
    });
  }

  private async syncPendingData() {
    try {
      await firestore().waitForPendingWrites();
      console.log('Synced offline data');
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  // Check if data is from cache
  isFromCache(snapshot: any): boolean {
    return snapshot.metadata.fromCache;
  }
}
```

### Step 3.3: Real-time Presence System

```typescript
// src/services/firebase/presence.ts
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

export class PresenceService {
  private presenceRef: any;
  private userStatusRef: any;

  async initializePresence() {
    const user = auth().currentUser;
    if (!user) return;

    // Realtime Database presence
    this.presenceRef = database().ref(`/status/${user.uid}`);
    
    // Firestore user status
    this.userStatusRef = firestore()
      .collection('users')
      .doc(user.uid);

    // Set up presence system
    database()
      .ref('.info/connected')
      .on('value', async (snapshot) => {
        if (snapshot.val() === false) return;

        // User is online
        await this.presenceRef.onDisconnect().set({
          state: 'offline',
          lastSeen: database.ServerValue.TIMESTAMP,
        });

        await this.presenceRef.set({
          state: 'online',
          lastSeen: database.ServerValue.TIMESTAMP,
        });

        // Update Firestore
        await this.userStatusRef.update({
          status: 'online',
          lastActive: firestore.FieldValue.serverTimestamp(),
        });
      });
  }

  cleanup() {
    if (this.presenceRef) {
      this.presenceRef.off();
    }
  }
}
```

---

## 8. Phase 4: Security & Performance

### Step 4.1: Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function hasValidSubscription() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.subscription in ['pro', 'business'];
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && 
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscription', 'features']);
      allow delete: if false;
      
      // API Keys subcollection
      match /apiKeys/{keyId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // Debates collection
    match /debates/{debateId} {
      allow read: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         resource.data.visibility == 'public');
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow delete: if false;
    }
    
    // Chats collection
    match /chats/{chatId} {
      allow read, write: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Shared debates (public)
    match /sharedDebates/{shareCode} {
      allow read: if true;
      allow write: if false;
    }
    
    // AI Stats (public read)
    match /aiStats/{aiId} {
      allow read: if true;
      allow write: if false; // Only Cloud Functions
    }
  }
}
```

### Step 4.2: Cloud Functions for Security

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Validate API keys
export const validateAPIKey = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
  }

  const { provider, key } = data;
  
  // Validate key with provider's API
  const isValid = await validateWithProvider(provider, key);
  
  if (isValid) {
    // Update validation status
    await admin.firestore()
      .collection('users')
      .doc(context.auth.uid)
      .collection('apiKeys')
      .doc(provider)
      .update({
        isValid: true,
        lastValidated: admin.firestore.FieldValue.serverTimestamp(),
      });
  }
  
  return { isValid };
});

// Clean up expired shared debates
export const cleanupSharedDebates = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    const expired = await admin.firestore()
      .collection('sharedDebates')
      .where('expiresAt', '<=', now)
      .get();
    
    const batch = admin.firestore().batch();
    expired.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    console.log(`Deleted ${expired.size} expired shared debates`);
  });

// Update leaderboard
export const updateLeaderboard = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const aiStats = await admin.firestore()
      .collection('aiStats')
      .orderBy('globalStats.winRate', 'desc')
      .get();
    
    const batch = admin.firestore().batch();
    
    aiStats.docs.forEach((doc, index) => {
      batch.update(doc.ref, {
        'leaderboard.overall': index + 1,
      });
    });
    
    await batch.commit();
    console.log('Leaderboard updated');
  });
```

### Step 4.3: Performance Optimization

```typescript
// src/services/firebase/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class FirebaseCache {
  private cachePrefix = 'firebase_cache_';
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  // Cache Firestore query results
  async cacheQuery(key: string, data: any) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    };
    
    await AsyncStorage.setItem(
      `${this.cachePrefix}${key}`,
      JSON.stringify(cacheItem)
    );
  }

  // Get cached data
  async getCached(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      if (!cached) return null;
      
      const cacheItem = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - cacheItem.timestamp > this.cacheDuration) {
        await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
        return null;
      }
      
      return cacheItem.data;
    } catch (error) {
      return null;
    }
  }

  // Clear all cache
  async clearCache() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
    await AsyncStorage.multiRemove(cacheKeys);
  }
}

// Optimized hooks with caching
export function useCachedFirestoreQuery(
  queryKey: string,
  queryFn: () => Promise<any>
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const cache = new FirebaseCache();

  useEffect(() => {
    const loadData = async () => {
      // Check cache first
      const cached = await cache.getCached(queryKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Fetch from Firestore
      try {
        const result = await queryFn();
        setData(result);
        await cache.cacheQuery(queryKey, result);
      } catch (error) {
        console.error('Query error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [queryKey]);

  return { data, loading };
}
```

---

## 9. Phase 5: Testing & Launch

### Step 5.1: Testing Strategy

```typescript
// src/services/firebase/__tests__/auth.test.ts
import { AuthService } from '../auth';
import auth from '@react-native-firebase/auth';

jest.mock('@react-native-firebase/auth');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create user with email', async () => {
    const mockUser = { uid: 'test123', email: 'test@example.com' };
    auth().createUserWithEmailAndPassword.mockResolvedValue({
      user: mockUser,
    });

    const authService = new AuthService();
    const user = await authService.signUpWithEmail(
      'test@example.com',
      'password123',
      'Test User'
    );

    expect(user).toEqual(mockUser);
  });

  // Add more tests...
});
```

### Step 5.2: Environment Configuration

```typescript
// src/config/firebase.ts
const DEV_CONFIG = {
  apiKey: "dev-api-key",
  authDomain: "debateai-dev.firebaseapp.com",
  projectId: "debateai-dev",
  storageBucket: "debateai-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:ios:abc123",
};

const PROD_CONFIG = {
  apiKey: "prod-api-key",
  authDomain: "debateai-prod.firebaseapp.com",
  projectId: "debateai-prod",
  storageBucket: "debateai-prod.appspot.com",
  messagingSenderId: "987654321",
  appId: "1:987654321:ios:xyz789",
};

export const firebaseConfig = __DEV__ ? DEV_CONFIG : PROD_CONFIG;
```

### Step 5.3: Migration from Local Storage

```typescript
// src/services/migration/localToFirebase.ts
import secureStorage from '../secureStorage';
import { APIKeyService } from '../firebase/apiKeys';
import auth from '@react-native-firebase/auth';

export class DataMigration {
  async migrateLocalDataToFirebase() {
    const user = auth().currentUser;
    if (!user) return;

    // Migrate API keys
    const localKeys = await secureStorage.getApiKeys();
    if (localKeys) {
      const apiKeyService = new APIKeyService();
      
      for (const [provider, key] of Object.entries(localKeys)) {
        if (key) {
          await apiKeyService.saveAPIKey(provider, key);
        }
      }
      
      // Clear local storage after successful migration
      await secureStorage.clearApiKeys();
    }

    // Migrate other local data...
  }
}
```

### Step 5.4: Launch Checklist

```markdown
## Pre-Launch Checklist

### Firebase Console
- [ ] Production project created
- [ ] Authentication providers configured
- [ ] Firestore indexes created
- [ ] Security rules deployed
- [ ] Cloud Functions deployed
- [ ] Remote Config values set
- [ ] Analytics events configured
- [ ] Crashlytics enabled

### App Configuration
- [ ] GoogleService-Info.plist added (iOS)
- [ ] google-services.json added (Android)
- [ ] Bundle IDs match Firebase config
- [ ] SHA certificates added (Android)
- [ ] Apple Sign-In configured
- [ ] Deep linking configured

### Testing
- [ ] Authentication flows tested
- [ ] Offline mode tested
- [ ] Data sync verified
- [ ] Security rules tested
- [ ] Performance benchmarked
- [ ] Error handling verified

### Monitoring
- [ ] Budget alerts configured
- [ ] Usage monitoring set up
- [ ] Error alerts configured
- [ ] Performance monitoring enabled
```

---

## 10. Cost Estimates & Optimization

### Monthly Cost Projections

| Users | Auth | Firestore | Functions | Storage | Total |
|-------|------|-----------|-----------|---------|-------|
| 1K    | $0   | $5        | $2        | $1      | $8    |
| 10K   | $0   | $50       | $20       | $10     | $80   |
| 100K  | $600 | $500      | $200      | $100    | $1400 |

### Optimization Strategies

1. **Firestore Optimization**
   - Use collection group queries sparingly
   - Implement pagination (limit queries)
   - Cache frequently accessed data
   - Use compound queries efficiently
   - Batch writes when possible

2. **Function Optimization**
   - Use minimum memory allocation
   - Implement cold start optimization
   - Use scheduled functions for batch operations
   - Implement retry logic with exponential backoff

3. **Storage Optimization**
   - Compress images before upload
   - Use appropriate image formats
   - Implement CDN for static assets
   - Clean up unused files regularly

4. **Cost Monitoring**
   ```typescript
   // src/services/firebase/costMonitor.ts
   export class CostMonitor {
     async trackOperation(operation: string, cost: number) {
       await analytics().logEvent('firebase_operation', {
         operation,
         estimated_cost: cost,
       });
     }
   }
   ```

---

## Conclusion

This comprehensive Firebase implementation plan provides a complete roadmap for integrating Firebase into the DebateAI app. The plan ensures:

1. **Secure Authentication** - Multiple sign-in methods with proper user management
2. **Scalable Data Architecture** - Optimized Firestore structure with offline support
3. **Real-time Features** - Live debates and chat synchronization
4. **Security First** - Encrypted API keys, proper security rules, user isolation
5. **Performance Optimized** - Caching, pagination, and efficient queries
6. **Cost Effective** - Monitoring and optimization strategies

The implementation can be completed in approximately 2-3 weeks with proper testing and deployment procedures. This architecture will support the app from launch through significant scale while maintaining performance and security standards.

---

## Appendix: TypeScript Types

```typescript
// src/types/firebase.ts
import { Timestamp } from '@react-native-firebase/firestore';

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  subscription: SubscriptionTier;
  features: UserFeatures;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Timestamp;
  lastActive: Timestamp;
}

export interface UserFeatures {
  customDebateTopics: boolean;
  personalities: boolean;
  expertMode: boolean;
  unlimitedDebates: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  uiMode: 'simple' | 'expert';
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  debates: boolean;
  updates: boolean;
  marketing: boolean;
}

export interface UserStats {
  totalDebates: number;
  totalChats: number;
  favoriteAI?: string;
  lastDebateId?: string;
}

export interface EncryptedAPIKey {
  provider: string;
  encryptedKey: string;
  addedAt: Timestamp;
  lastUsed?: Timestamp;
  isValid: boolean;
  usageCount: number;
}

export interface FirebaseDebate {
  id: string;
  userId: string;
  topic: string;
  topicMode: 'preset' | 'custom';
  participants: DebateParticipant[];
  rounds: DebateRound[];
  overallWinner?: string;
  status: 'active' | 'completed' | 'abandoned';
  visibility: 'private' | 'public';
  shareCode?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number;
  views?: number;
  shares?: number;
  reactions?: Record<string, number>;
}

export interface DebateParticipant {
  aiId: string;
  provider: string;
  name: string;
  personality?: string;
}

export interface DebateRound {
  number: number;
  arguments: DebateArgument[];
  winnerId?: string;
}

export interface DebateArgument {
  aiId: string;
  content: string;
  timestamp: Timestamp;
}

export interface FirebaseChat {
  id: string;
  userId: string;
  sessionType: 'multi-ai' | 'single-ai';
  selectedAIs: ChatAI[];
  messages: ChatMessage[];
  title?: string;
  summary?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
}

export interface ChatAI {
  id: string;
  provider: string;
  name: string;
  personality?: string;
  model?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderType: 'user' | 'ai';
  content: string;
  timestamp: Timestamp;
  mentions?: string[];
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  responseTime?: number;
  wordCount?: number;
  model?: string;
  cost?: number;
}
```

---

*End of Firebase Implementation Plan*