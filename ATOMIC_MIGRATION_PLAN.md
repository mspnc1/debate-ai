# Complete Atomic Design Migration Plan

## CRITICAL: ALL FUNCTIONALITY MUST BE RETAINED

## Current Component Inventory (40 components total)

### Currently in atoms/ (22 components)
1. ActualPricing.tsx
2. AIAvatar.tsx
3. Button.tsx
4. GlassCard.tsx
5. GradientButton.tsx
6. ModelBadge.tsx
7. ParameterLabel.tsx
8. PricingDisplay.tsx
9. SafeAreaView.tsx
10. SectionHeader.tsx
11. SelectionIndicator.tsx
12. StepperButton.tsx
13. Text.tsx
14. TextInput.tsx
15. ThemedButton.tsx
16. ThemedSafeAreaView.tsx
17. ThemedText.tsx
18. ThemedTextInput.tsx
19. ThemedView.tsx
20. View.tsx

### Currently in molecules/ (11 components)
1. AICard.tsx
2. DebateModeCard.tsx
3. GradientButton.tsx (DUPLICATE - also in atoms!)
4. GradientHeader.tsx
5. ModelSelector.tsx
6. ParameterSlider.tsx
7. PersonalityBadge.tsx
8. PersonalityPicker.tsx
9. QuickStartTile.tsx
10. SelectionSummary.tsx

### Currently in organisms/ (5 components)
1. AISelector.tsx
2. DynamicAISelector.tsx
3. PromptWizard.tsx
4. ProviderExpertSettings.tsx
5. QuickStartsSection.tsx

### Currently in components/ root (3 components)
1. AIServiceLoading.tsx
2. AppLogo.tsx
3. ExpertModeSettings.tsx
4. ProviderCard.tsx

## Migration Mapping - EVERY COMPONENT

### TRUE ATOMS (Only wrapper components)
These will be the ONLY components in atoms/:

| New Atom | Replaces | Implementation |
|----------|----------|----------------|
| Text.tsx | Text.tsx, ThemedText.tsx | Pure RN Text wrapper |
| Box.tsx | View.tsx, ThemedView.tsx | Pure RN View wrapper |
| Touchable.tsx | Part of Button.tsx, ThemedButton.tsx | Pure TouchableOpacity wrapper |
| Input.tsx | TextInput.tsx, ThemedTextInput.tsx | Pure RN TextInput wrapper |
| SafeArea.tsx | SafeAreaView.tsx, ThemedSafeAreaView.tsx | Pure SafeAreaView wrapper |
| Image.tsx | NEW | Pure RN Image wrapper |
| ScrollView.tsx | NEW | Pure RN ScrollView wrapper |
| ActivityIndicator.tsx | NEW | Pure RN ActivityIndicator wrapper |

### MOLECULES (Combinations of atoms with minimal logic)

| Component | Current Location | New Location | Dependencies | Functionality Retained |
|-----------|-----------------|--------------|--------------|------------------------|
| Typography | NEW (replaces ThemedText) | molecules/Typography.tsx | Text atom + theme | All variants, colors, weights |
| Button | Replaces ThemedButton + Button | molecules/Button.tsx | Touchable + Box + Text | All variants, sizes, loading states |
| GradientButton | molecules/GradientButton.tsx | molecules/GradientButton.tsx | LinearGradient + Touchable + Text | All gradients, variants, animations |
| Card | NEW (replaces part of GlassCard) | molecules/Card.tsx | Box + shadow styles | Basic card with padding/shadow |
| GlassCard | atoms/GlassCard.tsx | molecules/GlassCard.tsx | Box + BlurView | Blur effects, all current props |
| Avatar | Part of AIAvatar | molecules/Avatar.tsx | Image/Text + Box | Circle container, image/text display |
| Badge | atoms/ModelBadge.tsx | molecules/Badge.tsx | Box + Text | All current variants |
| InputField | NEW | molecules/InputField.tsx | Input + Text + Box | Label, input, error text |
| IconButton | atoms/StepperButton.tsx | molecules/IconButton.tsx | Touchable + Text/Icon | Plus/minus buttons, any icon |
| SelectionIndicator | atoms/SelectionIndicator.tsx | molecules/SelectionIndicator.tsx | Box + animations | Checkmark animation |
| SectionHeader | atoms/SectionHeader.tsx | molecules/SectionHeader.tsx | Typography + Box | Title + optional subtitle |
| ParameterLabel | atoms/ParameterLabel.tsx | molecules/ParameterLabel.tsx | Typography + Box | Label with value display |
| PricingBadge | atoms/PricingDisplay.tsx | molecules/PricingBadge.tsx | Typography + Box | Compact pricing display |

### ORGANISMS (Complex components with business logic)

| Component | Current Location | New Location | Dependencies | Functionality Retained |
|-----------|-----------------|--------------|--------------|------------------------|
| GradientHeader | molecules/GradientHeader.tsx | organisms/GradientHeader.tsx | Svg, Typography, animations | Wave shape, gradients, date/time, all animations |
| AIAvatar | atoms/AIAvatar.tsx | organisms/AIAvatar.tsx | Avatar + animations + theme | Selection state, animations, icon/letter logic |
| AICard | molecules/AICard.tsx | organisms/AICard.tsx | GlassCard + AIAvatar + PersonalityPicker | All current functionality |
| ActualPricing | atoms/ActualPricing.tsx | organisms/ActualPricing.tsx | Typography + business logic | All pricing calculations, free tier logic |
| ModelSelector | molecules/ModelSelector.tsx | organisms/ModelSelector.tsx | Card + Typography + Badge | Model selection, pricing display |
| ParameterSlider | molecules/ParameterSlider.tsx | organisms/ParameterSlider.tsx | Slider + Typography + Box | All parameter controls |
| PersonalityBadge | molecules/PersonalityBadge.tsx | organisms/PersonalityBadge.tsx | Badge + Typography | Personality display with lock icon |
| PersonalityPicker | molecules/PersonalityPicker.tsx | organisms/PersonalityPicker.tsx | Modal + PersonalityBadge | Full personality selection UI |
| QuickStartTile | molecules/QuickStartTile.tsx | organisms/QuickStartTile.tsx | Card + Typography + animations | Topic selection, disabled state |
| SelectionSummary | molecules/SelectionSummary.tsx | organisms/SelectionSummary.tsx | Typography + AIAvatar | Multi-AI summary display |
| DebateModeCard | molecules/DebateModeCard.tsx | organisms/DebateModeCard.tsx | Card + AIAvatar + Button | Debate mode UI, AI display |
| AISelector | organisms/AISelector.tsx | organisms/AISelector.tsx | NO CHANGE | Keep all functionality |
| DynamicAISelector | organisms/DynamicAISelector.tsx | organisms/DynamicAISelector.tsx | NO CHANGE | Keep all functionality |
| PromptWizard | organisms/PromptWizard.tsx | organisms/PromptWizard.tsx | NO CHANGE | Keep all functionality |
| ProviderExpertSettings | organisms/ProviderExpertSettings.tsx | organisms/ProviderExpertSettings.tsx | NO CHANGE | Keep all functionality |
| QuickStartsSection | organisms/QuickStartsSection.tsx | organisms/QuickStartsSection.tsx | NO CHANGE | Keep all functionality |
| AIServiceLoading | components/AIServiceLoading.tsx | organisms/AIServiceLoading.tsx | ActivityIndicator + Typography | Loading states |
| AppLogo | components/AppLogo.tsx | organisms/AppLogo.tsx | Image + Typography | App branding |
| ExpertModeSettings | components/ExpertModeSettings.tsx | organisms/ExpertModeSettings.tsx | Complex settings UI | All parameter controls |
| ProviderCard | components/ProviderCard.tsx | organisms/ProviderCard.tsx | Card + complex UI | Provider configuration |

## Duplicate Resolution

1. **GradientButton** - Currently in BOTH atoms/ and molecules/
   - Keep only in molecules/
   - Delete atoms/GradientButton.tsx

2. **Text vs ThemedText**
   - Create single Text atom (pure wrapper)
   - Create Typography molecule (with variants)
   - Delete ThemedText

3. **Button vs ThemedButton**
   - Create single Touchable atom
   - Create Button molecule
   - Delete both current versions

## Import Path Updates Required

### Sample HomeScreen Migration
```typescript
// BEFORE
import { GradientHeader } from '../components/molecules';
import { ThemedView, ThemedText } from '../components/atoms';

// AFTER
import { Box } from '../components/atoms';
import { Typography } from '../components/molecules';
import { GradientHeader } from '../components/organisms';
```

## Critical Functionality to Preserve

### GradientHeader (currently molecules/GradientHeader.tsx)
- SVG wave shape at bottom
- Gradient background animation
- Date/time display with live updates
- Title/subtitle animations on mount
- Safe area insets handling
- Floating geometry animations
- Must move to organisms/ (uses SVG, animations, multiple atoms)

### AIAvatar (currently atoms/AIAvatar.tsx)
- Letter or image display
- Size variants (small/medium/large)
- Selection animation with spring
- Circular container for letters
- No container for logos
- Color theming
- Must move to organisms/ (has business logic, animations)

### GlassCard (currently atoms/GlassCard.tsx)
- BlurView for glass effect
- Dark/light theme support
- Touchable support
- Padding variants
- Must move to molecules/ (uses BlurView + Box)

## Execution Methodology

### For EACH Component:
1. Create/migrate the component
2. Run `npx tsc --noEmit` - MUST pass
3. Run `npm run lint` - MUST have zero errors/warnings
4. Test component renders correctly
5. Update all imports that use this component
6. Run full type check again
7. Mark as ✅ in this document
8. Commit with message: "feat: migrate [component] to atomic architecture"

### Quality Gates - DO NOT PROCEED if:
- TypeScript has ANY errors
- ESLint has ANY warnings or errors  
- Component doesn't render
- Any screen using the component breaks

## Migration Order - SYSTEMATIC EXECUTION

### Phase 1: Create True Atoms
**STATUS: [ ] Not Started**

- [ ] 1. **Box.tsx** (View wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 2. **Text.tsx** (Text wrapper - rename existing)
  - Remove theme dependency from current Text.tsx
  - Make pure wrapper
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 3. **Touchable.tsx** (TouchableOpacity wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 4. **Input.tsx** (TextInput wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 5. **SafeArea.tsx** (SafeAreaView wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 6. **Image.tsx** (Image wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 7. **ScrollView.tsx** (ScrollView wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 8. **ActivityIndicator.tsx** (ActivityIndicator wrapper)
  - Create component
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

### Phase 2: Create Core Molecules
**STATUS: [ ] Not Started**

- [ ] 1. **Typography.tsx** (replaces ThemedText)
  - Create component using Text atom
  - Preserve ALL variants/colors/weights
  - Update all ThemedText imports
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Test all screens: [ ]
  - Commit: [ ]

- [ ] 2. **Button.tsx** (replaces ThemedButton)
  - Create component using Touchable + Box + Text
  - Preserve ALL variants/sizes
  - Update all ThemedButton imports
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Test all screens: [ ]
  - Commit: [ ]

- [ ] 3. **Card.tsx** (basic card)
  - Create component using Box
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 4. **InputField.tsx** (input with label)
  - Create component using Input + Typography + Box
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

### Phase 3: Migrate Existing Components
**STATUS: [ ] Not Started**

- [ ] 1. **GradientButton** (atoms → molecules)
  - Move file
  - Update imports
  - Delete duplicate in atoms/
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 2. **GlassCard** (atoms → molecules)
  - Move file
  - Update to use Box atom
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

- [ ] 3. **GradientHeader** (molecules → organisms)
  - Move file
  - Update imports
  - TypeScript check: [ ]
  - ESLint check: [ ]
  - Commit: [ ]

### Phase 4: Update All Imports
**STATUS: [ ] Not Started**

- [ ] WelcomeScreen.tsx
- [ ] HomeScreen.tsx  
- [ ] ChatScreen.tsx
- [ ] DebateScreen.tsx
- [ ] DebateSetupScreen.tsx
- [ ] HistoryScreen.tsx
- [ ] SettingsScreen.tsx
- [ ] StatsScreen.tsx

### Phase 5: Delete Old Components
**STATUS: [ ] Not Started**

- [ ] Delete ThemedText.tsx
- [ ] Delete ThemedView.tsx
- [ ] Delete ThemedButton.tsx
- [ ] Delete ThemedTextInput.tsx
- [ ] Delete ThemedSafeAreaView.tsx
- [ ] Delete old duplicate components
- [ ] Final TypeScript check
- [ ] Final ESLint check
- [ ] Final commit

## Implementation Example: Typography Molecule

To replace ThemedText properly, here's the exact implementation:

```typescript
// src/components/molecules/Typography.tsx
import React from 'react';
import { TextStyle } from 'react-native';
import { Text } from '../atoms/Text';
import { useTheme } from '../../theme';

interface TypographyProps {
  variant?: 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'button' | 'default';
  color?: 'primary' | 'secondary' | 'inverse' | 'error' | 'success' | 'disabled' | 'brand' | 'warning';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
  style?: TextStyle;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'default',
  color = 'primary',
  weight = 'normal',
  align = 'left',
  children,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  
  // Preserve ALL existing variants from ThemedText
  const variantStyles = {
    default: { fontSize: 16, lineHeight: 24 },
    body: { fontSize: 16, lineHeight: 24 },
    heading: { fontSize: 28, lineHeight: 36, fontWeight: 'bold' as const },
    title: { fontSize: 24, lineHeight: 32, fontWeight: 'bold' as const },
    subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '500' as const },
    caption: { fontSize: 14, lineHeight: 20 },
    button: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  };
  
  // Preserve ALL existing colors from ThemedText
  const colorMap = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    inverse: theme.colors.text.inverse,
    disabled: theme.colors.text.disabled,
    brand: theme.colors.brand,
    warning: theme.colors.warning[500],
    error: theme.colors.error[500],
    success: theme.colors.success[500],
  };
  
  const weightMap = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  };
  
  return (
    <Text 
      style={[
        variantStyles[variant],
        { 
          color: colorMap[color],
          fontWeight: weightMap[weight],
          textAlign: align 
        },
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
```

This preserves ALL functionality from ThemedText while properly using the Text atom.

## Testing Checklist
- [ ] Welcome Screen renders correctly
- [ ] Home Screen AI selection works
- [ ] Chat Screen messaging works
- [ ] Debate Mode functions properly
- [ ] Settings Screen loads
- [ ] API Configuration works
- [ ] History Screen displays sessions
- [ ] Stats Screen shows data
- [ ] Dark mode works throughout
- [ ] All animations function
- [ ] No TypeScript errors
- [ ] No ESLint warnings

## Import Update Strategy

### Automated Find/Replace Commands
```bash
# After creating Typography molecule, update all ThemedText imports:
find src -name "*.tsx" -exec sed -i '' 's/ThemedText/Typography/g' {} \;
find src -name "*.tsx" -exec sed -i '' 's/from "..\/atoms"/from "..\/molecules"/g' {} \;

# Update GradientHeader imports from molecules to organisms:
find src -name "*.tsx" -exec sed -i '' 's/from "..\/components\/molecules\/GradientHeader"/from "..\/components\/organisms\/GradientHeader"/g' {} \;
```

### Manual Import Updates Required
1. Check each file for combined imports (e.g., `import { ThemedText, ThemedView }`)
2. Split into appropriate atom/molecule imports
3. Update component usage to match new prop names if needed

## Rollback Plan
If migration breaks critical functionality:
1. `git stash` or `git reset --hard HEAD`
2. Review which component caused the break
3. Fix that specific component migration
4. Continue with smaller increments

## File Count Verification
- Before: 40 components total
- After Target: 8 atoms + 15 molecules + 25 organisms = 48 components
- Net Change: +8 components (pure atoms added, themed versions consolidated)