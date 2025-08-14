# DebateSetupScreen Refactoring Plan

## Overview
This document outlines the comprehensive refactoring plan for `DebateSetupScreen.tsx` to align with atomic design principles and the patterns established in the Home and Chat screen refactorings.

## Current State Analysis

### File Metrics
- **Location**: `src/screens/DebateSetupScreen.tsx`
- **Lines of Code**: 609
- **Complexity**: Very High - multi-step wizard with conditional rendering
- **Responsibilities**: 18+ distinct concerns mixed together

### Identified Issues

#### 1. Monolithic Structure
- Single component handling all debate setup logic
- Mixed UI rendering, business logic, and state management
- No separation of concerns

#### 2. Inline Components
```typescript
// Lines 287-307: DebateTopicCard component defined inline
const DebateTopicCard: React.FC<{
  topic: string;
  participants: Array<{ name: string; icon: React.ReactNode }>;
  isSelected: boolean;
  onPress: () => void;
}> = ({ topic, participants, isSelected, onPress }) => {
  // Component implementation
};
```

#### 3. Complex State Management
- 11 different state variables managing the multi-step flow
- State logic mixed with UI rendering
- No clear state management pattern

#### 4. Business Logic in Component
- AI selection validation (exactly 2 AIs required)
- Premium feature checks
- Topic randomization logic
- Personality selection logic
- All embedded directly in the component

#### 5. Extensive Inline Styling
- Styles defined throughout the component
- No consistent theming approach
- Repeated style patterns

#### 6. Poor Testability
- No separation between logic and presentation
- Difficult to unit test individual features
- State changes tightly coupled to UI

## Component Extraction Strategy

### Custom Hooks (Logic Layer)

#### 1. `useDebateSetup` - Overall Orchestration
```typescript
// src/hooks/debate/useDebateSetup.ts
interface UseDebateSetupReturn {
  currentStep: number;
  nextStep: () => void;
  previousStep: () => void;
  canProceed: boolean;
  startDebate: () => void;
  resetSetup: () => void;
}
```

#### 2. `useDebateSteps` - Step Navigation
```typescript
// src/hooks/debate/useDebateSteps.ts
interface UseDebateStepsReturn {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  stepProgress: number; // percentage
}
```

#### 3. `useAIDebaterSelection` - AI Selection with Validation
```typescript
// src/hooks/debate/useAIDebaterSelection.ts
interface UseAIDebaterSelectionReturn {
  selectedAIs: AIDebater[];
  toggleAI: (ai: AIDebater) => void;
  canProceed: boolean;
  validationMessage: string;
  clearSelection: () => void;
  isValidSelection: boolean;
}
```

#### 4. `useDebateTopic` - Topic Management
```typescript
// src/hooks/debate/useDebateTopic.ts
interface UseDebateTopicReturn {
  selectedTopic: string;
  topicMode: 'suggested' | 'custom' | 'surprise';
  setTopicMode: (mode: 'suggested' | 'custom' | 'surprise') => void;
  setCustomTopic: (topic: string) => void;
  selectSuggestedTopic: (topic: string) => void;
  generateSurpriseTopic: () => void;
  currentTopic: string; // computed based on mode
}
```

#### 5. `usePersonalitySelection` - Personality Management
```typescript
// src/hooks/debate/usePersonalitySelection.ts
interface UsePersonalitySelectionReturn {
  selectedPersonalities: Map<string, Personality>;
  setPersonality: (aiId: string, personality: Personality) => void;
  resetPersonalities: () => void;
  hasCustomPersonalities: boolean;
  isPremiumFeature: boolean;
}
```

#### 6. `useDebateValidation` - Form Validation
```typescript
// src/hooks/debate/useDebateValidation.ts
interface UseDebateValidationReturn {
  validateTopic: (topic: string) => ValidationResult;
  validateAISelection: (ais: AIDebater[]) => ValidationResult;
  validatePersonalities: (personalities: Map<string, Personality>) => ValidationResult;
  canStartDebate: boolean;
  validationErrors: string[];
}
```

#### 7. `useTopicPreservation` - Topic State Preservation
```typescript
// src/hooks/debate/useTopicPreservation.ts
interface UseTopicPreservationReturn {
  preservedTopic: string | null;
  preserveTopic: (topic: string) => void;
  clearPreservedTopic: () => void;
  restoreTopic: () => string | null;
}
```

### Services (Business Logic)

#### 1. `DebateSetupService`
```typescript
// src/services/debate/DebateSetupService.ts
class DebateSetupService {
  static validateDebateConfiguration(config: DebateConfig): ValidationResult;
  static createDebateSession(config: DebateConfig): DebateSession;
  static getDefaultConfiguration(): DebateConfig;
  static calculateEstimatedDuration(topic: string): number;
}
```

#### 2. `TopicService`
```typescript
// src/services/debate/TopicService.ts
class TopicService {
  static getSuggestedTopics(): SuggestedTopic[];
  static generateRandomTopic(): string;
  static validateCustomTopic(topic: string): boolean;
  static getTopicCategory(topic: string): TopicCategory;
  static getRelatedTopics(topic: string): string[];
}
```

#### 3. `DebaterSelectionService`
```typescript
// src/services/debate/DebaterSelectionService.ts
class DebaterSelectionService {
  static validateSelection(debaters: AIDebater[]): ValidationResult;
  static getOptimalDebaters(topic: string): AIDebater[];
  static checkDebaterCompatibility(debaters: AIDebater[]): boolean;
  static enforceMinimumDebaters(debaters: AIDebater[]): AIDebater[];
}
```

#### 4. `PersonalityService`
```typescript
// src/services/debate/PersonalityService.ts
class PersonalityService {
  static getDefaultPersonality(ai: AIDebater): Personality;
  static getAvailablePersonalities(isPremium: boolean): Personality[];
  static validatePersonalitySelection(selections: Map<string, Personality>): boolean;
  static applyPersonalityToDebater(debater: AIDebater, personality: Personality): AIDebater;
}
```

### Organism Components (Complex UI)

#### 1. `DebateTopicSelector`
```typescript
// src/components/organisms/DebateTopicSelector.tsx
interface DebateTopicSelectorProps {
  selectedTopic: string;
  topicMode: 'suggested' | 'custom' | 'surprise';
  onTopicChange: (topic: string) => void;
  onModeChange: (mode: 'suggested' | 'custom' | 'surprise') => void;
  isPremium: boolean;
}
```

#### 2. `DebateAISelector`
```typescript
// src/components/organisms/DebateAISelector.tsx
interface DebateAISelectorProps {
  availableAIs: AIDebater[];
  selectedAIs: AIDebater[];
  onToggleAI: (ai: AIDebater) => void;
  validationMessage?: string;
  maxSelection: number;
  minSelection: number;
}
```

#### 3. `DebatePersonalitySelector`
```typescript
// src/components/organisms/DebatePersonalitySelector.tsx
interface DebatePersonalitySelectorProps {
  selectedAIs: AIDebater[];
  personalities: Map<string, Personality>;
  onPersonalityChange: (aiId: string, personality: Personality) => void;
  isPremium: boolean;
}
```

#### 4. `DebateSetupSummary`
```typescript
// src/components/organisms/DebateSetupSummary.tsx
interface DebateSetupSummaryProps {
  topic: string;
  debaters: Array<{ ai: AIDebater; personality?: Personality }>;
  estimatedDuration: number;
  onEdit: (section: 'topic' | 'debaters' | 'personalities') => void;
  onStartDebate: () => void;
}
```

#### 5. `DebateStepIndicator`
```typescript
// src/components/organisms/DebateStepIndicator.tsx
interface DebateStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onStepPress?: (step: number) => void;
  completedSteps: number[];
}
```

### Molecule Components (Simple UI)

#### 1. `DebateTopicCard` (Extract from inline)
```typescript
// src/components/molecules/DebateTopicCard.tsx
interface DebateTopicCardProps {
  topic: string;
  participants: Array<{ name: string; icon: React.ReactNode }>;
  isSelected: boolean;
  onPress: () => void;
  isPremium?: boolean;
}
```

#### 2. `TopicModeSelector`
```typescript
// src/components/molecules/TopicModeSelector.tsx
interface TopicModeSelectorProps {
  selectedMode: 'suggested' | 'custom' | 'surprise';
  onModeSelect: (mode: 'suggested' | 'custom' | 'surprise') => void;
  isPremium: boolean;
}
```

#### 3. `AIDebaterCard`
```typescript
// src/components/molecules/AIDebaterCard.tsx
interface AIDebaterCardProps {
  debater: AIDebater;
  isSelected: boolean;
  onToggle: () => void;
  personality?: Personality;
  showPersonality?: boolean;
}
```

#### 4. `SurpriseTopicDisplay`
```typescript
// src/components/molecules/SurpriseTopicDisplay.tsx
interface SurpriseTopicDisplayProps {
  topic: string;
  onRegenerate: () => void;
  isGenerating: boolean;
}
```

#### 5. `DebatePreviewCard`
```typescript
// src/components/molecules/DebatePreviewCard.tsx
interface DebatePreviewCardProps {
  label: string;
  value: string | React.ReactNode;
  onEdit?: () => void;
  editable?: boolean;
}
```

#### 6. `PersonalityChip`
```typescript
// src/components/molecules/PersonalityChip.tsx
interface PersonalityChipProps {
  personality: Personality;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}
```

### Configuration Files

#### 1. `debateSetupConfig.ts`
```typescript
// src/config/debate/debateSetupConfig.ts
export const DEBATE_SETUP_CONFIG = {
  MIN_DEBATERS: 2,
  MAX_DEBATERS: 6,
  DEFAULT_TOPIC_MODE: 'suggested',
  TOPIC_MIN_LENGTH: 10,
  TOPIC_MAX_LENGTH: 200,
  STEP_LABELS: ['Topic', 'Debaters', 'Personalities', 'Review'],
  ANIMATION_DURATION: 300,
};
```

#### 2. `suggestedTopics.ts`
```typescript
// src/config/debate/suggestedTopics.ts
export const SUGGESTED_TOPICS = [
  {
    id: 'tech-ai',
    topic: 'Should AI development be regulated by governments?',
    category: 'Technology',
    difficulty: 'medium',
    estimatedDuration: 15,
  },
  // ... more topics
];
```

## Implementation Steps

### Phase 1: Extract Configuration and Utilities
1. Create `src/config/debate/` directory
2. Extract all constants to `debateSetupConfig.ts`
3. Move suggested topics to `suggestedTopics.ts`
4. Create type definitions in `src/types/debate.ts`

### Phase 2: Create Services
1. Implement `TopicService` with topic-related logic
2. Create `DebaterSelectionService` for AI selection rules
3. Build `PersonalityService` for personality management
4. Develop `DebateSetupService` for orchestration

### Phase 3: Extract Molecule Components
1. Extract `DebateTopicCard` from inline definition
2. Create `TopicModeSelector` for mode buttons
3. Build `AIDebaterCard` for individual AI display
4. Implement `SurpriseTopicDisplay` for random topics
5. Create `PersonalityChip` for personality selection

### Phase 4: Implement Custom Hooks
1. Create `useDebateSteps` for navigation logic
2. Implement `useAIDebaterSelection` with validation
3. Build `useDebateTopic` for topic management
4. Create `usePersonalitySelection` for personalities
5. Implement `useDebateValidation` for form validation
6. Create `useDebateSetup` to orchestrate everything

### Phase 5: Build Organism Components
1. Create `DebateTopicSelector` using molecules and hooks
2. Build `DebateAISelector` with selection logic
3. Implement `DebatePersonalitySelector`
4. Create `DebateSetupSummary` for review step
5. Build `DebateStepIndicator` for progress display

### Phase 6: Refactor Main Screen
1. Remove all inline components
2. Replace state management with custom hooks
3. Use organism components for each step
4. Remove business logic from render
5. Apply consistent theming

### Phase 7: Testing and Documentation
1. Add unit tests for services
2. Test custom hooks
3. Create component tests
4. Update documentation
5. Verify TypeScript compliance

## File Structure After Refactoring

```
src/
├── components/
│   ├── molecules/
│   │   ├── DebateTopicCard.tsx
│   │   ├── TopicModeSelector.tsx
│   │   ├── AIDebaterCard.tsx
│   │   ├── SurpriseTopicDisplay.tsx
│   │   ├── DebatePreviewCard.tsx
│   │   └── PersonalityChip.tsx
│   └── organisms/
│       ├── DebateTopicSelector.tsx
│       ├── DebateAISelector.tsx
│       ├── DebatePersonalitySelector.tsx
│       ├── DebateSetupSummary.tsx
│       └── DebateStepIndicator.tsx
├── hooks/
│   └── debate/
│       ├── useDebateSetup.ts
│       ├── useDebateSteps.ts
│       ├── useAIDebaterSelection.ts
│       ├── useDebateTopic.ts
│       ├── usePersonalitySelection.ts
│       ├── useDebateValidation.ts
│       └── useTopicPreservation.ts
├── services/
│   └── debate/
│       ├── DebateSetupService.ts
│       ├── TopicService.ts
│       ├── DebaterSelectionService.ts
│       └── PersonalityService.ts
├── config/
│   └── debate/
│       ├── debateSetupConfig.ts
│       └── suggestedTopics.ts
├── types/
│   └── debate.ts
└── screens/
    └── DebateSetupScreen.tsx (refactored)
```

## Expected Outcomes

### Code Quality Improvements
- **Line Reduction**: From 609 to ~150 lines in main component
- **Separation of Concerns**: 20+ separate modules with single responsibilities
- **Testability**: Each piece independently testable
- **Reusability**: Components usable across the app

### Architectural Benefits
- **Atomic Design Compliance**: Proper separation into atoms/molecules/organisms
- **Hook Pattern**: Logic separated from presentation
- **Service Layer**: Business logic centralized
- **Type Safety**: Full TypeScript coverage

### Maintainability Gains
- **Easier Feature Addition**: New debate modes simple to add
- **Bug Isolation**: Issues easier to locate and fix
- **Code Clarity**: Each file has clear purpose
- **Documentation**: Self-documenting architecture

## Success Criteria

### Must Have
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] All existing functionality preserved
- [ ] Multi-step flow works correctly
- [ ] AI selection validation (exactly 2 AIs)
- [ ] Premium features properly gated

### Should Have
- [ ] Smooth animations between steps
- [ ] Consistent theming throughout
- [ ] Proper error handling
- [ ] Loading states for async operations

### Nice to Have
- [ ] Unit tests for all services
- [ ] Hook tests with react-hooks-testing-library
- [ ] Component snapshot tests
- [ ] Performance optimizations

## Migration Risks and Mitigations

### Risk 1: Step Navigation State Loss
**Mitigation**: Implement state persistence in `useDebateSteps` hook

### Risk 2: Complex Topic State Management
**Mitigation**: Use `useTopicPreservation` to maintain topic across navigation

### Risk 3: Premium Feature Regression
**Mitigation**: Centralize premium checks in services, test thoroughly

### Risk 4: AI Selection Validation
**Mitigation**: Strict validation in `DebaterSelectionService` with comprehensive tests

## Testing Strategy

### Unit Tests
```typescript
// TopicService.test.ts
describe('TopicService', () => {
  test('validates custom topic length');
  test('generates unique random topics');
  test('categorizes topics correctly');
});

// DebaterSelectionService.test.ts
describe('DebaterSelectionService', () => {
  test('enforces minimum 2 debaters');
  test('validates debater compatibility');
  test('suggests optimal debaters for topic');
});
```

### Hook Tests
```typescript
// useAIDebaterSelection.test.ts
describe('useAIDebaterSelection', () => {
  test('toggles AI selection correctly');
  test('validates exactly 2 AIs selected');
  test('provides appropriate validation messages');
});
```

### Integration Tests
```typescript
// DebateSetupScreen.test.tsx
describe('DebateSetupScreen Integration', () => {
  test('completes full setup flow');
  test('navigates between steps correctly');
  test('starts debate with valid configuration');
});
```

## Timeline

### Week 1
- Days 1-2: Extract configuration and create services
- Days 3-4: Build molecule components
- Day 5: Initial testing and adjustments

### Week 2
- Days 1-2: Implement custom hooks
- Days 3-4: Create organism components
- Day 5: Refactor main screen

### Week 3
- Days 1-2: Complete integration
- Days 3-4: Comprehensive testing
- Day 5: Documentation and code review

## Conclusion

This refactoring will transform the DebateSetupScreen from a monolithic 609-line component into a well-architected, maintainable system following atomic design principles. The modular approach will make it significantly easier to add new debate features, which is crucial for DebateAI's unique value proposition as the AI Debate Arena platform.

The refactoring maintains 100% feature parity while dramatically improving code quality, testability, and developer experience. This positions the debate setup flow for future enhancements like tournament modes, team debates, and audience participation features.