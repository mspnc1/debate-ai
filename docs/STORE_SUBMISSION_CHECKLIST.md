# Store Submission Checklist
## MyAIFriends React Native App

*Last Updated: August 2025*

---

## Pre-Submission Requirements

### Business Requirements
- [ ] Apple Developer Account ($99/year) - Active
- [ ] Google Play Developer Account ($25 one-time) - Active  
- [ ] D-U-N-S Number (for organization accounts)
- [ ] Business verification completed
- [ ] Tax information submitted
- [ ] Banking information configured

### Legal Documents
- [ ] Privacy Policy URL: `https://myaifriends.app/privacy`
- [ ] Terms of Service URL: `https://myaifriends.app/terms`
- [ ] EULA (if different from Apple's standard)
- [ ] Copyright documentation
- [ ] Third-party licenses documented

---

## App Store Submission (iOS)

### 1. App Information

#### Basic Information
- [ ] App Name: `MyAIFriends` (30 characters max)
- [ ] Subtitle: `Your AI Conversation Hub` (30 characters max)
- [ ] Primary Category: `Productivity`
- [ ] Secondary Category: `Utilities`
- [ ] Bundle ID: `com.braveheart.myaifriends`

#### Age Rating
- [ ] Complete age rating questionnaire
- [ ] Expected rating: 12+ (Infrequent/Mild Profanity or Crude Humor)
- [ ] No gambling content
- [ ] No unrestricted web access

### 2. Version Information

#### What's New (Version 1.0.0)
```
Welcome to MyAIFriends!

• Chat with multiple AI providers simultaneously
• BYOK: Use your own API keys securely
• Hallucination Shield: AIs fact-check each other
• AI Debate Arena: Watch AIs debate topics
• 12 unique personalities per AI
• Expert Mode for advanced users
• Beautiful light/dark themes
• Premium features with subscription

Your API keys stay private and secure on your device.
```

#### Version Details
- [ ] Version Number: `1.0.0`
- [ ] Build Number: `1`
- [ ] Copyright: `© 2025 Braveheart Innovations LLC`

### 3. App Preview and Screenshots

#### Screenshots Required (6.7", 6.5", 5.5")
1. [ ] Welcome screen showing key features
2. [ ] Chat interface with multiple AIs
3. [ ] AI Debate in action
4. [ ] Personality selection screen
5. [ ] Expert mode with model selection
6. [ ] Premium upgrade screen

#### App Preview Video (Optional but Recommended)
- [ ] 15-30 seconds
- [ ] Show key features in action
- [ ] No pricing information in video
- [ ] Proper aspect ratio for each device size

### 4. In-App Purchases

#### Subscription Configuration
- [ ] Product approved: `Premium Monthly ($9.99)`
- [ ] Subscription group configured
- [ ] Localized descriptions added
- [ ] Screenshot of purchase screen uploaded
- [ ] Auto-renewal disclosure included

#### Required Text
```
MyAIFriends Premium - $9.99/month

Payment will be charged to your Apple ID account at confirmation of purchase. 
Subscription automatically renews unless it is canceled at least 24 hours before 
the end of the current period. Your account will be charged for renewal within 
24 hours prior to the end of the current period. You can manage and cancel your 
subscriptions by going to your account settings on the App Store after purchase.

Privacy Policy: https://myaifriends.app/privacy
Terms of Service: https://myaifriends.app/terms
```

### 5. App Review Information

#### Review Notes
```
Test Account Credentials:
Email: reviewer@myaifriends.app
Password: ReviewTest2025!

To test premium features:
1. Sign in with test account
2. Navigate to Settings → Upgrade to Premium
3. Use sandbox account for purchase testing

API Keys for Testing:
The app uses BYOK (Bring Your Own Keys). Test API keys are pre-configured 
in the test account. Users normally add their own API keys from providers 
like OpenAI, Anthropic, or Google.

Key Features to Review:
- Multi-AI chat functionality
- AI Debate Arena (premium feature)
- Personality switching
- Expert mode with model selection
```

#### Contact Information
- [ ] First Name: `Michael`
- [ ] Last Name: `Spencer`
- [ ] Phone: `+1 (555) 123-4567`
- [ ] Email: `support@braveheart-innovations.com`

#### Demo Account
- [ ] Username: `reviewer@myaifriends.app`
- [ ] Password: `ReviewTest2025!`
- [ ] Notes: Explain BYOK concept and test keys

### 6. Build Preparation

#### Xcode Configuration
- [ ] Bundle ID matches App Store Connect
- [ ] Version and build number updated
- [ ] Deployment target: iOS 13.0+
- [ ] Device support: iPhone only (initially)
- [ ] Architectures: arm64

#### Capabilities
- [ ] Sign in with Apple enabled
- [ ] Push Notifications (for future)
- [ ] In-App Purchase enabled

#### Code Signing
- [ ] Distribution certificate valid
- [ ] Provisioning profile: App Store Distribution
- [ ] Entitlements file configured correctly

### 7. Build Upload

#### Archive Creation
```bash
# Clean build folder
rm -rf ~/Library/Developer/Xcode/DerivedData

# Archive from Xcode
Product → Archive

# Or via command line
xcodebuild -workspace ios/MyAIFriends.xcworkspace \
  -scheme MyAIFriends \
  -configuration Release \
  -archivePath build/MyAIFriends.xcarchive \
  archive
```

#### Upload to App Store Connect
- [ ] Validate archive first
- [ ] Upload with Xcode or Transporter
- [ ] Wait for processing (5-10 minutes)
- [ ] Check for any warnings/errors

### 8. TestFlight

#### Internal Testing
- [ ] Add internal testers (up to 100)
- [ ] No review required
- [ ] Test core functionality
- [ ] Test IAP with sandbox accounts

#### External Testing (Beta)
- [ ] Add external testers (up to 10,000)
- [ ] Requires beta app review
- [ ] Collect feedback via TestFlight
- [ ] Monitor crash reports

### 9. App Store Optimization (ASO)

#### Keywords (100 characters)
```
ai,chat,gpt,claude,gemini,chatbot,conversation,debate,api,keys,byok,multi,premium
```

#### Promotional Text (170 characters)
```
Special Launch Offer! Get 7 days free trial of Premium. Chat with multiple AIs at once, watch them debate, and unlock 12 personalities. Your API keys stay secure!
```

### 10. Final Submission

#### Submission Checklist
- [ ] All metadata complete
- [ ] Screenshots uploaded for all sizes
- [ ] Build selected and attached
- [ ] Pricing and availability configured
- [ ] App review information complete
- [ ] Export compliance info provided
- [ ] Submit for review

#### Expected Review Time
- Standard: 24-48 hours (as of 2025)
- Expedited: 6-12 hours (use sparingly)

---

## Google Play Submission (Android)

### 1. Store Listing

#### Product Details
- [ ] App name: `MyAIFriends`
- [ ] Short description (80 chars): `Chat with multiple AIs simultaneously using your own API keys`
- [ ] Full description (4000 chars max):
```
MyAIFriends is the ultimate AI conversation platform that lets you chat with 
multiple AI providers at once using your own API keys.

KEY FEATURES:
🔑 BYOK (Bring Your Own Keys) - Use your existing API keys from OpenAI, 
   Anthropic, Google, and more
🛡️ Hallucination Shield - Multiple AIs fact-check each other in real-time
⚔️ AI Debate Arena - Watch different AIs debate topics
👥 Group Chat - Talk with multiple AIs simultaneously
🎭 12 Personalities - From Comedian to Philosopher
⚙️ Expert Mode - Choose specific models and parameters

PREMIUM FEATURES ($9.99/month):
• Unlimited AIs in group chats
• Create debates on any topic
• All personalities unlocked
• Expert mode with full control
• Priority support

WHY MYAIFRIENDS?
- Save money: Use API pricing instead of multiple $20/month subscriptions
- Privacy first: Your API keys never leave your device
- Flexibility: Switch between AIs mid-conversation
- Comparison: See how different AIs respond to the same prompt

SUPPORTED PROVIDERS:
• OpenAI (ChatGPT)
• Anthropic (Claude)
• Google (Gemini)
• And more coming soon!

Download now and experience the future of AI conversations!
```

#### Categorization
- [ ] Category: `Productivity`
- [ ] Content rating: `Everyone 10+`
- [ ] Target audience: `18+`
- [ ] Contains ads: `No`
- [ ] In-app purchases: `Yes`

### 2. Graphics Assets

#### Required Images
- [ ] App icon: 512x512px PNG
- [ ] Feature graphic: 1024x500px
- [ ] Phone screenshots: 2-8 images (1080x1920 or similar)
- [ ] Tablet screenshots: Optional (if supporting tablets)

#### Screenshot Requirements
1. [ ] Welcome/onboarding screen
2. [ ] Multi-AI chat interface
3. [ ] AI Debate feature
4. [ ] Personality selection
5. [ ] Premium features overview
6. [ ] Settings/API configuration

### 3. Content Rating

#### Questionnaire Answers
- [ ] Violence: None
- [ ] Sexual content: None
- [ ] Profanity: Mild (AI responses may vary)
- [ ] Controlled substance: None
- [ ] User interaction: Yes (AI chat)
- [ ] Personal info sharing: No
- [ ] Location sharing: No

Expected Rating: `Everyone 10+`

### 4. Pricing & Distribution

#### Countries
- [ ] Available in all countries except embargoed
- [ ] Specific exclusions: None

#### Pricing
- [ ] App: Free
- [ ] In-app purchases: Yes
- [ ] Premium subscription: $9.99/month

#### Device Categories
- [ ] Phone: Yes
- [ ] Tablet: Yes (responsive)
- [ ] Wear OS: No
- [ ] Android TV: No
- [ ] Android Auto: No

### 5. Build Preparation

#### Android Configuration
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        applicationId "com.braveheart.myaifriends"
        minSdkVersion 23
        targetSdkVersion 35
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            storeFile file('myaifriends-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
}
```

#### Generate Signed Bundle
```bash
# Clean build
cd android && ./gradlew clean

# Generate AAB (Android App Bundle)
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 6. Release Management

#### Production Release
- [ ] Upload AAB file
- [ ] Release name: `Version 1.0.0`
- [ ] Release notes (same as What's New)
- [ ] Rollout percentage: Start at 10%

#### Staged Rollout
1. [ ] 10% for 24 hours
2. [ ] 25% for 24 hours
3. [ ] 50% for 24 hours
4. [ ] 100% if no issues

### 7. Google Play Console Settings

#### Store Settings
- [ ] Developer account verified
- [ ] Developer email public
- [ ] Support email configured
- [ ] Privacy policy URL added
- [ ] Terms of service URL added

#### Advanced Settings
- [ ] Managed publishing: Off (initially)
- [ ] App signing by Google Play: Enabled
- [ ] Android App Bundle: Required

### 8. Pre-Launch Report

#### Automated Testing
- [ ] Review pre-launch report
- [ ] Fix any crashes detected
- [ ] Address accessibility issues
- [ ] Resolve performance warnings
- [ ] Check screenshot issues

### 9. Review Process

#### Expected Timeline
- Initial review: 2-3 hours (as of 2025)
- Updates: Usually within 1 hour

#### Common Rejection Reasons
- Missing privacy policy
- Incorrect permissions usage
- Subscription terms not clear
- Misleading claims
- Policy violations

---

## Post-Submission

### Monitoring

#### Day 1-3
- [ ] Monitor crash reports
- [ ] Check user reviews
- [ ] Respond to support emails
- [ ] Track installation metrics
- [ ] Monitor subscription conversions

#### Week 1
- [ ] Analyze user feedback
- [ ] Plan first update
- [ ] Address critical bugs
- [ ] Optimize store listing
- [ ] A/B test screenshots

### Marketing

#### Launch Activities
- [ ] Press release prepared
- [ ] Social media announcements
- [ ] Email to beta testers
- [ ] Product Hunt submission
- [ ] Reddit announcements

#### App Store Features
- [ ] Request featuring (App Store)
- [ ] Apply for Editor's Choice
- [ ] Submit for collections
- [ ] Seasonal promotions

### Updates

#### Version 1.0.1 Planning
- [ ] Bug fixes from user feedback
- [ ] Performance improvements
- [ ] Minor UI enhancements
- [ ] Additional error handling

#### Review Response Template
```
Thank you for your feedback! We're constantly working to improve MyAIFriends. 
If you have specific issues or suggestions, please email us at 
support@myaifriends.app. We'd love to help!
```

---

## Emergency Procedures

### Critical Bug After Release

1. **Immediate Actions**
   - [ ] Assess severity and impact
   - [ ] Prepare hotfix
   - [ ] Test thoroughly
   - [ ] Submit expedited review (if needed)

2. **Communication**
   - [ ] Update app description with known issues
   - [ ] Email affected users
   - [ ] Post on social media
   - [ ] Respond to reviews

### Subscription Issues

1. **User Can't Purchase**
   - Check store configuration
   - Verify product IDs
   - Test with new account
   - Contact store support

2. **Receipt Validation Failing**
   - Check server logs
   - Verify certificates/keys
   - Test with sandbox
   - Implement fallback

---

## Contact Information

### Store Support
- **Apple**: developer.apple.com/contact
- **Google**: support.google.com/googleplay/android-developer

### Internal Contacts
- **Technical Lead**: tech@braveheart-innovations.com
- **Marketing**: marketing@braveheart-innovations.com
- **Support**: support@myaifriends.app

---

## Final Pre-Submission Verification

### Technical Checklist
- [ ] No debug code in production
- [ ] API endpoints pointing to production
- [ ] Analytics configured correctly
- [ ] Crash reporting enabled
- [ ] All console.logs removed
- [ ] Performance optimized

### Legal Checklist
- [ ] All licenses documented
- [ ] No copyright violations
- [ ] GDPR compliant
- [ ] CCPA compliant
- [ ] COPPA compliant (if applicable)

### Business Checklist
- [ ] Support system ready
- [ ] Documentation complete
- [ ] Team briefed on launch
- [ ] Monitoring tools configured
- [ ] Backup plans in place

---

*Ready for submission? Take a deep breath and hit that submit button! 🚀*

*For urgent support during submission: team@braveheart-innovations.com*