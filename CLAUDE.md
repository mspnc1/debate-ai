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
✅ **COMPLETED: Proper Atomic Design Architecture Implemented**

### Architecture Achievements
1. **True atomic components** - `atoms/` contains only Box.tsx (pure View wrapper)
2. **Clean separation** - 12 molecules (simple combinations) and 20 organisms (complex logic)
3. **No duplicates** - All ThemedX components removed, single source of truth
4. **Proper responsibilities** - Each layer follows atomic design principles

### Migration Status
- ✅ Proper atomic design fully implemented
- ✅ All components in correct folders by complexity
- ✅ TypeScript compilation: ZERO errors
- ✅ ESLint: ZERO warnings or errors
- ✅ App fully functional with all features retained
- 📄 Migration completed as per `ATOMIC_MIGRATION_PLAN.md`

## Project Structure
```
src/
├── components/
│   ├── atoms/          # Pure wrappers - only Box.tsx (View with style props)
│   ├── molecules/      # Simple combinations (12 components: Button, Typography, etc.)
│   └── organisms/      # Complex business logic (20 components)
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

### Component Creation Rules (Now Enforced!)
1. **Atoms** = Pure React Native wrappers only (currently just Box.tsx)
2. **Molecules** = Simple combinations like Button, Typography, Card (12 total)
3. **Organisms** = Complex components with business logic (20 total)
4. **No duplication** = All ThemedX components eliminated

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

## Architecture Documentation

### Completed Migration
`ATOMIC_MIGRATION_PLAN.md` - ✅ Fully completed migration with all tasks checked off

### Key Components Structure
- `atoms/Box` - Only atom, pure View wrapper with style props
- `molecules/Typography` - Replaced all ThemedText usage
- `molecules/Button` - Standard button component
- `organisms/` - All complex components with business logic

## AI Providers Configured
- Claude (Anthropic)
- ChatGPT (OpenAI)
- Gemini (Google)
- Nomi
- Replika
- Character.AI

## Architecture Highlights
1. **Clean Structure** - Proper atomic design with clear separation
2. **No Duplication** - Single source of truth for all components
3. **Type Safety** - Full TypeScript compliance with zero errors
4. **Maintainable** - Clear component hierarchy and responsibilities

## Development Best Practices
1. Use React Native components directly in screens when appropriate
2. Use `Box` from atoms for simple View wrappers with style props
3. Use `Typography` from molecules for all text with theming
4. Place complex components with business logic in organisms
5. Run TypeScript and ESLint checks before every commit

## Important Notes for Future Development
- **MAINTAIN** the atomic design structure - atoms are ONLY pure wrappers
- **ENSURE** TypeScript and ESLint pass with zero errors before commits
- **TEST** affected screens after component changes
- **FOLLOW** atomic design principles when creating new components
- **COMMIT** frequently with clear, descriptive messages

## Project Goals ✅ ACHIEVED
1. ✅ Proper atomic design architecture implemented
2. ✅ 100% TypeScript type safety maintained
3. ✅ Zero ESLint errors or warnings
4. ✅ Clean, maintainable component structure
5. ✅ All functionality preserved and working