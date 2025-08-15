# APIConfigScreen Refactoring Plan

## Executive Summary
The APIConfigScreen.tsx file is a 478-line component that violates atomic design principles by mixing UI presentation, business logic, state management, and API interactions. This document provides a comprehensive plan to refactor it into a maintainable, testable, and scalable architecture following the established patterns from ChatScreen and HistoryScreen refactoring.

## Current State Analysis

### File Statistics
- **Lines of Code**: 478 lines
- **Responsibilities**: 12+ distinct concerns mixed together
- **Business Logic**: ~200 lines mixed with UI code
- **Direct Redux Usage**: Heavy coupling throughout
- **State Management**: 6 separate useState hooks for related data

### Complete Functionality Inventory

#### Core API Key Management
1. **API Key Input & Storage**
   - Text input for each provider
   - Masked display of saved keys
   - Edit/view toggle functionality
   - Secure storage via secureStorage service
   - Redux state synchronization

2. **Connection Testing**
   - Async API validation
   - Loading states during testing
   - Success/failure status tracking
   - Auto-save on successful test
   - Verification timestamp tracking

3. **Provider Verification System**
   - Verified providers list in Redux
   - Verification timestamps
   - Time-based status messages ("Verified X mins ago")
   - Auto-removal on key deletion

#### Premium Features Management
4. **Expert Mode Controls**
   - Premium-only feature gating
   - Model selection per provider
   - Parameter customization
   - Settings persistence in Redux
   - Default parameter reset

5. **Subscription Status Integration**
   - Premium user detection
   - Feature availability based on subscription
   - Visual indicators for premium features
   - Development override (TODO: Remove for production)

#### UI Features
6. **Progress Tracking**
   - Visual progress bar with gradient
   - Configured providers count
   - Percentage calculation
   - Contextual status messages

7. **Provider Cards**
   - Expandable/collapsible interface
   - Provider branding (icon, gradient)
   - Feature badges display
   - Connection status indicators
   - Pricing information display

8. **Security Information**
   - Security notes section
   - Encryption information display
   - Privacy assurances
   - Clear data policy

#### Data Management
9. **State Synchronization**
   - Local state for immediate UI updates
   - Redux state for persistence
   - Secure storage for sensitive data
   - Effect-based sync between layers

10. **Batch Operations**
    - Clear all keys functionality
    - Confirmation dialogs
    - Haptic feedback
    - Success notifications

#### Navigation & Layout
11. **Custom Header**
    - Back navigation
    - Centered title
    - Consistent styling

12. **Responsive Layout**
    - KeyboardAvoidingView for iOS
    - ScrollView for long content
    - Proper spacing and padding
    - Platform-specific adjustments

### Architectural Problems

#### 1. Separation of Concerns Violations
- API testing logic mixed with UI components
- State management scattered throughout
- Business logic (verification, formatting) in render methods
- Direct secure storage access from component

#### 2. State Management Issues
- Multiple related useState hooks that should be combined
- Redundant state between local and Redux
- Complex state synchronization logic
- No clear state ownership boundaries

#### 3. Component Complexity
- Single component handling 12+ responsibilities
- 478 lines in one file
- Complex conditional rendering
- Inline styles mixed with theme usage

#### 4. Business Logic Problems
- Time formatting logic embedded in component
- API testing logic directly in component
- Provider verification logic scattered
- Expert mode configuration mixed with UI

#### 5. Testing Challenges
- Cannot test API connection logic in isolation
- Heavy mocking required for Redux and storage
- UI and business logic tightly coupled
- No unit testable modules

#### 6. Performance Concerns
- Unnecessary re-renders on state changes
- All logic runs on every render
- No memoization of expensive operations
- Heavy computations in render path

#### 7. Type Safety Issues
- Loose typing with any/unknown in places
- Type assertions that could be avoided
- Missing proper TypeScript interfaces
- Incomplete type coverage

## Proposed Architecture

### Design Principles
1. **Atomic Design** - Clear hierarchy: atoms → molecules → organisms
2. **Single Responsibility** - Each module handles one concern
3. **Dependency Injection** - Services and hooks for testability
4. **React Native Best Practices** - Proper hook usage, memoization
5. **Type Safety** - Full TypeScript coverage with strict types

### Layer Architecture

```
screens/
├── APIConfigScreen.tsx (Container - 120 lines max)
│
hooks/apiconfig/
├── useAPIKeys.ts (API key state management)
├── useProviderVerification.ts (Verification logic)
├── useExpertMode.ts (Expert mode settings)
├── useConnectionTest.ts (API testing)
├── useSubscriptionStatus.ts (Premium features)
│
services/apiconfig/
├── APIKeyService.ts (Key storage/retrieval)
├── ConnectionTestService.ts (API validation)
├── VerificationService.ts (Provider verification)
├── TimeFormatterService.ts (Date/time utilities)
│
components/organisms/apiconfig/
├── APIConfigHeader.tsx
├── APIConfigProgress.tsx
├── APIProviderList.tsx
├── APISecurityNote.tsx
├── APIComingSoon.tsx
│
components/molecules/apiconfig/
├── APIKeyInput.tsx
├── ConnectionStatus.tsx
├── ProgressBar.tsx
├── ClearKeysButton.tsx
├── ProviderFeatures.tsx
│
utils/apiconfig/
├── keyFormatters.ts
├── progressCalculators.ts
├── verificationHelpers.ts
├── subscriptionCheckers.ts
```

### Module Responsibilities

#### 1. APIConfigScreen.tsx (Container Component)
```typescript
// ~120 lines
- Route parameter extraction
- Hook composition
- Layout structure
- Component orchestration
- NO business logic
- NO direct storage/Redux access
```

#### 2. Custom Hooks (hooks/apiconfig/)

**useAPIKeys.ts**
```typescript
// API key management
- Load keys from storage
- Save keys to storage
- Key masking/unmasking
- Edit state management
- Sync with Redux
```

**useProviderVerification.ts**
```typescript
// Provider verification logic
- Verification status tracking
- Timestamp management
- Status message formatting
- Redux integration
```

**useExpertMode.ts**
```typescript
// Expert mode settings
- Model selection state
- Parameter management
- Settings persistence
- Premium feature gating
```

**useConnectionTest.ts**
```typescript
// API connection testing
- Test execution
- Status tracking
- Result handling
- Auto-save on success
- Error management
```

**useSubscriptionStatus.ts**
```typescript
// Premium feature management
- Subscription detection
- Feature availability
- Development overrides
- Premium UI states
```

#### 3. Services (services/apiconfig/)

**APIKeyService.ts**
```typescript
// Secure key management
class APIKeyService {
  - saveKey()
  - loadKeys()
  - deleteKey()
  - clearAllKeys()
  - validateKey()
  - maskKey()
}
```

**ConnectionTestService.ts**
```typescript
// API validation logic
class ConnectionTestService {
  - testProvider()
  - validateResponse()
  - getModelInfo()
  - handleError()
  - mockTest() // For development
}
```

**VerificationService.ts**
```typescript
// Provider verification
class VerificationService {
  - verifyProvider()
  - updateTimestamp()
  - getVerificationStatus()
  - formatVerificationTime()
  - clearVerification()
}
```

**TimeFormatterService.ts**
```typescript
// Time formatting utilities
class TimeFormatterService {
  - formatRelativeTime()
  - formatTimestamp()
  - getTimeDifference()
  - formatDuration()
}
```

#### 4. UI Components (components/organisms/apiconfig/)

**APIConfigHeader.tsx**
```typescript
// Header component
interface Props {
  onBack: () => void;
  title: string;
}
- Back button
- Title display
- Consistent styling
```

**APIConfigProgress.tsx**
```typescript
// Progress tracking component
interface Props {
  configuredCount: number;
  totalCount: number;
  onClearAll: () => void;
}
- Progress bar
- Status message
- Clear all button
- Animation
```

**APIProviderList.tsx**
```typescript
// Provider list container
interface Props {
  providers: AIProvider[];
  apiKeys: Record<string, string>;
  verificationStatus: Record<string, VerificationStatus>;
  onKeyChange: (providerId: string, key: string) => void;
  onTest: (providerId: string) => void;
  onToggleExpand: (providerId: string) => void;
  expandedProvider: string | null;
  expertModeConfigs: Record<string, ExpertModeConfig>;
  isPremium: boolean;
}
- Provider card rendering
- Expansion management
- Expert mode integration
```

**APISecurityNote.tsx**
```typescript
// Security information display
interface Props {
  theme: Theme;
}
- Security bullet points
- Styled container
- Icon display
```

**APIComingSoon.tsx**
```typescript
// Coming soon section
interface Props {
  providers: AIProvider[];
  theme: Theme;
}
- Disabled provider list
- Visual styling
- Icon display
```

#### 5. UI Components (components/molecules/apiconfig/)

**APIKeyInput.tsx**
```typescript
// API key input field
interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  hasError: boolean;
}
- Text input
- Mask/unmask toggle
- Error state
- Secure entry
```

**ConnectionStatus.tsx**
```typescript
// Connection status display
interface Props {
  status: 'idle' | 'testing' | 'success' | 'failed';
  message?: string;
  model?: string;
}
- Status icon
- Message display
- Loading state
- Color coding
```

**ProgressBar.tsx**
```typescript
// Progress bar component
interface Props {
  percentage: number;
  colors: string[];
}
- Gradient display
- Animation
- Responsive width
```

**ClearKeysButton.tsx**
```typescript
// Clear all keys button
interface Props {
  onPress: () => void;
  isVisible: boolean;
}
- Confirmation dialog
- Haptic feedback
- Styled button
```

**ProviderFeatures.tsx**
```typescript
// Provider feature badges
interface Props {
  features: string[];
  theme: Theme;
}
- Feature list
- Badge styling
- Responsive layout
```

### Data Flow Architecture

```
User Action → Hook → Service → Storage/Redux
                ↓
           Component ← Hook ← Processed Data
```

1. User enters API key → `useAPIKeys` → `APIKeyService.saveKey()` → SecureStorage
2. User tests connection → `useConnectionTest` → `ConnectionTestService.testProvider()` → API
3. Test succeeds → `useProviderVerification` → `VerificationService.verifyProvider()` → Redux
4. Redux updates → Hooks re-render → Components update

### State Management Strategy

#### Global State (Redux)
- API keys (encrypted references)
- Verified providers list
- Verification timestamps
- Expert mode configurations
- User subscription status

#### Local State (Hooks)
- Editing states (useAPIKeys)
- Test statuses (useConnectionTest)
- Expanded provider (UI only)
- Local key values (before save)

#### Derived State
- Progress percentage
- Enabled providers
- Verification messages
- Feature availability

## Migration Plan

### Phase 1: Extract Services (Foundation Layer)
**Goal**: Create service layer without breaking functionality

1. Create `services/apiconfig/` directory
2. Implement `APIKeyService.ts`:
   - Move secure storage operations
   - Add key validation
   - Add masking logic
3. Implement `ConnectionTestService.ts`:
   - Extract test logic
   - Add provider-specific testing
   - Mock for development
4. Implement `VerificationService.ts`:
   - Move verification logic
   - Time formatting
   - Status management
5. Implement `TimeFormatterService.ts`:
   - Extract time utilities
   - Add localization support

**Testing**: Verify all storage operations work identically

### Phase 2: Extract Custom Hooks (Logic Layer)
**Goal**: Create reusable hooks using services

1. Create `hooks/apiconfig/` directory
2. Implement `useAPIKeys.ts`:
   - Move key management logic
   - Use APIKeyService
   - Handle sync with Redux
3. Implement `useProviderVerification.ts`:
   - Move verification logic
   - Use VerificationService
   - Redux integration
4. Implement `useExpertMode.ts`:
   - Extract expert mode logic
   - Settings persistence
   - Premium gating
5. Implement `useConnectionTest.ts`:
   - Move test execution
   - Use ConnectionTestService
   - Status management
6. Implement `useSubscriptionStatus.ts`:
   - Extract subscription logic
   - Development overrides
   - Feature flags

**Testing**: Test each hook in isolation with mock data

### Phase 3: Extract Molecules (Small Components)
**Goal**: Create reusable UI building blocks

1. Create `components/molecules/apiconfig/` directory
2. Extract `APIKeyInput.tsx`:
   - Move input field logic
   - Add proper types
3. Extract `ConnectionStatus.tsx`:
   - Status display logic
   - Loading states
4. Extract `ProgressBar.tsx`:
   - Gradient progress bar
   - Animation
5. Extract `ClearKeysButton.tsx`:
   - Clear functionality
   - Confirmation dialog
6. Extract `ProviderFeatures.tsx`:
   - Feature badge display
   - Responsive layout

**Testing**: Snapshot tests for each molecule

### Phase 4: Extract Organisms (Complex Components)
**Goal**: Create high-level UI components

1. Create `components/organisms/apiconfig/` directory
2. Extract `APIConfigHeader.tsx`:
   - Header layout
   - Navigation
3. Extract `APIConfigProgress.tsx`:
   - Progress tracking
   - Clear all integration
4. Extract `APIProviderList.tsx`:
   - Provider cards
   - Expansion logic
   - Expert mode integration
5. Extract `APISecurityNote.tsx`:
   - Security information
   - Styled container
6. Extract `APIComingSoon.tsx`:
   - Coming soon section
   - Provider list

**Testing**: Integration tests for user interactions

### Phase 5: Refactor APIConfigScreen (Final Integration)
**Goal**: Transform APIConfigScreen into clean container

1. Update APIConfigScreen to use all hooks
2. Replace inline JSX with extracted components
3. Remove all business logic
4. Clean up imports
5. Add comprehensive TypeScript types
6. Document the new structure

**Final structure**:
```typescript
const APIConfigScreen: React.FC<APIConfigScreenProps> = ({ navigation }) => {
  // Compose hooks
  const { apiKeys, updateKey, clearAll } = useAPIKeys();
  const { verificationStatus, verifyProvider } = useProviderVerification();
  const { testConnection, testStatus } = useConnectionTest();
  const { expertConfigs, updateExpertMode } = useExpertMode();
  const { isPremium } = useSubscriptionStatus();
  
  // UI state
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  
  // Calculated values
  const enabledProviders = getEnabledProviders();
  const configuredCount = calculateConfiguredCount(apiKeys, enabledProviders);
  
  // Render clean component tree
  return (
    <Box style={{ flex: 1 }} backgroundColor="background">
      <SafeAreaView style={{ flex: 1 }}>
        <APIConfigHeader 
          onBack={navigation.goBack}
          title="API Configuration"
        />
        
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView>
            <APIConfigProgress
              configuredCount={configuredCount}
              totalCount={enabledProviders.length}
              onClearAll={clearAll}
            />
            
            <APIProviderList
              providers={enabledProviders}
              apiKeys={apiKeys}
              verificationStatus={verificationStatus}
              onKeyChange={updateKey}
              onTest={testConnection}
              onToggleExpand={setExpandedProvider}
              expandedProvider={expandedProvider}
              expertModeConfigs={expertConfigs}
              isPremium={isPremium}
            />
            
            <APIComingSoon 
              providers={AI_PROVIDERS.filter(p => !p.enabled)}
            />
            
            <APISecurityNote />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
};
```

### Phase 6: Add Tests (Quality Assurance)
**Goal**: Comprehensive test coverage

1. **Unit Tests for Services**:
   - APIKeyService tests
   - ConnectionTestService tests
   - VerificationService tests
   - TimeFormatterService tests

2. **Hook Tests**:
   - useAPIKeys with mock storage
   - useProviderVerification with mock Redux
   - useConnectionTest with mock API
   - useExpertMode with settings
   - useSubscriptionStatus with user data

3. **Component Tests**:
   - Snapshot tests for all components
   - Interaction tests for user actions
   - Accessibility tests

4. **Integration Tests**:
   - Full flow from key entry to verification
   - Expert mode configuration flow
   - Clear all keys flow

## Risk Mitigation

### Critical Risks & Mitigations

1. **Risk**: Breaking secure storage operations
   - **Mitigation**: Extract APIKeyService first with comprehensive tests
   - **Validation**: Verify keys persist and decrypt correctly

2. **Risk**: Breaking API connection testing
   - **Mitigation**: Keep mock testing for development
   - **Validation**: Test with each provider's actual API

3. **Risk**: Breaking expert mode settings
   - **Mitigation**: Careful extraction of Redux operations
   - **Validation**: Verify settings persist across sessions

4. **Risk**: Performance degradation
   - **Mitigation**: Use React.memo and useMemo appropriately
   - **Validation**: Profile before and after

5. **Risk**: Breaking TypeScript compilation
   - **Mitigation**: Refactor incrementally with type checks
   - **Validation**: Zero TypeScript errors throughout

### Rollback Strategy

Each phase is independently deployable:
1. Git commit after each successful phase
2. Tag each phase completion
3. Create feature branch for refactoring
4. Keep old APIConfigScreen.tsx until Phase 5
5. A/B test if needed

## Success Metrics

### Code Quality Metrics
- ✅ APIConfigScreen.tsx reduced from 478 to ~120 lines
- ✅ 12+ separate modules with single responsibilities
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ 80%+ test coverage

### Functionality Metrics
- ✅ All 12 features working identically
- ✅ API key persistence intact
- ✅ Connection testing functional
- ✅ Expert mode settings preserved
- ✅ Performance same or better

### Developer Experience Metrics
- ✅ New features easily addable
- ✅ Bugs fixable without side effects
- ✅ Code self-documenting
- ✅ Onboarding time reduced by 50%
- ✅ Easy to write tests

### Performance Metrics
- ✅ Initial load time < 300ms
- ✅ Connection test < 2s
- ✅ Smooth animations
- ✅ No unnecessary re-renders

## Implementation Timeline

### Estimated Duration: 1.5 Days

**Day 1 Morning**: Phase 1-2 (Services & Hooks)
- Extract service layer
- Create custom hooks
- Integration testing

**Day 1 Afternoon**: Phase 3-4 (Components)
- Extract molecules
- Extract organisms
- Component testing

**Day 2 Morning**: Phase 5-6 (Integration & Tests)
- Refactor main screen
- Write comprehensive tests
- Documentation

## Post-Refactoring Improvements

Once refactoring is complete, these features become easy to add:

1. **Provider Groups** - New feature
   - Group providers by category
   - Bulk operations per group
   - Visual grouping in UI

2. **API Key Import/Export** - New service
   - Export keys for backup
   - Import from file
   - Migration between devices

3. **Connection Health Monitoring** - New hook
   - Periodic health checks
   - Status dashboard
   - Alert on failures

4. **Usage Analytics** - New service
   - Track API usage per provider
   - Cost estimation
   - Usage graphs

5. **Advanced Testing** - Enhancement
   - Test with actual prompts
   - Response time measurement
   - Model capability testing

6. **Key Rotation** - New feature
   - Automatic key rotation
   - Expiry tracking
   - Renewal reminders

7. **Provider Recommendations** - New feature
   - Suggest providers based on usage
   - Cost optimization tips
   - Feature comparisons

## Component Specifications

### APIProviderList Component
```typescript
interface APIProviderListProps {
  providers: AIProvider[];
  apiKeys: Record<string, string>;
  verificationStatus: Record<string, VerificationStatus>;
  onKeyChange: (providerId: string, key: string) => void;
  onTest: (providerId: string) => void;
  onToggleExpand: (providerId: string) => void;
  expandedProvider: string | null;
  expertModeConfigs: Record<string, ExpertModeConfig>;
  isPremium: boolean;
  testID?: string;
}

// Features:
- Animated provider cards
- Expansion management
- Expert mode integration
- Status indicators
- Haptic feedback
- Accessibility labels
```

### useAPIKeys Hook
```typescript
interface UseAPIKeysReturn {
  apiKeys: Record<string, string>;
  updateKey: (providerId: string, key: string) => Promise<void>;
  deleteKey: (providerId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// Features:
- Secure storage integration
- Redux synchronization
- Error handling
- Loading states
- Validation
```

### ConnectionTestService
```typescript
class ConnectionTestService {
  async testProvider(
    providerId: string, 
    apiKey: string
  ): Promise<TestResult> {
    // Provider-specific testing logic
    // Mock mode for development
    // Timeout handling
    // Error categorization
  }
}

interface TestResult {
  success: boolean;
  message: string;
  model?: string;
  responseTime?: number;
  error?: TestError;
}
```

## Atomic Design Alignment

This refactoring follows the established atomic design patterns:

### Atoms (Pure Wrappers)
- Using existing `Box` component for layout
- No new atoms needed (following established pattern)

### Molecules (Simple Combinations)
- `APIKeyInput` - Input field with edit toggle
- `ConnectionStatus` - Status display with icon
- `ProgressBar` - Visual progress indicator
- `ClearKeysButton` - Button with confirmation
- `ProviderFeatures` - Feature badge list

### Organisms (Complex Business Logic)
- `APIConfigHeader` - Navigation header
- `APIConfigProgress` - Progress tracking with actions
- `APIProviderList` - Provider management
- `APISecurityNote` - Information display
- `APIComingSoon` - Future providers section
- Existing `ProviderCard` and `ProviderExpertSettings` remain

## Conclusion

This refactoring plan transforms the APIConfigScreen from a monolithic 478-line component into a clean, maintainable architecture following atomic design principles and React Native best practices. The phased approach ensures we can validate at each step without breaking the app.

The resulting architecture will be:

- **Maintainable**: Clear separation of concerns with single-responsibility modules
- **Testable**: Isolated units with dependency injection
- **Scalable**: Easy to add new features like health monitoring or analytics
- **Performant**: Optimized rendering with proper memoization
- **Standards-compliant**: Follows React Native and community best practices
- **Type-safe**: Full TypeScript coverage with strict validation
- **Consistent**: Aligns with ChatScreen and HistoryScreen refactoring patterns

Most importantly, this refactoring maintains 100% feature parity while setting up the codebase for future enhancements like provider groups, usage analytics, and advanced testing capabilities.