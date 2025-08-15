# HistoryScreen Refactoring Plan

## Executive Summary
The HistoryScreen.tsx file is a 464-line component that combines UI presentation with business logic, data fetching, state management, and complex interactions. This document provides a comprehensive plan to refactor it into a maintainable, testable, and scalable architecture following atomic design principles and React Native community standards.

## Current State Analysis

### File Statistics
- **Lines of Code**: 464 lines
- **Responsibilities**: 15+ distinct concerns mixed together
- **Inline Components**: 1 (SessionPreview)
- **Business Logic**: ~150 lines mixed with UI code
- **Direct AsyncStorage Access**: Heavy coupling to storage implementation

### Complete Functionality Inventory

#### Core Session Management
1. **Session Loading**
   - AsyncStorage data retrieval
   - JSON parsing and validation
   - Sorting by creation date
   - Free tier limiting (3 sessions max)
   - Error handling for corrupted data

2. **Session Deletion**
   - Swipe-to-delete gesture
   - Confirmation dialog
   - AsyncStorage update
   - Local state synchronization
   - Visual feedback via animation

3. **Session Resumption**
   - Redux dispatch of loadSession
   - Navigation with parameters
   - Search term preservation
   - Resume flag handling

#### Search & Filter Features
4. **Search Functionality**
   - Real-time filtering
   - AI name search
   - Message content search
   - Search term highlighting
   - Match badge display
   - Empty state for no results

5. **Search Highlighting**
   - Case-insensitive matching
   - Visual highlighting with warning color
   - Inline component for preview text
   - Regex-based text splitting

#### Data Presentation
6. **Session Cards**
   - AI names concatenation
   - Last message preview
   - Message count display
   - Timestamp formatting (relative)
   - Animated entrance
   - Border highlighting for matches

7. **Date Formatting**
   - "Today" for same day
   - "Yesterday" for previous day
   - Weekday for past week
   - Month/Day for older
   - Year for very old sessions

#### Premium Features
8. **Subscription Management**
   - Free tier session limiting
   - Visual limit indicator
   - Premium badge display
   - Dynamic max sessions calculation

#### UI States
9. **Loading State**
   - Loading indicator during fetch
   - Centered loading message
   - Prevents interaction during load

10. **Empty States**
    - Different messages for no sessions vs no search results
    - Contextual emojis (💬 vs 🔍)
    - Instructional text
    - Centered layout

11. **Statistics Bar**
    - Total conversation count
    - Total message count
    - Dynamic plural handling
    - Conditional display

#### Navigation & Lifecycle
12. **Screen Focus Handling**
    - Reload on focus using useFocusEffect
    - Subscription change detection
    - Data refresh strategy

13. **Route Parameters**
    - sessionId passing
    - resuming flag
    - searchTerm preservation

#### Performance Features
14. **Optimizations**
    - FlatList for virtualization
    - Animated list items
    - Debounced search (via useEffect)
    - Conditional re-renders

#### Gesture Support
15. **Swipe Actions**
    - Swipeable implementation
    - Right swipe for delete
    - Visual delete button
    - Overshoot prevention

### Architectural Problems

#### 1. Separation of Concerns Violations
- Data fetching logic mixed with UI components
- AsyncStorage operations directly in component
- Business logic (filtering, sorting) embedded in render cycle
- No clear data layer abstraction

#### 2. State Management Issues
- Multiple useState hooks for related data
- Redundant state (sessions and filteredSessions)
- Direct AsyncStorage access bypassing Redux patterns
- No centralized session history management

#### 3. Component Complexity
- Single component handling 15+ responsibilities
- 464 lines in one file
- Complex conditional rendering
- Inline styles mixed with StyleSheet

#### 4. Data Layer Problems
- No service layer for session persistence
- AsyncStorage calls scattered throughout
- No data validation or migration strategy
- Tight coupling to storage implementation

#### 5. Testing Challenges
- Cannot test business logic in isolation
- AsyncStorage mocking required
- Navigation mocking required
- Redux mocking required
- Gesture handler mocking required

#### 6. Performance Concerns
- All sessions loaded into memory
- No pagination for large datasets
- Filtering runs on every render
- No memoization of expensive operations

#### 7. Type Safety Issues
- Weak typing for navigation props
- No validation of AsyncStorage data
- Missing error boundaries
- Partial type coverage

#### 8. Maintainability Issues
- Hard to add new features (e.g., batch operations)
- Changes risk breaking multiple features
- No clear module boundaries
- Difficult to debug data flow

## Proposed Architecture

### Design Principles
1. **Atomic Design** - Clear component hierarchy (atoms → molecules → organisms)
2. **Single Responsibility** - Each module handles one concern
3. **Dependency Injection** - Services and hooks for testability
4. **React Native Best Practices** - Proper hook usage, performance optimizations
5. **Type Safety** - Full TypeScript coverage with strict mode

### Layer Architecture

```
screens/
├── HistoryScreen.tsx (Container - 100 lines max)
│
hooks/history/
├── useSessionHistory.ts (Session data management)
├── useSessionSearch.ts (Search and filtering)
├── useSessionActions.ts (CRUD operations)
├── useSessionStats.ts (Statistics calculation)
├── useSubscriptionLimits.ts (Premium logic)
│
services/history/
├── SessionStorageService.ts (AsyncStorage abstraction)
├── SessionSortService.ts (Sorting strategies)
├── SessionFilterService.ts (Search algorithms)
├── DateFormatterService.ts (Date utilities)
│
components/organisms/history/
├── HistoryHeader.tsx
├── HistorySearchBar.tsx
├── HistorySessionList.tsx
├── HistoryStatsBar.tsx
├── HistoryEmptyState.tsx
│
components/molecules/history/
├── SessionCard.tsx
├── SessionPreview.tsx
├── SessionSwipeActions.tsx
├── SearchHighlight.tsx
├── LimitBadge.tsx
│
utils/history/
├── sessionValidators.ts
├── dateFormatters.ts
├── searchMatchers.ts
├── sessionMappers.ts
```

### Module Responsibilities

#### 1. HistoryScreen.tsx (Container Component)
```typescript
// ~100 lines
- Hook composition
- Layout structure
- Component orchestration
- Navigation handling
- NO business logic
- NO direct storage access
```

#### 2. Custom Hooks (hooks/history/)

**useSessionHistory.ts**
```typescript
// Core session data management
- Load sessions from storage
- Session state management
- Refresh on focus
- Error handling
- Loading states
```

**useSessionSearch.ts**
```typescript
// Search and filter functionality
- Search query state
- Filter logic
- Search term highlighting
- Match detection
- Debounced search
```

**useSessionActions.ts**
```typescript
// CRUD operations
- Delete session
- Resume session
- Batch operations (future)
- Confirmation dialogs
- Redux integration
```

**useSessionStats.ts**
```typescript
// Statistics calculation
- Total sessions count
- Total messages count
- Average session length
- Usage patterns (future)
```

**useSubscriptionLimits.ts**
```typescript
// Premium feature management
- Session limits calculation
- Free tier restrictions
- Premium status checks
- Upgrade prompts (future)
```

#### 3. Services (services/history/)

**SessionStorageService.ts**
```typescript
// AsyncStorage abstraction layer
class SessionStorageService {
  - loadAllSessions()
  - saveSession()
  - deleteSession()
  - updateSession()
  - clearAllSessions()
  - migrateData()
  - validateSessionData()
}
```

**SessionSortService.ts**
```typescript
// Sorting strategies
class SessionSortService {
  - sortByDate()
  - sortByMessageCount()
  - sortByAICount()
  - sortByLastActivity()
  - customSort()
}
```

**SessionFilterService.ts**
```typescript
// Search and filter algorithms
class SessionFilterService {
  - filterBySearchTerm()
  - filterByAIName()
  - filterByDateRange()
  - filterByMessageContent()
  - advancedSearch()
}
```

**DateFormatterService.ts**
```typescript
// Date formatting utilities
class DateFormatterService {
  - formatRelativeDate()
  - formatAbsoluteDate()
  - formatTimeAgo()
  - formatDuration()
  - getDateGroup()
}
```

#### 4. UI Components (components/organisms/history/)

**HistoryHeader.tsx**
```typescript
// Header with title and badges
interface Props {
  title: string;
  sessionCount: number;
  maxSessions: number;
  isPremium: boolean;
}
- Title display
- Limit badge
- Premium indicator
```

**HistorySearchBar.tsx**
```typescript
// Search input component
interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}
- TextInput wrapper
- Clear button
- Search icon
- Theming
```

**HistorySessionList.tsx**
```typescript
// Session list container
interface Props {
  sessions: ChatSession[];
  onSessionPress: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
  searchTerm?: string;
  ListEmptyComponent?: React.ReactElement;
}
- FlatList optimization
- Swipe actions
- Animation coordination
- Performance optimizations
```

**HistoryStatsBar.tsx**
```typescript
// Statistics display
interface Props {
  sessionCount: number;
  messageCount: number;
  visible: boolean;
}
- Stats formatting
- Conditional rendering
- Theming
```

**HistoryEmptyState.tsx**
```typescript
// Empty state display
interface Props {
  type: 'no-sessions' | 'no-results';
  searchTerm?: string;
}
- Contextual messaging
- Emoji display
- Call-to-action
```

#### 5. UI Components (components/molecules/history/)

**SessionCard.tsx**
```typescript
// Individual session card
interface Props {
  session: ChatSession;
  onPress: () => void;
  searchTerm?: string;
  isHighlighted: boolean;
  index: number;
}
- Card layout
- Animation
- Touch handling
- Highlight state
```

**SessionPreview.tsx**
```typescript
// Message preview with highlighting
interface Props {
  text: string;
  searchTerm?: string;
  maxLines?: number;
}
- Text truncation
- Search highlighting
- Styling
```

**SessionSwipeActions.tsx**
```typescript
// Swipe gesture actions
interface Props {
  onDelete: () => void;
  onArchive?: () => void;
}
- Delete button
- Archive button (future)
- Animation
```

**SearchHighlight.tsx**
```typescript
// Text highlighting component
interface Props {
  text: string;
  searchTerm: string;
  highlightStyle?: StyleProp<TextStyle>;
}
- Regex matching
- Highlight styling
- Performance optimization
```

**LimitBadge.tsx**
```typescript
// Subscription limit indicator
interface Props {
  current: number;
  max: number;
  type: 'warning' | 'info';
}
- Badge styling
- Text formatting
- Color coding
```

### Data Flow Architecture

```
User Action → Hook → Service → AsyncStorage/Redux
                ↓
           Component ← Hook ← Processed Data
```

1. Screen loads → `useSessionHistory` → `SessionStorageService.loadAllSessions()` → AsyncStorage
2. User searches → `useSessionSearch` → `SessionFilterService.filterBySearchTerm()` → Filtered results
3. User deletes → `useSessionActions` → `SessionStorageService.deleteSession()` → AsyncStorage update
4. User resumes → `useSessionActions` → Redux dispatch → Navigation

### State Management Strategy

#### Global State (Redux)
- Current active session (when resumed)
- User subscription status
- UI theme and preferences

#### Local State (Hooks)
- Session list (useSessionHistory)
- Search query (useSessionSearch)
- Loading state (useSessionHistory)
- Filter results (useSessionSearch)

#### Derived State
- Filtered sessions
- Session statistics
- Formatted dates
- Search highlights

### Performance Optimizations

1. **Virtualization**
   - FlatList for large datasets
   - Lazy loading of session details
   - Viewport-based rendering

2. **Memoization**
   - useMemo for expensive filters
   - useCallback for event handlers
   - React.memo for pure components

3. **Debouncing**
   - Search input debouncing
   - Scroll event throttling
   - Animation frame scheduling

4. **Data Management**
   - Pagination for large histories
   - Incremental search
   - Cached search results

## Migration Plan

### Phase 1: Extract Services (Foundation Layer)
**Goal**: Create service layer without breaking existing functionality

1. Create `services/history/` directory
2. Implement `SessionStorageService.ts`:
   - Move AsyncStorage operations
   - Add data validation
   - Add error handling
3. Implement `SessionSortService.ts`:
   - Extract sorting logic
   - Add sort strategies
4. Implement `SessionFilterService.ts`:
   - Extract filter logic
   - Optimize search algorithms
5. Implement `DateFormatterService.ts`:
   - Move date formatting
   - Add localization support

**Testing**: Verify all data operations work identically

### Phase 2: Extract Custom Hooks (Logic Layer)
**Goal**: Create reusable hooks using services

1. Create `hooks/history/` directory
2. Implement `useSessionHistory.ts`:
   - Move data loading logic
   - Use SessionStorageService
   - Handle loading states
3. Implement `useSessionSearch.ts`:
   - Move search logic
   - Use SessionFilterService
   - Add debouncing
4. Implement `useSessionActions.ts`:
   - Move CRUD operations
   - Add confirmation dialogs
   - Redux integration
5. Implement `useSessionStats.ts`:
   - Calculate statistics
   - Memoize results
6. Implement `useSubscriptionLimits.ts`:
   - Move premium logic
   - Calculate limits

**Testing**: Test each hook in isolation with mock data

### Phase 3: Extract Molecules (Small Components)
**Goal**: Create reusable UI building blocks

1. Create `components/molecules/history/` directory
2. Extract `SessionCard.tsx`:
   - Move card rendering logic
   - Add proper TypeScript types
3. Extract `SessionPreview.tsx`:
   - Already exists inline, formalize it
   - Add text truncation
4. Extract `SessionSwipeActions.tsx`:
   - Move swipe actions
   - Add animations
5. Extract `SearchHighlight.tsx`:
   - Generic highlighting component
   - Performance optimized
6. Extract `LimitBadge.tsx`:
   - Subscription limit display
   - Reusable badge component

**Testing**: Snapshot tests for each molecule

### Phase 4: Extract Organisms (Complex Components)
**Goal**: Create high-level UI components

1. Create `components/organisms/history/` directory
2. Extract `HistoryHeader.tsx`:
   - Header layout
   - Badge integration
3. Extract `HistorySearchBar.tsx`:
   - Search input wrapper
   - Clear functionality
4. Extract `HistorySessionList.tsx`:
   - FlatList implementation
   - Swipe integration
   - Animation coordination
5. Extract `HistoryStatsBar.tsx`:
   - Statistics display
   - Conditional rendering
6. Extract `HistoryEmptyState.tsx`:
   - Empty state variations
   - Call-to-action

**Testing**: Integration tests for user interactions

### Phase 5: Refactor HistoryScreen (Final Integration)
**Goal**: Transform HistoryScreen into clean container

1. Update HistoryScreen to use all hooks
2. Replace inline JSX with extracted components
3. Remove all business logic
4. Clean up imports
5. Add comprehensive TypeScript types
6. Document the new structure

**Final structure**:
```typescript
const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  // Compose hooks
  const { sessions, isLoading, refresh } = useSessionHistory();
  const { searchQuery, setSearchQuery, filteredSessions } = useSessionSearch(sessions);
  const { deleteSession, resumeSession } = useSessionActions(navigation);
  const { sessionCount, messageCount } = useSessionStats(sessions);
  const { maxSessions, isLimited } = useSubscriptionLimits();
  
  // Render clean component tree
  return (
    <SafeAreaView>
      <HistoryHeader 
        title="Chat History"
        sessionCount={sessions.length}
        maxSessions={maxSessions}
        isPremium={!isLimited}
      />
      <HistorySearchBar 
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <HistorySessionList
        sessions={filteredSessions}
        onSessionPress={resumeSession}
        onSessionDelete={deleteSession}
        searchTerm={searchQuery}
        ListEmptyComponent={
          <HistoryEmptyState 
            type={searchQuery ? 'no-results' : 'no-sessions'}
            searchTerm={searchQuery}
          />
        }
      />
      <HistoryStatsBar
        sessionCount={sessionCount}
        messageCount={messageCount}
        visible={!searchQuery && sessions.length > 0}
      />
    </SafeAreaView>
  );
};
```

### Phase 6: Add Tests (Quality Assurance)
**Goal**: Comprehensive test coverage

1. **Unit Tests for Services**:
   - SessionStorageService tests
   - SessionFilterService tests
   - SessionSortService tests
   - DateFormatterService tests

2. **Hook Tests**:
   - useSessionHistory with mock storage
   - useSessionSearch with test data
   - useSessionActions with mock navigation
   - useSessionStats calculations
   - useSubscriptionLimits logic

3. **Component Tests**:
   - Snapshot tests for all components
   - Interaction tests for user actions
   - Animation tests
   - Accessibility tests

4. **Integration Tests**:
   - Full flow from load to delete
   - Search and filter flow
   - Resume session flow
   - Swipe gesture flow

## Risk Mitigation

### Critical Risks & Mitigations

1. **Risk**: Breaking session persistence
   - **Mitigation**: Extract SessionStorageService first with comprehensive tests
   - **Validation**: Verify sessions persist across app restarts

2. **Risk**: Breaking search functionality
   - **Mitigation**: Keep search logic intact during extraction
   - **Validation**: Test with various search terms and edge cases

3. **Risk**: Breaking swipe gestures
   - **Mitigation**: Test on both iOS and Android during extraction
   - **Validation**: Ensure gesture handler works smoothly

4. **Risk**: Performance degradation with large histories
   - **Mitigation**: Implement pagination early, use FlatList optimizations
   - **Validation**: Test with 100+ sessions

5. **Risk**: Breaking subscription limits
   - **Mitigation**: Extract subscription logic carefully with tests
   - **Validation**: Test with both free and premium accounts

### Rollback Strategy

Each phase is independently deployable:
1. Git commit after each successful phase
2. Tag each phase completion
3. Create feature branch for refactoring
4. Keep old HistoryScreen.tsx until Phase 5 complete
5. A/B test if needed

## Success Metrics

### Code Quality Metrics
- ✅ HistoryScreen.tsx reduced from 464 to ~100 lines
- ✅ 15+ separate modules with single responsibilities
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ 80%+ test coverage

### Functionality Metrics
- ✅ All 15 features working identically
- ✅ Session persistence intact
- ✅ Search highlights working
- ✅ Swipe gestures smooth
- ✅ Performance same or better

### Developer Experience Metrics
- ✅ New features easily addable (e.g., bulk operations)
- ✅ Bugs fixable without side effects
- ✅ Code self-documenting
- ✅ Onboarding time reduced by 50%
- ✅ Easy to write tests

### Performance Metrics
- ✅ Initial load time < 500ms
- ✅ Search response < 100ms
- ✅ Smooth 60fps animations
- ✅ Memory usage optimized
- ✅ No unnecessary re-renders

## Implementation Timeline

### Estimated Duration: 2 Days

**Day 1**: Foundation and Logic (Phases 1-2)
- Morning: Extract service layer
- Afternoon: Create custom hooks
- Evening: Integration testing

**Day 2**: UI and Integration (Phases 3-5)
- Morning: Extract molecules and organisms
- Afternoon: Refactor HistoryScreen
- Evening: Full testing and documentation

## Post-Refactoring Improvements

Once refactoring is complete, these features become easy to add:

1. **Batch Operations** - New hook: `useBatchActions`
   - Select multiple sessions
   - Bulk delete
   - Bulk export

2. **Advanced Search** - Enhance `SessionFilterService`
   - Date range filtering
   - AI-specific search
   - Regex search support

3. **Session Export** - New service: `ExportService`
   - Export to JSON
   - Export to PDF
   - Share functionality

4. **Session Analytics** - New hook: `useSessionAnalytics`
   - Usage patterns
   - Popular AIs
   - Chat duration stats

5. **Cloud Sync** - New service: `CloudSyncService`
   - Firebase integration
   - Cross-device sync
   - Backup/restore

6. **Session Templates** - New feature
   - Save session as template
   - Quick-start from template
   - Share templates

7. **Pagination** - Enhance `useSessionHistory`
   - Load on scroll
   - Virtual scrolling
   - Infinite scroll

8. **Sorting Options** - Enhance UI
   - Sort by date
   - Sort by message count
   - Sort by AI combination

## Component Specifications

### SessionCard Component
```typescript
interface SessionCardProps {
  session: ChatSession;
  onPress: (session: ChatSession) => void;
  searchTerm?: string;
  isHighlighted: boolean;
  index: number;
  testID?: string;
}

// Features:
- Animated entrance with staggered delay
- Touch feedback
- Highlight border for search matches
- AI names with separator dots
- Message preview with truncation
- Message count badge
- Relative date formatting
- Accessibility labels
```

### HistorySessionList Component
```typescript
interface HistorySessionListProps {
  sessions: ChatSession[];
  onSessionPress: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
  searchTerm?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: React.ReactElement;
  testID?: string;
}

// Features:
- FlatList with optimization props
- Pull-to-refresh
- Swipeable rows
- Keyboard dismissal on scroll
- Section headers (future)
- Scroll to top button (future)
```

### useSessionHistory Hook
```typescript
interface UseSessionHistoryReturn {
  sessions: ChatSession[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

// Features:
- Auto-refresh on focus
- Error boundary integration
- Loading states
- Subscription-based limiting
- Data validation
- Migration support
```

## Conclusion

This refactoring plan transforms the HistoryScreen from a monolithic 464-line component into a clean, maintainable architecture following atomic design principles. The phased approach ensures we can validate at each step without breaking the app.

The resulting architecture will be:

- **Maintainable**: Clear separation of concerns with single-responsibility modules
- **Testable**: Isolated units with dependency injection
- **Scalable**: Easy to add new features like batch operations or analytics
- **Performant**: Optimized rendering with proper memoization and virtualization
- **Standards-compliant**: Follows React Native and community best practices
- **Type-safe**: Full TypeScript coverage with strict validation

Most importantly, this refactoring maintains 100% feature parity while setting up the codebase for future enhancements like cloud sync, advanced search, and session analytics.