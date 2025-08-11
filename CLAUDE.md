# MyAIFriends - Project Context for Claude

## Project Overview
React Native mobile app for multi-AI chat interactions. Users can chat with multiple AI providers simultaneously, have debates between AIs, and manage different AI personalities.

## Tech Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript (strict mode)
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Styling**: Theme-based with light/dark mode support
- **Animation**: React Native Reanimated
- **Testing**: Jest (configured but not extensively used)

## Current Architecture State
⚠️ **IN PROGRESS: Major architectural refactoring from broken component system to proper Atomic Design**

### Current Problems
1. **Misnamed "atomic" components** - Components in `atoms/` are actually molecules/organisms with business logic
2. **Duplicate components** - Both `Text` and `ThemedText`, `Button` and `ThemedButton`, etc.
3. **Mixed responsibilities** - "Atoms" contain theme logic, animations, and business logic
4. **Broken core system** - Recently deleted `core/` directory but just moved problems to `atoms/`

### Migration Status
- ✅ Removed dependency on `core/` components
- ❌ Components in `atoms/` are NOT true atoms
- ❌ Proper atomic design NOT implemented
- 📄 Migration plan documented in `ATOMIC_MIGRATION_PLAN.md`

## Project Structure
```
src/
├── components/
│   ├── atoms/          # Currently misnamed - contains complex components
│   ├── molecules/      # Some proper molecules, some misplaced
│   └── organisms/      # Complex feature components
├── screens/            # 8 main screens
├── store/              # Redux store and slices
├── config/             # AI providers, models, personalities
├── theme/              # Theme system with proper structure
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Key Features
1. **Multi-AI Chat** - Chat with multiple AI providers simultaneously
2. **Debate Mode** - AIs debate topics with each other
3. **Personality System** - Different personalities per AI (balanced, creative, etc.)
4. **Provider Management** - Support for Claude, OpenAI, Google, Nomi, etc.
5. **Theme System** - Light/dark mode with proper color structure

## Development Commands

### Quality Checks (MUST PASS BEFORE ANY COMMIT)
```bash
npx tsc --noEmit        # TypeScript compilation - ZERO errors allowed
npm run lint            # ESLint - ZERO errors or warnings allowed
```

### Running the App
```bash
npm start               # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
```

### Common Issues & Solutions
1. **Metro cache issues**: `npx expo start -c` (clear cache)
2. **Type errors after changes**: Check theme structure `theme.colors.text.primary` not `theme.colors.text`
3. **Import errors**: Ensure importing from correct layer (atoms/molecules/organisms)

## Coding Standards

### Component Creation Rules
1. **Atoms** = Single element wrappers, NO business logic, NO theme imports
2. **Molecules** = 2-3 atoms combined, minimal logic
3. **Organisms** = Complex components with business logic
4. **No duplication** = One component per concept

### Quality Requirements
- ✅ TypeScript must compile with ZERO errors
- ✅ ESLint must pass with ZERO warnings  
- ✅ All components must follow atomic design principles
- ✅ Commit only clean, working code
- ✅ Test affected screens after changes

### Git Commit Format
```
feat: [component] - description
fix: [component] - description  
refactor: [component] to atomic architecture
```

## Current Working Files

### Migration Plan
`ATOMIC_MIGRATION_PLAN.md` - Detailed plan for fixing architecture with checkboxes for tracking

### Key Components Needing Migration
- `atoms/ThemedText` → `molecules/Typography`
- `atoms/ThemedView` → Use plain `atoms/Box`
- `atoms/GradientButton` → Keep in molecules
- `molecules/GradientHeader` → Move to organisms

## AI Providers Configured
- Claude (Anthropic)
- ChatGPT (OpenAI)
- Gemini (Google)
- Nomi
- Replika
- Character.AI

## Known Issues
1. **Architecture** - Components don't follow atomic design despite folder structure
2. **Duplication** - Multiple versions of similar components
3. **Complexity** - "Atoms" are too complex with business logic
4. **Type Safety** - Some components use `any` types

## Next Steps
1. Follow `ATOMIC_MIGRATION_PLAN.md` systematically
2. Create true atomic components (pure wrappers)
3. Migrate complex components to appropriate layers
4. Delete duplicate/confused components
5. Update all imports and test thoroughly

## Important Notes for Claude Sessions
- **DO NOT** take shortcuts or rename components without refactoring
- **DO NOT** proceed if TypeScript or ESLint has errors
- **ALWAYS** update `ATOMIC_MIGRATION_PLAN.md` checkboxes when completing tasks
- **ALWAYS** test affected screens after component changes
- **FOLLOW** the plan systematically - one component at a time
- **COMMIT** frequently but only clean code

## Project Goals
1. Implement proper atomic design architecture
2. Maintain 100% TypeScript type safety
3. Zero ESLint errors or warnings
4. Clean, maintainable component structure
5. Preserve all existing functionality during migration