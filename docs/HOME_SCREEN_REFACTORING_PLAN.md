# HomeScreen Refactoring Plan

## Executive Summary
The HomeScreen.tsx file, while more manageable than ChatScreen at 173 lines, still violates key React Native architectural principles by mixing business logic with presentation, containing hardcoded data, and lacking proper separation of concerns. This document provides a comprehensive plan to refactor it into a maintainable, testable, and scalable architecture following the successful ChatScreen refactoring model.

## Current State Analysis

### File Statistics
- **Lines of Code**: 173 lines
- **Responsibilities**: 15+ distinct concerns mixed together
- **Inline Data**: Quick Start topics hardcoded in component
- **Business Logic**: ~50 lines mixed with UI code
- **Direct Redux Usage**: Multiple dispatch calls and selectors throughout
- **State Management**: Mix of local and global state without clear boundaries

### Complete Functionality Inventory

#### Core Session Management
1. **Session Initialization**
   - Generate unique session IDs with timestamp
   - Dispatch startSession action to Redux
   - Pass selected AIs to session
   - Pass AI personalities to session
   - Navigate to Chat screen with session ID

2. **AI Selection Management**
   - Toggle AI selection (add/remove from selected list)
   - Enforce maximum AI limit (2 for free, unlimited for premium)
   - Track selected AIs in local state
   - Visual feedback for selected state
   - Disable deselection when minimum not met

3. **AI Configuration Detection**
   - Filter AI providers by enabled status
   - Check for API key presence
   - Map provider data to AIConfig format
   - Include icon data and types
   - Maintain backwards compatibility with avatar field

#### User Interface Features
4. **Dynamic Greeting System**
   - Time-based greeting (morning/afternoon/evening)
   - Personalized welcome with user email
   - Extract username from email (before @)
   - Fallback for anonymous users

5. **Premium Status Management**
   - Check user subscription level (pro/business)
   - TODO: Remove hardcoded premium override for production
   - Apply premium features conditionally
   - Enforce AI selection limits based on tier

6. **Quick Start Functionality**
   - Display 6 predefined conversation topics
   - Each topic has emoji, title, and subtitle
   - Disabled state when no AIs selected
   - Trigger prompt wizard on selection
   - Pass selected topic to wizard

#### Navigation & Flow
7. **Prompt Wizard Integration**
   - Show/hide wizard modal
   - Pass selected topic to wizard
   - Receive user and enriched prompts
   - Auto-navigate to chat with prompts
   - Set autoSend flag for immediate sending

8. **Navigation Handling**
   - Navigate to Chat screen with parameters
   - Navigate to APIConfig for adding AIs
   - Pass session ID to Chat screen
   - Pass Quick Start prompts and autoSend flag
   - Maintain navigation state

#### AI Personality System
9. **Personality Management**
   - Track AI personalities in Redux
   - Update personality per AI
   - Dispatch setAIPersonality action
   - Pass personalities to DynamicAISelector
   - Include personalities in session start

#### Data Management
10. **Redux Integration**
    - Select current user from store
    - Select API keys from settings
    - Select AI personalities from chat
    - Dispatch session actions
    - Dispatch personality updates

11. **Local State Management**
    - Selected AIs array
    - Selected Quick Start topic
    - Prompt wizard visibility
    - Component-specific UI state

#### Component Composition
12. **Child Component Orchestration**
    - GradientHeader with dynamic content
    - DynamicAISelector with all AI logic
    - QuickStartsSection with topics
    - PromptWizard modal overlay
    - SafeAreaView layout container

#### Configuration & Data
13. **AI Provider Processing**
    - Import AI_PROVIDERS configuration
    - Transform providers to AIConfig
    - Get provider icons with type info
    - Map provider colors
    - Filter by availability

14. **Quick Start Topics Data**
    - 6 hardcoded conversation starters
    - Morning check-in topic
    - Brainstorming topic
    - Learning topic
    - Creative writing topic
    - Problem solving topic
    - Entertainment topic

#### Event Handlers
15. **User Interaction Handlers**
    - handleToggleAI for selection
    - handleStartChat for session creation
    - handlePersonalityChange for AI customization
    - handleSelectTopic for Quick Start
    - handleCompleteWizard for prompt processing

### Architectural Problems

#### 1. Data Management Issues
- Quick Start topics hardcoded in component
- Configuration data mixed with UI logic
- No clear data layer separation
- Inline data transformations

#### 2. Business Logic Violations
- Session creation logic in UI component
- AI configuration filtering in component
- Premium logic calculation inline
- Greeting logic embedded in render

#### 3. State Management Confusion
- Local state for data that could be derived
- Redux state accessed directly throughout
- No clear state ownership boundaries
- Mix of controlled and uncontrolled state

#### 4. Component Responsibility Overload
- UI presentation mixed with business logic
- Navigation logic embedded in component
- Data fetching and transformation inline
- Event handling without abstraction

#### 5. Testing Impediments
- Cannot test business logic in isolation
- UI coupled to Redux structure
- Hard to mock dependencies
- No clear module boundaries

#### 6. Maintainability Concerns
- Adding features requires modifying core component
- Changes risk breaking unrelated functionality
- No separation between layers
- Difficult to understand data flow

#### 7. Code Organization Problems
- No clear module structure
- Helper functions mixed with components
- Configuration data in wrong location
- Missing abstraction layers

## Proposed Architecture

### Design Principles
1. **Separation of Concerns** - Each module has a single, clear responsibility
2. **Data Layer Abstraction** - Separate data from presentation
3. **Hook Composition** - Leverage custom hooks for logic reuse
4. **Service Orientation** - Business logic in dedicated services
5. **Configuration Management** - Centralized, typed configuration
6. **React Native Best Practices** - Follow community standards

### Layer Architecture

```
screens/
├── HomeScreen.tsx (Container - 100 lines max)
│
hooks/home/
├── useSessionManagement.ts (Session lifecycle)
├── useAISelection.ts (AI selection logic)
├── useQuickStart.ts (Quick Start features)
├── usePremiumFeatures.ts (Premium status)
├── useGreeting.ts (Dynamic greeting)
│
services/home/
├── SessionService.ts (Session business logic)
├── AIConfigurationService.ts (AI setup)
├── QuickStartService.ts (Topic management)
├── NavigationService.ts (Navigation logic)
│
components/organisms/home/
├── HomeHeader.tsx (Extracted from current)
├── AISelectionSection.tsx (Wrapper for DynamicAISelector)
├── QuickStartSection.tsx (Enhanced current)
│
config/
├── quickStartTopics.ts (Extracted data)
├── homeConstants.ts (Constants and limits)
│
utils/home/
├── greetingGenerator.ts (Greeting logic)
├── sessionIdGenerator.ts (ID generation)
├── emailParser.ts (Email utilities)
```

### Module Responsibilities

#### 1. HomeScreen.tsx (Container Component)
```typescript
// ~100 lines maximum
- Route parameter handling
- Hook composition
- Layout structure
- Component orchestration
- NO business logic
- NO data transformation
```

#### 2. Custom Hooks (hooks/home/)

**useSessionManagement.ts**
```typescript
// Manages session lifecycle
- Session creation
- Session ID generation
- Session persistence
- Redux session dispatch
- Session validation
```

**useAISelection.ts**
```typescript
// AI selection logic
- Toggle AI selection
- Enforce selection limits
- Track selected AIs
- Validate selection
- Premium limit handling
```

**useQuickStart.ts**
```typescript
// Quick Start features
- Topic selection
- Wizard visibility
- Prompt handling
- Auto-navigation
- Topic validation
```

**usePremiumFeatures.ts**
```typescript
// Premium status management
- Check subscription status
- Calculate feature limits
- Premium feature flags
- Tier validation
- TODO: Remove dev override
```

**useGreeting.ts**
```typescript
// Dynamic greeting generation
- Time-based greeting
- User personalization
- Email parsing
- Fallback handling
```

#### 3. Services (services/home/)

**SessionService.ts**
```typescript
// Core session business logic
class SessionService {
  - createSession(ais, personalities)
  - generateSessionId()
  - validateSession()
  - prepareSessionData()
  - calculateSessionLimits()
}
```

**AIConfigurationService.ts**
```typescript
// AI configuration management
class AIConfigurationService {
  - getConfiguredAIs(apiKeys)
  - transformProviderToConfig()
  - validateAIAvailability()
  - checkAPIKeyPresence()
  - mapIconData()
}
```

**QuickStartService.ts**
```typescript
// Quick Start topic management
class QuickStartService {
  - getTopics()
  - validateTopicSelection()
  - preparePromptData()
  - enrichPromptForTopic()
}
```

**NavigationService.ts**
```typescript
// Navigation orchestration
class NavigationService {
  - navigateToChat(params)
  - navigateToAPIConfig()
  - prepareNavigationParams()
  - validateNavigation()
}
```

#### 4. Configuration (config/)

**quickStartTopics.ts**
```typescript
// Extracted Quick Start topics
export const QUICK_START_TOPICS: QuickStartTopic[] = [
  { id: 'morning', emoji: '☀️', title: 'Morning Check-in', subtitle: 'Start your day right' },
  { id: 'brainstorm', emoji: '💡', title: 'Brainstorming', subtitle: 'Generate fresh ideas' },
  // ... etc
];

// Topic enrichment prompts
export const TOPIC_PROMPTS: Record<string, string> = {
  morning: "Let's start with a positive morning check-in...",
  brainstorm: "I need help brainstorming ideas about...",
  // ... etc
};
```

**homeConstants.ts**
```typescript
// Home screen constants
export const HOME_CONSTANTS = {
  MAX_FREE_AIS: 2,
  MIN_AIS_FOR_CHAT: 1,
  SESSION_ID_PREFIX: 'session_',
  GREETING_TIMES: {
    MORNING_END: 12,
    AFTERNOON_END: 17,
  },
};
```

#### 5. Utilities (utils/home/)

**greetingGenerator.ts**
```typescript
// Greeting generation logic
export const generateGreeting = (hour?: number): string => {
  const currentHour = hour ?? new Date().getHours();
  if (currentHour < 12) return 'Good morning';
  if (currentHour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const personalizeGreeting = (email?: string): string => {
  if (!email) return 'Welcome back!';
  const username = extractUsername(email);
  return `Welcome back, ${username}!`;
};
```

**sessionIdGenerator.ts**
```typescript
// Session ID utilities
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const validateSessionId = (id: string): boolean => {
  return /^session_\d+_[a-z0-9]+$/.test(id);
};
```

**emailParser.ts**
```typescript
// Email parsing utilities
export const extractUsername = (email: string): string => {
  return email.split('@')[0];
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

### Data Flow Architecture

```
User Action → Hook → Service → Redux/Navigation
                ↓
           Component ← Hook ← Redux State
```

1. User selects AI → `useAISelection` → Updates local state
2. User starts chat → `useSessionManagement` → `SessionService` → Redux → Navigation
3. User selects topic → `useQuickStart` → `QuickStartService` → Show wizard
4. Wizard completes → `useSessionManagement` → Navigate with params
5. Redux updates → Hooks re-render → Components update

### State Management Strategy

#### Global State (Redux)
- Current user
- API keys
- AI personalities
- Active sessions
- Premium status

#### Local State (Hooks)
- Selected AIs (useAISelection)
- Selected topic (useQuickStart)
- Wizard visibility (useQuickStart)
- UI-only state

#### Derived State
- Configured AIs (from API keys)
- Max AI limit (from premium status)
- Greeting text (from time and user)
- Button states (from selections)

## Migration Plan

### Phase 1: Extract Configuration & Utilities (No Breaking Changes)
**Goal**: Extract data and utilities without changing behavior

1. Create `config/` directory structure:
   - Move Quick Start topics to `quickStartTopics.ts`
   - Create `homeConstants.ts` for constants
   - Add proper TypeScript exports

2. Create `utils/home/` directory:
   - Implement `greetingGenerator.ts`
   - Implement `sessionIdGenerator.ts`
   - Implement `emailParser.ts`
   - Add unit tests for each utility

3. Update HomeScreen to import from new locations:
   - Import topics from config
   - Use utility functions
   - Verify no behavior changes

**Testing**: Ensure all features work identically

### Phase 2: Extract Services (Business Logic Separation)
**Goal**: Move business logic to dedicated services

1. Create `services/home/` directory

2. Implement `SessionService.ts`:
   - Move session creation logic
   - Move ID generation
   - Add session validation

3. Implement `AIConfigurationService.ts`:
   - Move AI filtering logic
   - Move provider transformation
   - Add configuration validation

4. Implement `QuickStartService.ts`:
   - Move topic management
   - Add prompt enrichment
   - Add topic validation

5. Implement `NavigationService.ts`:
   - Move navigation parameter building
   - Add navigation validation

**Testing**: Verify services work with existing component

### Phase 3: Extract Custom Hooks (Logic Abstraction)
**Goal**: Create reusable hooks using services

1. Create `hooks/home/` directory

2. Implement `useSessionManagement.ts`:
   - Use SessionService
   - Handle Redux dispatch
   - Manage session lifecycle

3. Implement `useAISelection.ts`:
   - Track selected AIs
   - Use AIConfigurationService
   - Handle selection limits

4. Implement `useQuickStart.ts`:
   - Manage topic selection
   - Control wizard visibility
   - Use QuickStartService

5. Implement `usePremiumFeatures.ts`:
   - Check subscription status
   - Calculate limits
   - Provide feature flags

6. Implement `useGreeting.ts`:
   - Generate dynamic greeting
   - Use greetingGenerator utility
   - Handle personalization

**Testing**: Test each hook in isolation

### Phase 4: Refactor HomeScreen (Final Integration)
**Goal**: Transform HomeScreen into clean container

1. Update HomeScreen to use all hooks
2. Remove all business logic
3. Remove inline data transformations
4. Clean up imports
5. Simplify component structure

**Final structure**:
```typescript
const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  
  // Compose hooks
  const greeting = useGreeting();
  const premium = usePremiumFeatures();
  const aiSelection = useAISelection(premium.maxAIs);
  const session = useSessionManagement();
  const quickStart = useQuickStart();
  
  // Handle events using hook methods
  const handleStartChat = () => {
    const sessionId = session.create(aiSelection.selected);
    navigation.navigate('Chat', { sessionId });
  };
  
  const handleQuickStartComplete = (userPrompt: string, enrichedPrompt: string) => {
    const sessionId = session.create(aiSelection.selected);
    navigation.navigate('Chat', {
      sessionId,
      initialPrompt: enrichedPrompt,
      userPrompt,
      autoSend: true,
    });
  };
  
  // Render clean component tree
  return (
    <SafeAreaView style={styles.container}>
      <GradientHeader
        title={greeting.timeBasedGreeting}
        subtitle={greeting.personalizedWelcome}
      />
      
      <ScrollView>
        <AISelectionSection
          {...aiSelection}
          isPremium={premium.isPremium}
          onStartChat={handleStartChat}
          onAddAI={() => navigation.navigate('APIConfig')}
        />
        
        <QuickStartsSection
          topics={quickStart.topics}
          onSelectTopic={quickStart.selectTopic}
          disabled={!aiSelection.hasSelection}
        />
      </ScrollView>
      
      <PromptWizard
        visible={quickStart.showWizard}
        topic={quickStart.selectedTopic}
        onClose={quickStart.closeWizard}
        onComplete={handleQuickStartComplete}
      />
    </SafeAreaView>
  );
};
```

### Phase 5: Add Tests & Documentation (Quality Assurance)
**Goal**: Comprehensive test coverage and documentation

1. **Unit Tests for Services**:
   - SessionService tests
   - AIConfigurationService tests
   - QuickStartService tests
   - NavigationService tests

2. **Unit Tests for Utilities**:
   - greetingGenerator tests
   - sessionIdGenerator tests
   - emailParser tests

3. **Hook Tests**:
   - Test each hook with mocked dependencies
   - Test state changes
   - Test edge cases

4. **Integration Tests**:
   - Full flow from AI selection to chat
   - Quick Start flow
   - Premium feature flows

5. **Documentation**:
   - Update component documentation
   - Add JSDoc comments
   - Create architecture diagram

## Risk Mitigation

### Critical Risks & Mitigations

1. **Risk**: Breaking session creation flow
   - **Mitigation**: Extract SessionService carefully with extensive tests
   - **Validation**: Test session creation with multiple AI combinations

2. **Risk**: Breaking Quick Start auto-send
   - **Mitigation**: Preserve exact navigation parameters
   - **Validation**: Test all Quick Start topics end-to-end

3. **Risk**: Breaking premium feature detection
   - **Mitigation**: Keep TODO comment about dev override
   - **Validation**: Test with different subscription levels

4. **Risk**: Breaking AI configuration detection
   - **Mitigation**: Careful service extraction with unit tests
   - **Validation**: Test with various API key configurations

5. **Risk**: Performance degradation
   - **Mitigation**: Use useMemo for expensive computations
   - **Validation**: Profile before and after refactoring

### Rollback Strategy

Each phase is independently deployable:
1. Git commit after each successful phase
2. Tag each phase completion
3. Can revert to any phase
4. Keep old code until Phase 4 complete

## Success Metrics

### Code Quality Metrics
- ✅ HomeScreen.tsx reduced from 173 to ~100 lines
- ✅ 15+ separate modules with single responsibilities
- ✅ Zero TypeScript errors maintained
- ✅ Zero ESLint warnings maintained
- ✅ 80%+ test coverage achieved

### Functionality Metrics
- ✅ All 15 features working identically
- ✅ Quick Start auto-send preserved
- ✅ Session creation working perfectly
- ✅ Premium features functioning correctly
- ✅ AI selection limits enforced

### Developer Experience Metrics
- ✅ New features can be added in isolation
- ✅ Business logic testable independently
- ✅ Clear separation of concerns
- ✅ Reduced cognitive load
- ✅ Easier debugging and maintenance

## Implementation Timeline

### Estimated Duration: 1-2 Days

**Day 1**: Phase 1-3 (Extract & Abstract)
- Morning: Extract configuration and utilities
- Midday: Create services
- Afternoon: Implement hooks
- Evening: Integration testing

**Day 2**: Phase 4-5 (Integrate & Test)
- Morning: Refactor HomeScreen
- Afternoon: Write comprehensive tests
- Evening: Documentation and polish

## Post-Refactoring Improvements

Once refactoring is complete, these enhancements become trivial:

1. **Add AI provider search** - New hook: `useAISearch`
2. **Add session templates** - Extend QuickStartService
3. **Add session history** - New service: `SessionHistoryService`
4. **Add AI recommendations** - New hook: `useAIRecommendations`
5. **Add onboarding flow** - New service: `OnboardingService`
6. **Add usage analytics** - New service: `AnalyticsService`
7. **Add A/B testing** - New hook: `useFeatureFlags`
8. **Add deep linking** - Extend NavigationService

## Comparison with ChatScreen Refactoring

### Similarities
- Both follow same architectural patterns
- Both use service/hook/component separation
- Both preserve 100% functionality
- Both follow phased migration approach

### Key Differences
- HomeScreen is simpler (173 vs 863 lines)
- Less complex state management
- Fewer inline components to extract
- More configuration data to externalize
- Simpler business logic

### Lessons Applied
- Start with data/utility extraction (lowest risk)
- Services before hooks (establish patterns)
- Incremental migration (validate each phase)
- Maintain feature parity throughout
- Comprehensive testing at each phase

## Conclusion

This refactoring plan transforms HomeScreen from a monolithic component mixing concerns into a clean, maintainable architecture. The resulting structure will be:

- **Maintainable**: Clear module boundaries and responsibilities
- **Testable**: Isolated units with dependency injection
- **Scalable**: Easy to add new features without touching core
- **Performant**: Optimized rendering and data flow
- **Standards-compliant**: Follows React Native best practices

Most importantly, this refactoring maintains 100% feature parity while dramatically improving code quality and developer experience. The modular architecture will accelerate future development and reduce bugs.