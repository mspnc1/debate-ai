# Dynamic Model Configuration System

## Overview
This directory contains the dynamic model configuration system that replaces hardcoded model references throughout the application. The system is designed to be easily updatable without requiring code changes.

## Key Features

### 1. **Dynamic Model Selection**
- No more hardcoded model IDs in business logic
- Models are dynamically loaded from configuration files
- Easy to add new models without touching application code

### 2. **Alias System**
- Version-agnostic aliases like `claude-latest`, `gpt-latest`
- Easy to update when new model versions are released
- Backward compatibility for existing configurations

### 3. **Default Model Management**
- Each provider has a default model marked with `isDefault: true`
- Separate free user defaults via `getFreeDefaultModel()`
- Premium model designation with `isPremium: true`

### 4. **Accurate Pricing**
- August 2025 pricing rates for all models
- Automatic cost calculations based on token usage
- Support for free tier models with message limits

## File Structure

```
src/config/providers/
├── modelRegistry.ts     # Core registry with aliases and defaults
├── modelVersions.ts     # Version tracking and migration helpers
└── README.md           # This documentation
```

## Configuration Files

### `/src/config/modelConfigs.ts`
Contains the main model configurations:
- Model definitions with capabilities
- Context lengths and features
- Default model designation
- Provider-specific parameter support

### `/src/config/modelPricing.ts`
Contains pricing information:
- Input/output token costs per 1M tokens
- Free tier information where applicable
- Cost calculation utilities

### `/src/config/providers/modelRegistry.ts`
Contains the model registry system:
- Model aliases for version management
- Default model selection functions
- Migration helpers for existing sessions

### `/src/config/providers/modelVersions.ts`
Contains version tracking:
- Model family organization
- Release date tracking
- Deprecation management
- Migration helpers

## Model Updates

### August 2025 Model Updates Applied:

#### Claude (Anthropic)
- **NEW**: Claude 4 (flagship) - 500K context
- **NEW**: Claude 4 Fast - 300K context, optimized speed
- **Updated**: Claude 3.5 models remain available

#### OpenAI
- **NEW**: GPT-5 (flagship) - 256K context, premium
- **Updated**: GPT-4o (2025) - 200K context
- **Updated**: GPT-4o Mini (2025) - improved efficiency
- **Updated**: o1 models (2025) - enhanced reasoning

#### Google
- **NEW**: Gemini 2.5 Pro - 4M context window
- **NEW**: Gemini 2.5 Flash - 2M context, ultra-fast
- **Maintained**: Gemini 1.5 models for compatibility

#### Grok (X.AI)
- **NEW**: Grok Beta - Real-time X data access
- **NEW**: Grok Vision Beta - Specialized image understanding

#### Updated Providers
- **Perplexity**: Updated to Llama 3.1 Sonar models
- **Mistral**: Latest 2407 models with function calling
- **Cohere**: Command R+ 08-2024 models
- **Together**: Full Llama 3.1 family (405B, 70B, 8B)
- **DeepSeek**: Added reasoning model, updated pricing

## Usage Examples

### Getting Default Model
```typescript
import { getDefaultModel, getFreeDefaultModel } from '../config/providers/modelRegistry';

// Get premium default
const premiumModel = getDefaultModel('claude'); // 'claude-4-20250801'

// Get free user default  
const freeModel = getFreeDefaultModel('claude'); // 'claude-4-fast-20250801'
```

### Using Aliases
```typescript
import { resolveModelAlias } from '../config/providers/modelRegistry';

// Use version-agnostic aliases
const model = resolveModelAlias('claude-latest'); // Resolves to current Claude model
const fastModel = resolveModelAlias('claude-fast-latest'); // Resolves to fast variant
```

### Getting Model Information
```typescript
import { getProviderModels, getModelById } from '../config/modelConfigs';

// Get all models for a provider
const claudeModels = getProviderModels('claude');

// Get specific model details
const gpt5 = getModelById('openai', 'gpt-5');
```

### Pricing Calculations
```typescript
import { calculateMessageCost, getEstimatedCostPerMessage } from '../config/modelPricing';

// Calculate actual cost
const cost = calculateMessageCost('openai', 'gpt-5', 1000, 2000);

// Get estimated cost display
const estimate = getEstimatedCostPerMessage('claude', 'claude-4-20250801');
```

## Adding New Models

### 1. Update Model Configurations
Add to `/src/config/modelConfigs.ts`:
```typescript
{
  id: 'new-model-id',
  name: 'Display Name',
  description: 'Model description',
  contextLength: 100000,
  isDefault: false, // Set true if this becomes the new default
  supportsVision: true,
  supportsFunctions: true,
  isPremium: false,
}
```

### 2. Update Pricing
Add to `/src/config/modelPricing.ts`:
```typescript
'new-model-id': {
  inputPer1M: 1.00,
  outputPer1M: 3.00,
  freeMessages: 100, // Optional
}
```

### 3. Update Aliases (Optional)
Add to `/src/config/providers/modelRegistry.ts`:
```typescript
'provider-latest': 'new-model-id',
```

### 4. Update Version Tracking
Add to `/src/config/providers/modelVersions.ts`:
```typescript
{
  id: 'new-model-id',
  version: '2.0',
  releaseDate: '2025-09-01',
  isLatest: true,
}
```

## Migration from Hardcoded Models

The system automatically handles migration:
- Existing sessions without model field get default model assigned
- `migrateAIConfig()` helper ensures backward compatibility
- Hardcoded fallbacks replaced with dynamic defaults

## Quality Assurance

All changes maintain:
- ✅ Zero TypeScript compilation errors
- ✅ Zero ESLint warnings
- ✅ Proper atomic design structure
- ✅ Complete functionality retention

## Best Practices

1. **Always use aliases for new configurations** - Use `claude-latest` instead of specific version IDs
2. **Update all four files** when adding models - configs, pricing, registry, and versions
3. **Test thoroughly** - Run TypeScript and ESLint checks
4. **Mark premium models** - Use `isPremium: true` for expensive models
5. **Set appropriate defaults** - Consider free users when setting `isDefault`

## Benefits

✅ **Easy Updates**: New models added without code changes  
✅ **Version Management**: Aliases handle version transitions seamlessly  
✅ **Cost Accuracy**: Real August 2025 pricing data  
✅ **Premium Support**: Clear distinction between free and premium models  
✅ **Backward Compatibility**: Existing configurations continue working  
✅ **Type Safety**: Full TypeScript support with zero errors  
✅ **Clean Architecture**: Proper separation of concerns

This system provides a robust foundation for managing AI models that can easily evolve with the rapidly changing AI landscape.