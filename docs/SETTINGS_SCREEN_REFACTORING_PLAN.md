# SettingsScreen Refactoring Plan

## Executive Summary
The SettingsScreen.tsx file is a 161-line component that mixes UI presentation with business logic, state management, and navigation. While not as complex as ChatScreen or HistoryScreen, it still violates several React Native architectural principles. This document provides a comprehensive plan to refactor it into a maintainable, testable, and scalable architecture following atomic design principles and React Native community standards.

## Current State Analysis

### File Statistics
- **Lines of Code**: 161 lines
- **Responsibilities**: 8+ distinct concerns mixed together
- **Inline Styles**: Multiple inline style objects
- **Business Logic**: Settings management mixed with UI
- **Direct Redux Usage**: Dispatch and selector calls throughout

### Complete Functionality Inventory

#### Core Settings Features
1. **Theme Management**
   - Dark mode toggle
   - Theme persistence
   - Real-time theme switching
   - Visual feedback via Switch component

2. **API Configuration Navigation**
   - Navigation to API Config screen
   - Visual button with active opacity
   - Styled with theme colors

3. **Subscription Management**
   - Display current subscription tier
   - Conditional upgrade button for free users
   - Navigation to Subscription screen (future)
   - Visual distinction between free/pro

4. **User Authentication**
   - Sign out functionality
   - Redux logout dispatch
   - Clear user session
   - Visual error-colored button

5. **App Information**
   - Version display
   - About section
   - Brand messaging

#### UI Features
6. **Animated Sections**
   - Staggered entrance animations
   - Spring animations for each section
   - Delayed fade-in effects

7. **Layout Structure**
   - Safe area handling
   - ScrollView for content overflow
   - Consistent padding and spacing
   - Card-based section design

8. **Visual Feedback**
   - Touch opacity for buttons
   - Switch component for toggles
   - Shadow effects on cards
   - Color-coded actions (error for logout)

### Architectural Problems

#### 1. Separation of Concerns Violations
- UI components directly dispatch Redux actions
- Settings logic embedded in component
- Navigation logic mixed with presentation
- No service layer for settings management

#### 2. Component Complexity
- Single component handling multiple responsibilities
- Inline styles reducing readability
- Mixed use of Typography and raw Text components
- No component composition pattern

#### 3. State Management Issues
- Direct Redux dispatch without abstraction
- No local state management hooks
- Theme switching logic in UI component
- Missing settings persistence layer

#### 4. Type Safety Issues
- Weak navigation typing
- Missing prop validation
- Incomplete interface definitions
- No strict type checking for settings

#### 5. Testing Challenges
- Cannot test settings logic in isolation
- Redux mocking required
- Navigation mocking required
- Theme context mocking required

#### 6. Maintainability Issues
- Hard to add new settings sections
- Inline styles difficult to maintain
- No reusable setting item components
- Inconsistent component usage (Text vs Typography)

#### 7. Performance Concerns
- All animations render regardless of visibility
- No memoization of settings items
- Unnecessary re-renders on theme changes
- Missing optimization for static content

#### 8. Accessibility Issues
- Missing accessibility labels
- No screen reader support
- Missing role attributes
- No keyboard navigation support

## Proposed Architecture

### Design Principles
1. **Atomic Design** - Clear component hierarchy (atoms → molecules → organisms)
2. **Single Responsibility** - Each module handles one concern
3. **Composition Pattern** - Build complex UI from simple components
4. **React Native Best Practices** - Proper hook usage, performance optimizations
5. **Type Safety** - Full TypeScript coverage with strict mode
6. **Accessibility First** - WCAG compliance for all components

### Layer Architecture

```
screens/
├── SettingsScreen.tsx (Container - 80 lines max)
│
hooks/settings/
├── useSettings.ts (Settings state management)
├── useThemeSettings.ts (Theme-specific logic)
├── useSubscriptionSettings.ts (Subscription logic)
├── useAuthSettings.ts (Authentication actions)
│
services/settings/
├── SettingsService.ts (Settings persistence)
├── ThemeService.ts (Theme management)
├── SubscriptionService.ts (Subscription handling)
│
components/organisms/settings/
├── SettingsHeader.tsx
├── SettingsSection.tsx
├── SettingsList.tsx
│
components/molecules/settings/
├── SettingItem.tsx
├── SettingSwitch.tsx
├── SettingButton.tsx
├── SettingCard.tsx
├── SubscriptionCard.tsx
├── AppInfoCard.tsx
│
components/atoms/settings/
├── SettingLabel.tsx
├── SettingValue.tsx
├── SettingIcon.tsx
│
utils/settings/
├── settingsConstants.ts
├── settingsValidators.ts
├── settingsFormatters.ts
```

### Module Responsibilities

#### 1. SettingsScreen.tsx (Container Component)
```typescript
// ~80 lines
- Hook composition
- Layout structure
- Component orchestration
- NO business logic
- NO direct Redux usage
- NO inline styles
```

#### 2. Custom Hooks (hooks/settings/)

**useSettings.ts**
```typescript
// Core settings management
- Load user settings
- Save settings changes
- Settings state management
- Persistence coordination
```

**useThemeSettings.ts**
```typescript
// Theme-specific settings
- Theme mode state
- Theme switching logic
- Theme persistence
- System theme detection (future)
```

**useSubscriptionSettings.ts**
```typescript
// Subscription management
- Current subscription state
- Upgrade flow initiation
- Subscription status checks
- Premium feature flags
```

**useAuthSettings.ts**
```typescript
// Authentication actions
- Sign out logic
- Session cleanup
- User state management
- Confirmation dialogs
```

#### 3. Services (services/settings/)

**SettingsService.ts**
```typescript
// Settings persistence and management
class SettingsService {
  - loadSettings()
  - saveSettings()
  - resetSettings()
  - migrateSettings()
  - validateSettings()
  - exportSettings()
  - importSettings()
}
```

**ThemeService.ts**
```typescript
// Theme management service
class ThemeService {
  - getCurrentTheme()
  - setTheme()
  - getSystemTheme()
  - persistTheme()
  - loadSavedTheme()
}
```

**SubscriptionService.ts**
```typescript
// Subscription handling
class SubscriptionService {
  - getCurrentPlan()
  - checkPremiumStatus()
  - initiatePurchase()
  - restorePurchases()
  - validateSubscription()
}
```

#### 4. UI Components (components/organisms/settings/)

**SettingsHeader.tsx**
```typescript
// Settings screen header
interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}
- Title display
- Optional back button
- Consistent styling
```

**SettingsSection.tsx**
```typescript
// Grouped settings section
interface Props {
  title: string;
  children: React.ReactNode;
  animationDelay?: number;
}
- Section title
- Children container
- Animation wrapper
- Consistent spacing
```

**SettingsList.tsx**
```typescript
// List of setting items
interface Props {
  sections: SettingSection[];
  onItemPress: (item: SettingItem) => void;
}
- Section rendering
- Item interaction
- Scroll management
```

#### 5. UI Components (components/molecules/settings/)

**SettingItem.tsx**
```typescript
// Individual setting row
interface Props {
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  testID?: string;
}
- Label and description
- Optional value display
- Touch handling
- Accessibility support
```

**SettingSwitch.tsx**
```typescript
// Switch setting component
interface Props {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}
- Switch integration
- Label display
- State management
- Haptic feedback
```

**SettingButton.tsx**
```typescript
// Button setting component
interface Props {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}
- Button styling
- Loading state
- Disabled state
- Touch feedback
```

**SettingCard.tsx**
```typescript
// Card container for settings
interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}
- Card styling
- Shadow effects
- Touch handling
- Theme integration
```

**SubscriptionCard.tsx**
```typescript
// Subscription status card
interface Props {
  plan: 'free' | 'pro' | 'business';
  onUpgrade?: () => void;
  features?: string[];
}
- Plan display
- Upgrade button
- Feature list
- Premium badge
```

**AppInfoCard.tsx**
```typescript
// App information card
interface Props {
  version: string;
  buildNumber?: string;
  additionalInfo?: string;
}
- Version display
- Build information
- Brand messaging
- Links (future)
```

#### 6. UI Components (components/atoms/settings/)

**SettingLabel.tsx**
```typescript
// Setting label text
interface Props {
  text: string;
  variant?: 'primary' | 'secondary';
  weight?: 'regular' | 'semibold' | 'bold';
}
- Consistent typography
- Theme integration
- Accessibility
```

**SettingValue.tsx**
```typescript
// Setting value display
interface Props {
  value: string | number;
  type?: 'text' | 'number' | 'badge';
}
- Value formatting
- Type-based styling
- Theme colors
```

**SettingIcon.tsx**
```typescript
// Setting icon component
interface Props {
  name: string;
  size?: number;
  color?: string;
}
- Icon rendering
- Consistent sizing
- Theme integration
```

### Data Flow Architecture

```
User Action → Hook → Service → Storage/Redux
                ↓
           Component ← Hook ← State Update
```

1. User toggles dark mode → `useThemeSettings` → `ThemeService.setTheme()` → AsyncStorage
2. User taps API Config → `navigation.navigate()` → Navigation stack
3. User taps Sign Out → `useAuthSettings` → `SettingsService.logout()` → Redux dispatch
4. Theme updates → Hooks re-render → Components update

### State Management Strategy

#### Global State (Redux)
- User authentication state
- Current subscription tier
- API keys (via settings slice)

#### Context State (Theme)
- Current theme mode
- Theme colors and styles
- System theme preference

#### Local State (Hooks)
- Loading states
- Error states
- Temporary UI states

#### Persistent State (AsyncStorage)
- Theme preference
- User preferences
- Settings cache

### Performance Optimizations

1. **Component Memoization**
   - React.memo for static components
   - useMemo for expensive computations
   - useCallback for event handlers

2. **Animation Optimization**
   - Lazy load animations
   - Use native driver
   - Conditional animation rendering

3. **Render Optimization**
   - Virtual list for long settings
   - Lazy component loading
   - Prevent unnecessary re-renders

### Accessibility Improvements

1. **Screen Reader Support**
   - Proper accessibility labels
   - Role attributes
   - Heading hierarchy

2. **Keyboard Navigation**
   - Tab order management
   - Focus indicators
   - Keyboard shortcuts

3. **Visual Accessibility**
   - High contrast support
   - Text scaling support
   - Motion preferences

## Migration Plan

### Phase 1: Extract Services (Foundation Layer)
**Goal**: Create service layer without breaking existing functionality

1. Create `services/settings/` directory
2. Implement `SettingsService.ts`:
   - Move settings logic
   - Add persistence methods
   - Add validation
3. Implement `ThemeService.ts`:
   - Extract theme logic
   - Add system theme detection
   - Theme persistence
4. Implement `SubscriptionService.ts`:
   - Subscription status logic
   - Purchase flow preparation

**Testing**: Verify all settings operations work identically

### Phase 2: Extract Custom Hooks (Logic Layer)
**Goal**: Create reusable hooks using services

1. Create `hooks/settings/` directory
2. Implement `useSettings.ts`:
   - General settings management
   - Use SettingsService
3. Implement `useThemeSettings.ts`:
   - Theme-specific logic
   - Use ThemeService
4. Implement `useSubscriptionSettings.ts`:
   - Subscription management
   - Use SubscriptionService
5. Implement `useAuthSettings.ts`:
   - Authentication actions
   - Logout flow

**Testing**: Test each hook in isolation

### Phase 3: Create Atoms (Basic Building Blocks)
**Goal**: Create atomic components for settings

1. Create `components/atoms/settings/` directory
2. Implement `SettingLabel.tsx`:
   - Typography wrapper
   - Consistent styling
3. Implement `SettingValue.tsx`:
   - Value display component
   - Type-based formatting
4. Implement `SettingIcon.tsx`:
   - Icon wrapper
   - Theme integration

**Testing**: Snapshot tests for each atom

### Phase 4: Create Molecules (Composite Components)
**Goal**: Build reusable setting components

1. Create `components/molecules/settings/` directory
2. Implement `SettingItem.tsx`:
   - Generic setting row
   - Composition of atoms
3. Implement `SettingSwitch.tsx`:
   - Switch setting variant
   - State management
4. Implement `SettingButton.tsx`:
   - Button setting variant
   - Action handling
5. Implement `SettingCard.tsx`:
   - Card container
   - Shadow and styling
6. Implement `SubscriptionCard.tsx`:
   - Subscription display
   - Upgrade flow
7. Implement `AppInfoCard.tsx`:
   - App information
   - Version display

**Testing**: Component tests with user interactions

### Phase 5: Create Organisms (Complex Components)
**Goal**: Build high-level setting components

1. Create `components/organisms/settings/` directory
2. Implement `SettingsHeader.tsx`:
   - Screen header
   - Navigation integration
3. Implement `SettingsSection.tsx`:
   - Section container
   - Animation wrapper
4. Implement `SettingsList.tsx`:
   - Settings list manager
   - Section rendering

**Testing**: Integration tests for organisms

### Phase 6: Refactor SettingsScreen (Final Integration)
**Goal**: Transform SettingsScreen into clean container

1. Update SettingsScreen to use all hooks
2. Replace inline JSX with extracted components
3. Remove all business logic
4. Remove inline styles
5. Add comprehensive TypeScript types
6. Add accessibility attributes

**Final structure**:
```typescript
const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // Compose hooks
  const settings = useSettings();
  const theme = useThemeSettings();
  const subscription = useSubscriptionSettings();
  const auth = useAuthSettings();
  
  // Define settings sections
  const sections = [
    {
      title: 'Appearance',
      items: [
        {
          type: 'switch',
          label: 'Dark Mode',
          description: 'Easier on the eyes at night',
          value: theme.isDark,
          onChange: theme.toggleDarkMode,
        },
      ],
    },
    {
      title: 'API Configuration',
      items: [
        {
          type: 'button',
          label: 'Manage API Keys',
          onPress: () => navigation.navigate('APIConfig'),
        },
      ],
    },
    {
      title: 'Subscription',
      items: [
        {
          type: 'custom',
          component: (
            <SubscriptionCard
              plan={subscription.currentPlan}
              onUpgrade={() => navigation.navigate('Subscription')}
            />
          ),
        },
      ],
    },
  ];
  
  // Render clean component tree
  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader title="Settings" />
      <SettingsList
        sections={sections}
        footer={
          <>
            <AppInfoCard version="1.0.0" />
            <SettingButton
              label="Sign Out"
              variant="danger"
              onPress={auth.signOut}
            />
          </>
        }
      />
    </SafeAreaView>
  );
};
```

### Phase 7: Add Tests (Quality Assurance)
**Goal**: Comprehensive test coverage

1. **Unit Tests for Services**:
   - SettingsService tests
   - ThemeService tests
   - SubscriptionService tests

2. **Hook Tests**:
   - useSettings with mock service
   - useThemeSettings with mock context
   - useSubscriptionSettings with mock data
   - useAuthSettings with mock navigation

3. **Component Tests**:
   - Snapshot tests for all components
   - Interaction tests for buttons/switches
   - Accessibility tests
   - Animation tests

4. **Integration Tests**:
   - Full settings flow
   - Theme switching
   - Sign out flow
   - Navigation tests

## Risk Mitigation

### Critical Risks & Mitigations

1. **Risk**: Breaking theme switching
   - **Mitigation**: Extract ThemeService carefully with tests
   - **Validation**: Test theme persistence and real-time updates

2. **Risk**: Breaking sign out flow
   - **Mitigation**: Keep Redux dispatch logic intact during extraction
   - **Validation**: Test complete logout process

3. **Risk**: Breaking navigation
   - **Mitigation**: Maintain navigation prop structure
   - **Validation**: Test all navigation paths

4. **Risk**: Performance degradation from animations
   - **Mitigation**: Use native driver, lazy load animations
   - **Validation**: Profile before and after

5. **Risk**: Accessibility regression
   - **Mitigation**: Add accessibility attributes progressively
   - **Validation**: Screen reader testing

### Rollback Strategy

Each phase is independently deployable:
1. Git commit after each successful phase
2. Tag each phase completion
3. Create feature branch for refactoring
4. Keep old SettingsScreen.tsx until Phase 6 complete
5. A/B test if needed

## Success Metrics

### Code Quality Metrics
- ✅ SettingsScreen.tsx reduced from 161 to ~80 lines
- ✅ 15+ separate modules with single responsibilities
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ 80%+ test coverage
- ✅ No inline styles

### Functionality Metrics
- ✅ All 8 features working identically
- ✅ Theme switching instant and persistent
- ✅ Sign out clears all data properly
- ✅ Navigation works correctly
- ✅ Animations smooth and performant

### Developer Experience Metrics
- ✅ New settings easily addable
- ✅ Consistent component patterns
- ✅ Self-documenting code
- ✅ Onboarding time reduced by 50%
- ✅ Easy to write and maintain tests

### Accessibility Metrics
- ✅ Screen reader compatible
- ✅ Keyboard navigable
- ✅ WCAG 2.1 AA compliant
- ✅ Focus indicators present
- ✅ Proper heading hierarchy

### Performance Metrics
- ✅ Initial render < 100ms
- ✅ Theme switch < 50ms
- ✅ Smooth 60fps animations
- ✅ No unnecessary re-renders
- ✅ Memory usage optimized

## Implementation Timeline

### Estimated Duration: 1.5 Days

**Day 1 Morning**: Foundation (Phases 1-2)
- Extract services
- Create custom hooks
- Initial testing

**Day 1 Afternoon**: Components (Phases 3-5)
- Create atoms and molecules
- Build organisms
- Component testing

**Day 2 Morning**: Integration (Phase 6-7)
- Refactor SettingsScreen
- Add comprehensive tests
- Documentation

## Post-Refactoring Improvements

Once refactoring is complete, these features become easy to add:

1. **Advanced Settings** - New sections
   - Notification preferences
   - Privacy settings
   - Data management
   - Language selection

2. **Profile Management** - New organism
   - Avatar upload
   - Display name editing
   - Bio/description
   - Social links

3. **Backup & Restore** - New service
   - Settings export
   - Settings import
   - Cloud backup
   - Cross-device sync

4. **Developer Options** - New section
   - Debug mode
   - Performance metrics
   - Cache management
   - Log export

5. **Accessibility Settings** - Enhanced support
   - Font size adjustment
   - High contrast mode
   - Motion preferences
   - Screen reader options

6. **Theme Customization** - Extended theming
   - Custom color schemes
   - Font selection
   - Layout density
   - Icon packs

7. **Security Settings** - New features
   - Biometric authentication
   - PIN/password lock
   - Auto-lock timeout
   - Security audit

8. **Data Usage** - Analytics section
   - API usage stats
   - Storage usage
   - Network statistics
   - Cost tracking

## Component Specifications

### SettingItem Component
```typescript
interface SettingItemProps {
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  leftIcon?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Features:
- Flexible layout with icon support
- Touch feedback with haptics
- Disabled state styling
- Accessibility attributes
- Theme-aware colors
- Consistent padding
```

### SettingSwitch Component
```typescript
interface SettingSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

// Features:
- Native Switch integration
- Loading state support
- Haptic feedback on toggle
- Accessibility support
- Theme-based colors
- Smooth animations
```

### SubscriptionCard Component
```typescript
interface SubscriptionCardProps {
  plan: 'free' | 'pro' | 'business';
  expiresAt?: Date;
  onUpgrade?: () => void;
  onManage?: () => void;
  features?: string[];
  loading?: boolean;
  testID?: string;
}

// Features:
- Plan badge display
- Expiration date formatting
- Feature list
- Action buttons
- Loading skeleton
- Premium styling
- Gradient backgrounds
```

### useThemeSettings Hook
```typescript
interface UseThemeSettingsReturn {
  isDark: boolean;
  theme: Theme;
  toggleDarkMode: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  systemThemePreference: 'light' | 'dark' | null;
  isLoading: boolean;
}

// Features:
- Theme state management
- Persistence to AsyncStorage
- System theme detection
- Real-time updates
- Loading states
- Error handling
```

## Conclusion

This refactoring plan transforms the SettingsScreen from a 161-line monolithic component into a clean, maintainable architecture following atomic design principles and React Native community standards. The phased approach ensures we can validate at each step without breaking the app.

The resulting architecture will be:

- **Maintainable**: Clear separation of concerns with single-responsibility modules
- **Testable**: Isolated units with dependency injection
- **Scalable**: Easy to add new settings and features
- **Performant**: Optimized rendering with proper memoization
- **Accessible**: Full screen reader and keyboard support
- **Standards-compliant**: Follows React Native and community best practices
- **Type-safe**: Full TypeScript coverage with strict validation
- **Consistent**: Reusable components following atomic design

Most importantly, this refactoring maintains 100% feature parity while setting up the codebase for future enhancements like profile management, advanced settings, and security features. The modular architecture makes it trivial to add new setting types and sections without touching existing code.