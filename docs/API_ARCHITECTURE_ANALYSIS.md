# API Architecture Analysis & Recommendations
**Symposium AI - Comprehensive Provider Integration Strategy**

## Executive Summary

This document provides a thorough analysis of the current API integration architecture and proposes a scalable, maintainable solution for managing 9 AI providers with their respective models, pricing, and parameters. The recommendations follow React Native community standards while adhering to the app's existing atomic design architecture.

## 1. Current State Analysis

### 1.1 Provider Coverage
**Currently Implemented (8 providers):**
- Claude (Anthropic)
- OpenAI/ChatGPT
- Gemini (Google)
- Perplexity
- Mistral
- Cohere (disabled)
- Together (disabled)
- DeepSeek (disabled)

**Missing Provider:**
- **Grok (X.AI)** - Not implemented despite having documentation

### 1.2 Architecture Strengths
- Clean atomic design structure (atoms/molecules/organisms)
- Proper TypeScript typing with interfaces
- Modular configuration files (`aiProviders.ts`, `modelConfigs.ts`, `modelPricing.ts`)
- Existing `ModelSelector` component for UI
- Redux store managing AI configurations

### 1.3 Current Limitations
1. **Model Selection:** AIConfig type has `model?: string` but it's not actively used
2. **No Grok Integration:** Despite having API documentation
3. **Hardcoded Models:** Model names are hardcoded, prone to becoming outdated
4. **Limited Expert Mode:** Parameters exist but UI/UX is incomplete
5. **No Cost Tracking:** Pricing data exists but not utilized for tracking
6. **Manual Updates Required:** When providers update models, manual code changes needed

## 2. Provider Capability Analysis

Based on comprehensive API documentation review:

### 2.1 Tier 1 - Full Featured Providers
| Provider | Models | Key Features | Pricing Range |
|----------|--------|--------------|---------------|
| **Claude** | 4 Opus, 4 Sonnet, Haiku | Vision, Functions, 200K-1M context | $0.80-$75/1M |
| **OpenAI** | GPT-5, GPT-5-mini, GPT-5-nano | Reasoning modes, 400K context, Cache discount | $0.05-$10/1M |
| **Gemini** | 2.5 Pro, Flash, Flash-Lite | 1M context, Multimodal, Free tier | $0.10-$15/1M |
| **Grok** | Grok 4, 4 Heavy, 3, 3 Mini | 256K context, OpenAI compatible | $0.05-$15/1M |

### 2.2 Tier 2 - Specialized Providers
| Provider | Models | Key Features | Pricing Range |
|----------|--------|--------------|---------------|
| **Perplexity** | Sonar, Sonar Pro | Real-time web search, Citations | $1.33/1M + search |
| **Mistral** | Large, Medium, Small, Mixtral | Multilingual, European | $0.70-$12/1M |
| **Cohere** | Command R+, R, Base | RAG optimization, Search | $0.50-$15/1M |

### 2.3 Tier 3 - Alternative Providers
| Provider | Models | Key Features | Pricing Range |
|----------|--------|--------------|---------------|
| **Together** | Llama 3.1, Mixtral, Qwen | Open source models | $0.60-$15/1M |
| **DeepSeek** | Chat, Coder | Cost-effective, Code focus | $0.14-$0.28/1M |

## 3. Proposed Architecture

### 3.1 Model Inventory System

```typescript
// src/config/providers/modelRegistry.ts
export interface ModelDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  contextLength: number;
  maxOutput: number;
  pricing: {
    inputPer1M: number;
    outputPer1M: number;
    cachedInputPer1M?: number; // For providers with cache discounts
  };
  capabilities: {
    vision?: boolean;
    functions?: boolean;
    streaming: boolean;
    webSearch?: boolean;
  };
  isDefault?: boolean;  // Free tier default model
  isPremium?: boolean;   // Premium-only model
  deprecated?: boolean;  // For phased removal
  releaseDate?: string;  // For tracking model versions
}

export interface ProviderDefinition {
  id: string;
  name: string;
  company: string;
  models: ModelDefinition[];
  defaultModel: string; // ID of default model for free tier
  supportedParameters: string[];
  rateLimits: {
    rpm: number;  // Requests per minute
    tpm: number;  // Tokens per minute
    rpd?: number; // Requests per day
  };
  requiresSubscription?: boolean;
  minimumSubscriptionTier?: 'free' | 'pro' | 'business';
}
```

### 3.2 Dynamic Model Management

```typescript
// src/config/providers/[provider]/models.ts
// Separate file per provider for maintainability

export const CLAUDE_MODELS: ModelDefinition[] = [
  {
    id: 'claude-4-opus-latest',
    name: 'Claude 4 Opus',
    displayName: 'Opus (Advanced)',
    description: 'Most capable model for complex reasoning',
    contextLength: 200000,
    maxOutput: 8192,
    pricing: {
      inputPer1M: 15.00,
      outputPer1M: 75.00
    },
    capabilities: {
      vision: true,
      functions: true,
      streaming: true
    },
    isPremium: true,
    releaseDate: '2025-05'
  },
  // ... more models
];

// Use 'latest' aliases to avoid hardcoding versions
export const MODEL_ALIASES = {
  'claude-opus-latest': 'claude-4-opus-20250514',
  'claude-sonnet-latest': 'claude-4-sonnet-20250514',
  // Automatically map to current versions
};
```

### 3.3 Model Selection UI Architecture

```typescript
// Enhanced AIConfig with model selection
export interface AIConfig {
  id: string;
  provider: AIProvider;
  name: string;
  model: string;  // Make required, not optional
  modelConfig?: {
    displayName: string;
    pricing: ModelPricing;
    capabilities: ModelCapabilities;
  };
  personality?: string;
  parameters?: ModelParameters; // Expert mode
  // ... existing fields
}
```

**UI Flow:**
1. User taps AI provider button (existing)
2. Secondary dropdown appears showing:
   - Model name with badge (Default/Premium)
   - Pricing info ($X.XX per 1K tokens)
   - Context window (e.g., "200K tokens")
3. Free users see locked premium models
4. Selection updates Redux store

### 3.4 Expert Mode Parameter Architecture

```typescript
// src/components/organisms/ExpertModePanel.tsx
interface ExpertModeConfig {
  provider: string;
  model: string;
  parameters: {
    temperature: SliderConfig;
    maxTokens: SliderConfig;
    topP?: SliderConfig;
    // Provider-specific parameters
    reasoningEffort?: SelectConfig; // GPT-5
    verbosity?: SelectConfig;        // GPT-5
    searchDomains?: ArrayConfig;     // Perplexity
  };
  presets: {
    creative: ModelParameters;
    balanced: ModelParameters;
    precise: ModelParameters;
    custom: ModelParameters;
  };
}
```

**UI Components:**
- Collapsible panel per AI in debate setup
- Slider components with tooltips
- Preset buttons for quick configuration
- "Reset to defaults" option
- Real-time cost estimate update

## 4. Cost Tracking Solution

### 4.1 Token Tracking Architecture

```typescript
// src/services/costTracking.ts
interface TokenUsage {
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  timestamp: number;
  sessionId: string;
  messageId: string;
}

class CostTracker {
  private usage: TokenUsage[] = [];
  
  trackMessage(usage: TokenUsage) {
    this.usage.push(usage);
    this.updateSessionCost(usage.sessionId);
    this.persistUsage();
  }
  
  getSessionCost(sessionId: string): number {
    return this.usage
      .filter(u => u.sessionId === sessionId)
      .reduce((total, u) => {
        const pricing = MODEL_PRICING[u.providerId][u.modelId];
        return total + calculateCost(u, pricing);
      }, 0);
  }
  
  getDailyCost(): number {
    const today = new Date().setHours(0,0,0,0);
    return this.usage
      .filter(u => u.timestamp >= today)
      .reduce((total, u) => total + calculateCost(u), 0);
  }
}
```

### 4.2 Real-time Cost Display

```typescript
// src/components/molecules/CostIndicator.tsx
export const CostIndicator: React.FC<{
  sessionCost: number;
  estimatedCost?: number;
  mode: 'compact' | 'detailed';
}> = ({ sessionCost, estimatedCost, mode }) => {
  if (mode === 'compact') {
    return <Badge label={`$${sessionCost.toFixed(3)}`} type="info" />;
  }
  
  return (
    <View>
      <Typography variant="caption">Session: ${sessionCost.toFixed(3)}</Typography>
      {estimatedCost && (
        <Typography variant="caption" color="secondary">
          Est. next: ~${estimatedCost.toFixed(3)}
        </Typography>
      )}
    </View>
  );
};
```

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. ✅ Add Grok provider to `aiProviders.ts`
2. ✅ Create `modelRegistry.ts` with dynamic model system
3. ✅ Migrate existing models to new structure
4. ✅ Update TypeScript types (make model required in AIConfig)

### Phase 2: Model Selection UI (Week 1-2)
1. ✅ Enhance `ModelSelector` component with pricing display
2. ✅ Add model selection to `DebateSetupScreen`
3. ✅ Implement free/premium model locking
4. ✅ Update Redux store to persist model selections

### Phase 3: Expert Mode (Week 2)
1. ✅ Create `ExpertModePanel` organism
2. ✅ Implement parameter sliders with provider-specific options
3. ✅ Add parameter presets
4. ✅ Integrate with debate/chat screens

### Phase 4: Cost Tracking (Week 2-3)
1. ✅ Implement `CostTracker` service
2. ✅ Add token counting to API responses
3. ✅ Create cost display components
4. ✅ Add usage analytics to Stats screen

### Phase 5: Testing & Polish (Week 3)
1. ✅ Test all 9 providers with real API calls
2. ✅ Verify pricing calculations
3. ✅ Performance optimization
4. ✅ Error handling and edge cases

## 6. Key Architecture Decisions

### 6.1 No Automation Policy
- **Manual Selection Only:** Users choose provider, model, and parameters
- **No Smart Routing:** No automatic provider selection based on task
- **No Recommendations:** Present information, let users decide
- **Clear Pricing:** Always show costs upfront

### 6.2 Maintainability Focus
- **Separate Model Files:** Each provider gets its own model configuration
- **Version Aliases:** Use "latest" aliases to avoid hardcoding versions
- **Deprecation Support:** Mark old models as deprecated before removal
- **Easy Updates:** Adding new models requires only config changes

### 6.3 React Native Best Practices
- **Atomic Design:** All new components follow atoms/molecules/organisms
- **TypeScript Strict:** Full type safety, no any types
- **Performance:** Use React.memo, useMemo for expensive computations
- **Accessibility:** All UI elements properly labeled

## 7. Migration Strategy

### 7.1 Backward Compatibility
```typescript
// Support existing AIConfig without model
const getDefaultModel = (provider: string): string => {
  return PROVIDER_REGISTRY[provider].defaultModel;
};

// Migration function for existing sessions
const migrateAIConfig = (config: AIConfig): AIConfig => {
  if (!config.model) {
    config.model = getDefaultModel(config.provider);
  }
  return config;
};
```

### 7.2 Gradual Rollout
1. **Phase 1:** Add model field, default to current models
2. **Phase 2:** Show model selector for premium users
3. **Phase 3:** Enable expert mode parameters
4. **Phase 4:** Activate cost tracking
5. **Phase 5:** Full feature release

## 8. Technical Specifications

### 8.1 API Response Handling
```typescript
interface APIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens?: number;
  };
  model?: string; // Actual model used (may differ from requested)
  finishReason?: string;
}
```

### 8.2 Provider Adapters
```typescript
abstract class ProviderAdapter {
  abstract sendMessage(
    message: string,
    model: string,
    parameters: ModelParameters
  ): Promise<APIResponse>;
  
  abstract streamMessage(
    message: string,
    model: string,
    parameters: ModelParameters,
    onChunk: (chunk: string) => void
  ): Promise<APIResponse>;
  
  abstract countTokens(text: string): number;
  abstract validateAPIKey(key: string): Promise<boolean>;
}
```

## 9. UI/UX Specifications

### 9.1 Model Selection Dropdown
- **Trigger:** Tap on AI provider button
- **Display:** Modal or dropdown panel
- **Content:**
  - Model name with performance indicator
  - Price per message estimate
  - Context window size
  - Premium lock icon if applicable
- **Interaction:** Single tap to select, auto-close

### 9.2 Expert Mode Interface
- **Location:** Collapsible section in debate setup
- **Defaults:** Hidden for simple mode, visible for expert mode
- **Controls:**
  - Temperature slider (0-2)
  - Max tokens input (1-8192)
  - Advanced parameters (provider-specific)
  - Preset buttons (Creative/Balanced/Precise)

### 9.3 Cost Display
- **Locations:**
  - Debate screen (running total)
  - Chat screen (per message)
  - Stats screen (historical)
- **Format:** "$0.003" for small amounts, "$1.23" for larger
- **Update:** Real-time after each response

## 10. Error Handling

### 10.1 Model Availability
```typescript
const handleModelUnavailable = (error: ModelError) => {
  // Fallback to default model
  const fallbackModel = getDefaultModel(error.provider);
  
  // Notify user
  Alert.alert(
    'Model Unavailable',
    `${error.model} is temporarily unavailable. Using ${fallbackModel} instead.`,
    [{ text: 'OK' }]
  );
  
  // Continue with fallback
  return fallbackModel;
};
```

### 10.2 Rate Limiting
- Display remaining quota in expert mode
- Queue requests when approaching limits
- Show cooldown timer when rate limited

## 11. Performance Considerations

### 11.1 Model Data Caching
```typescript
// Cache model configurations to avoid repeated lookups
const modelCache = new Map<string, ModelDefinition>();

const getModel = (provider: string, modelId: string): ModelDefinition => {
  const key = `${provider}:${modelId}`;
  if (!modelCache.has(key)) {
    const model = PROVIDER_REGISTRY[provider].models.find(m => m.id === modelId);
    if (model) modelCache.set(key, model);
  }
  return modelCache.get(key);
};
```

### 11.2 Lazy Loading
- Load provider configurations on-demand
- Defer expert mode components until needed
- Stream pricing updates asynchronously

## 12. Security Considerations

### 12.1 API Key Validation
- Validate format before storing
- Test with minimal API call
- Never log or display full keys
- Implement key rotation reminders

### 12.2 Cost Limits
- Optional daily/monthly spending limits
- Warning at 80% of limit
- Auto-pause at 100% (user configurable)

## Conclusion

This architecture provides a scalable, maintainable solution for managing multiple AI providers while maintaining the app's clean atomic design. The modular approach allows for easy updates as providers change their offerings, while the no-automation policy keeps users in control of their experience and costs.

The implementation focuses on:
1. **Flexibility:** Easy to add/update models and providers
2. **Transparency:** Clear pricing and capabilities
3. **Control:** Users manually select everything
4. **Maintainability:** Clean separation of concerns
5. **Performance:** Optimized for React Native

Next steps involve implementing Phase 1 (Foundation) starting with adding Grok provider support and creating the dynamic model registry system.