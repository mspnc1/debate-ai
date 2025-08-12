# Firebase Setup Guide
## MyAIFriends React Native App

*Last Updated: August 2025*

---

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools@latest`
- Active Firebase project (Blaze plan required for Functions)
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

---

## 1. Firebase Console Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Name: `myaifriends-prod`
4. Enable Google Analytics
5. Select "Blaze" plan (Pay as you go - required for Functions)

### 1.2 Enable Services

Navigate to each service and enable:

#### Authentication
1. Go to Authentication → Sign-in method
2. Enable providers:
   - ✅ Email/Password
   - ✅ Google
   - ✅ Apple (iOS only)
3. Configure authorized domains:
   - Add `myaifriends.app`
   - Add `braveheart-innovations.com`

#### Firestore Database
1. Go to Firestore Database
2. Click "Create Database"
3. Choose production mode
4. Select region: `us-central1` (or closest to users)
5. Apply security rules (see section 2.3)

#### Remote Config
1. Go to Remote Config
2. Add parameters:
```json
{
  "privacy_policy_url": "https://myaifriends.app/privacy",
  "terms_of_service_url": "https://myaifriends.app/terms",
  "minimum_app_version": "1.0.0",
  "maintenance_mode": false,
  "subscription_price": "$9.99"
}
```

#### Cloud Functions
1. Go to Functions
2. Click "Get Started"
3. Install Firebase CLI if not already installed
4. Initialize Functions (see section 3)

---

## 2. React Native Integration

### 2.1 iOS Setup

#### Add Firebase to iOS App

1. In Firebase Console → Project Settings → Add App → iOS
2. Bundle ID: `com.braveheart.myaifriends`
3. Download `GoogleService-Info.plist`
4. Add to Xcode project root (not in a folder)

#### Configure iOS Project

```ruby
# ios/Podfile
platform :ios, '13.0'

# Add Firebase pods
pod 'Firebase/Core'
pod 'Firebase/Auth'
pod 'Firebase/Firestore'
pod 'Firebase/Analytics'
pod 'Firebase/Crashlytics'
pod 'Firebase/RemoteConfig'

# For Google Sign-In
pod 'GoogleSignIn'
```

```objc
// ios/MyAIFriends/AppDelegate.mm
#import <Firebase.h>
#import <GoogleSignIn/GoogleSignIn.h>

- (BOOL)application:(UIApplication *)application 
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  // ... rest of your code
}

// Add for Google Sign-In
- (BOOL)application:(UIApplication *)app 
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [GIDSignIn.sharedInstance handleURL:url];
}
```

#### Enable Capabilities in Xcode

1. Open project in Xcode
2. Select target → Signing & Capabilities
3. Add capabilities:
   - ✅ Sign in with Apple
   - ✅ Push Notifications (for remote config)
   - ✅ Background Modes → Remote notifications

### 2.2 Android Setup

#### Add Firebase to Android App

1. In Firebase Console → Project Settings → Add App → Android
2. Package name: `com.braveheart.myaifriends`
3. SHA-1 certificate (for Google Sign-In):
```bash
# Debug SHA-1
cd android && ./gradlew signingReport

# Production SHA-1 (from your keystore)
keytool -list -v -keystore your-release-key.keystore
```
4. Download `google-services.json`
5. Place in `android/app/` directory

#### Configure Android Project

```gradle
// android/build.gradle
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 23
        compileSdkVersion = 35
        targetSdkVersion = 35
    }
    dependencies {
        classpath 'com.google.gms:google-services:4.4.2'
        classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.2'
    }
}
```

```gradle
// android/app/build.gradle
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:33.2.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-firestore'
}
```

### 2.3 Security Rules

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
    
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User documents
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && 
        (!request.resource.data.keys().hasAny(['subscription', 'subscriptionExpiry']) ||
         request.auth.token.admin == true);
      allow delete: if false;
    }
    
    // Purchase records (read-only for users)
    match /purchases/{purchaseId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions
    }
    
    // Public app config
    match /config/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## 3. Cloud Functions Setup

### 3.1 Initialize Functions

```bash
# In project root
firebase init functions

# Select:
# - Language: TypeScript
# - ESLint: Yes
# - Install dependencies: Yes
```

### 3.2 Configure Functions

```typescript
// functions/src/index.ts
import * as admin from 'firebase-admin';
import { validatePurchase } from './validatePurchase';
import { onUserCreate } from './onUserCreate';
import { checkSubscriptions } from './checkSubscriptions';

admin.initializeApp();

// Export functions
export { validatePurchase, onUserCreate, checkSubscriptions };
```

```typescript
// functions/src/onUserCreate.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  // Create user document when auth account is created
  await admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    subscription: 'free',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActive: admin.firestore.FieldValue.serverTimestamp(),
    preferences: {
      theme: 'auto',
      notifications: true,
    },
  });
  
  // Send welcome email (optional)
  if (user.email) {
    // await sendWelcomeEmail(user.email);
  }
  
  // Log analytics event
  await admin.analytics().logEvent('new_user_created', {
    userId: user.uid,
    method: user.providerData[0]?.providerId || 'email',
  });
});
```

```typescript
// functions/src/checkSubscriptions.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Run daily to check subscription expiry
export const checkSubscriptions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    // Find expired subscriptions
    const expiredSubs = await admin.firestore()
      .collection('users')
      .where('subscription', '==', 'pro')
      .where('subscriptionExpiry', '<=', now)
      .get();
    
    // Update expired subscriptions
    const batch = admin.firestore().batch();
    expiredSubs.forEach((doc) => {
      batch.update(doc.ref, {
        subscription: 'free',
        subscriptionExpiry: null,
        subscriptionEndedAt: now,
      });
    });
    
    await batch.commit();
    
    console.log(`Updated ${expiredSubs.size} expired subscriptions`);
  });
```

### 3.3 Environment Configuration

```bash
# Set environment variables
firebase functions:config:set \
  apple.password="YOUR_APPLE_SHARED_SECRET" \
  stripe.secret_key="sk_live_xxx" \
  sendgrid.api_key="SG.xxx"

# View config
firebase functions:config:get

# Deploy functions
firebase deploy --only functions
```

---

## 4. App Configuration

### 4.1 Install Packages

```bash
# Install Firebase packages
npm install @react-native-firebase/app@^21.0.0
npm install @react-native-firebase/auth@^21.0.0
npm install @react-native-firebase/firestore@^21.0.0
npm install @react-native-firebase/analytics@^21.0.0
npm install @react-native-firebase/crashlytics@^21.0.0
npm install @react-native-firebase/remote-config@^21.0.0

# iOS specific
cd ios && pod install
```

### 4.2 Initialize Firebase in App

```typescript
// src/services/firebase/init.ts
import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import remoteConfig from '@react-native-firebase/remote-config';

export const initializeFirebase = async () => {
  try {
    // Enable offline persistence
    await firestore().settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });
    
    // Set up remote config defaults
    await remoteConfig().setDefaults({
      privacy_policy_url: 'https://myaifriends.app/privacy',
      terms_of_service_url: 'https://myaifriends.app/terms',
      minimum_app_version: '1.0.0',
      maintenance_mode: false,
    });
    
    // Fetch and activate remote config
    await remoteConfig().fetchAndActivate();
    
    // Enable analytics collection
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Enable Crashlytics
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};
```

---

## 5. Google Sign-In Setup

### 5.1 iOS Configuration

1. Get `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`
2. Add to Info.plist:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

### 5.2 Android Configuration

1. Add SHA-1 certificates to Firebase Console
2. Configure in `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        manifestPlaceholders = [
            appAuthRedirectScheme: 'com.braveheart.myaifriends'
        ]
    }
}
```

### 5.3 Initialize Google Sign-In

```typescript
// src/services/auth/google.ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: 'YOUR_WEB_CLIENT_ID', // From Firebase Console
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};
```

---

## 6. Apple Sign-In Setup

### 6.1 Apple Developer Console

1. Go to [Apple Developer](https://developer.apple.com)
2. Identifiers → Your App ID → Sign In with Apple → Enable
3. Keys → Create new key → Sign in with Apple → Enable

### 6.2 Firebase Console

1. Authentication → Sign-in method → Apple → Enable
2. Add Service ID (from Apple Developer)
3. Add Team ID
4. Add Key ID and Private Key

### 6.3 Xcode Configuration

1. Signing & Capabilities → + Capability
2. Add "Sign in with Apple"
3. Ensure provisioning profile includes the capability

---

## 7. Testing

### 7.1 Local Development

```bash
# Run with Firebase Emulators
firebase emulators:start

# In your app, connect to emulators
if (__DEV__) {
  auth().useEmulator('http://localhost:9099');
  firestore().useEmulator('localhost', 8080);
}
```

### 7.2 Test Accounts

Create test users in Firebase Console:
- Authentication → Users → Add user
- Create users with different subscription levels
- Test upgrade/downgrade flows

### 7.3 Monitor in Firebase Console

- **Authentication**: View sign-ups, providers
- **Firestore**: Browse user documents
- **Functions**: View logs and errors
- **Analytics**: Track events and conversions
- **Crashlytics**: Monitor crashes

---

## 8. Production Checklist

### Before Launch

- [ ] Production Firebase project created
- [ ] Security rules reviewed and tested
- [ ] Functions deployed to production
- [ ] SHA-1 certificates added (Android)
- [ ] Bundle ID configured (iOS)
- [ ] Remote Config values set
- [ ] Analytics events defined
- [ ] Crashlytics enabled
- [ ] Backup and export configured

### Monitoring

- Set up Firebase Alerts for:
  - Authentication errors
  - Function failures
  - High Firestore usage
  - Crashlytics issues
  
- Configure budget alerts:
  - Set monthly budget in Google Cloud Console
  - Configure alerts at 50%, 90%, 100%

---

## 9. Cost Management

### Estimated Monthly Costs

| Service | Free Tier | Paid Usage | Est. Cost (10K users) |
|---------|-----------|------------|----------------------|
| Authentication | 10K/month | $0.06/1K | $0 |
| Firestore Reads | 50K/day | $0.06/100K | $2 |
| Firestore Writes | 20K/day | $0.18/100K | $1 |
| Cloud Functions | 2M invocations | $0.40/1M | $0.50 |
| Storage | 5GB | $0.026/GB | $0 |
| **Total** | | | **~$3.50/month** |

### Cost Optimization Tips

1. Use Firestore offline persistence
2. Batch writes when possible
3. Cache remote config values
4. Use Firebase Analytics (free)
5. Monitor usage in Google Cloud Console

---

## 10. Troubleshooting

### Common Issues

**Issue**: "No Firebase App has been initialized"  
**Solution**: Ensure Firebase is initialized before using any services

**Issue**: Google Sign-In not working  
**Solution**: Verify SHA-1 certificates in Firebase Console

**Issue**: Firestore permission denied  
**Solution**: Check security rules and user authentication

**Issue**: Functions not deploying  
**Solution**: Ensure you're on Blaze plan and have billing enabled

---

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io)
- [Firebase Status](https://status.firebase.google.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

---

*For project-specific questions: team@braveheart-innovations.com*