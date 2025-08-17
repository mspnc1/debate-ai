# API Implementation Plan
**Symposium AI - Step-by-Step Execution Guide for API Integration**

## Overview
This document provides executable steps for implementing the API architecture analyzed in `/docs/API_ARCHITECTURE_ANALYSIS.md`. The engineer should follow these steps sequentially to add Grok support, implement model selection, expert mode, and cost tracking.

## Pre-Implementation Checklist

### Files to Review First
1. **Core Types**: `/src/types/index.ts` - Understand AIConfig interface
2. **Provider Config**: `/src/config/aiProviders.ts` - Current provider structure
3. **Model Config**: `/src/config/modelConfigs.ts` - Model definitions
4. **Pricing Config**: `/src/config/modelPricing.ts` - Cost calculations
5. **Redux Store**: `/src/store/index.ts` - State management structure
6. **ModelSelector**: `/src/components/organisms/ModelSelector.tsx` - Existing UI

### Current State Verification
```bash
# Run these commands to verify current state
npx tsc --noEmit        # Should have ZERO errors
npm run lint            # Should have ZERO warnings
```

### Dependencies Check
- React Native Reanimated (already installed)
- Redux Toolkit (already installed)
- No new dependencies needed initially

---

## Phase 1: Foundation - Add Grok & Model Registry (Day 1-2)

### Step 1.1: Add Grok Provider
**File**: `/src/config/aiProviders.ts`

Add after DeepSeek entry (line 138):
```typescript
{
  id: 'grok',
  name: 'Grok',
  company: 'X.AI',
  color: '#1DA1F2',
  gradient: ['#1DA1F2', '#0E7490'],
  apiKeyPrefix: 'xai-',
  apiKeyPlaceholder: 'xai-...',
  docsUrl: 'https://docs.x.ai/api',
  getKeyUrl: 'https://console.x.ai/api-keys',
  description: 'Real-time knowledge, wit, and reasoning',
  features: ['Real-time info', 'Humor', 'Deep reasoning', '256K context'],
  testEndpoint: 'https://api.x.ai/v1/chat/completions',
  enabled: true,
},
```

### Step 1.2: Update Type Definitions
**File**: `/src/types/index.ts`

Update line 3:
```typescript
export type AIProvider = 'claude' | 'openai' | 'chatgpt' | 'google' | 'perplexity' | 'mistral' | 'cohere' | 'together' | 'deepseek' | 'grok';
```

Update User interface apiKeys (line 21):
```typescript
apiKeys?: {
  claude?: string;
  openai?: string;
  google?: string;
  perplexity?: string;
  mistral?: string;
  cohere?: string;
  together?: string;
  deepseek?: string;
  grok?: string;  // Add this line
};
```

### Step 1.3: Add Grok Models
**File**: `/src/config/modelConfigs.ts`

Add after deepseek section (line 220):
```typescript
grok: [
  {
    id: 'grok-4',
    name: 'Grok 4',
    description: 'Most capable model with real-time data',
    contextLength: 256000,
    isDefault: true,
    isPremium: true,
  },
  {
    id: 'grok-4-heavy',
    name: 'Grok 4 Heavy',
    description: 'Maximum capability for complex tasks',
    contextLength: 256000,
    isPremium: true,
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    description: 'Balanced performance and cost',
    contextLength: 128000,
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    description: 'Fast and efficient',
    contextLength: 128000,
  },
],
```

### Step 1.4: Add Grok Pricing
**File**: `/src/config/modelPricing.ts`

Add after deepseek section (line 140):
```typescript
grok: {
  'grok-4': {
    inputPer1M: 5.00,
    outputPer1M: 15.00,
  },
  'grok-4-heavy': {
    inputPer1M: 10.00,
    outputPer1M: 30.00,
  },
  'grok-3': {
    inputPer1M: 2.00,
    outputPer1M: 6.00,
  },
  'grok-3-mini': {
    inputPer1M: 0.05,
    outputPer1M: 0.15,
  },
},
```

### Step 1.5: Update Provider Parameters
**File**: `/src/config/modelConfigs.ts`

Add to PROVIDER_SUPPORTED_PARAMS (line 259):
```typescript
grok: ['temperature', 'maxTokens', 'topP', 'stopSequences', 'seed'],
```

### Step 1.6: Create Model Registry System
**File**: `/src/config/providers/modelRegistry.ts` (NEW FILE)

```typescript
import { ModelConfig } from '../modelConfigs';
import { ModelPricing } from '../modelPricing';

export interface ModelDefinition extends ModelConfig {
  pricing: ModelPricing;
  maxOutput: number;
  capabilities: {
    vision?: boolean;
    functions?: boolean;
    streaming: boolean;
    webSearch?: boolean;
  };
  releaseDate?: string;
  deprecated?: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  company: string;
  models: ModelDefinition[];
  defaultModel: string;
  supportedParameters: string[];
  rateLimits: {
    rpm: number;
    tpm: number;
    rpd?: number;
  };
}

// Model aliases for version management
export const MODEL_ALIASES: Record<string, string> = {
  'claude-sonnet-latest': 'claude-3-5-sonnet-20241022',
  'claude-haiku-latest': 'claude-3-5-haiku-20241022',
  'gpt-4o-latest': 'gpt-4o',
  'gemini-pro-latest': 'gemini-1.5-pro',
  // Add more aliases as needed
};

export const resolveModelAlias = (modelId: string): string => {
  return MODEL_ALIASES[modelId] || modelId;
};
```

**Implementation Note**: This registry system allows for easy model updates without changing code throughout the app.

### Step 1.7: Update AIConfig Interface
**File**: `/src/types/index.ts`

Update AIConfig interface (line 28):
```typescript
export interface AIConfig {
  id: string;
  provider: AIProvider;
  name: string;
  model: string;  // Remove optional, make required
  modelConfig?: {
    displayName: string;
    contextLength: number;
    pricing?: {
      inputPer1M: number;
      outputPer1M: number;
    };
  };
  personality?: string;
  parameters?: ModelParameters;  // For expert mode
  avatar?: string;
  icon?: string | number;
  iconType?: 'image' | 'letter';
  color?: string;
}
```

### Testing Checkpoint 1
```bash
# After completing Phase 1 steps:
npx tsc --noEmit  # Must pass with ZERO errors
npm run lint      # Must pass with ZERO warnings
```

---

## Phase 2: Model Selection UI (Day 2-3)

### Step 2.1: Create Enhanced Model Selector
**File**: `/src/components/organisms/ModelSelectorEnhanced.tsx` (NEW FILE)

```typescript
import React, { useMemo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Typography, Badge } from '../molecules';
import { useTheme } from '../../theme';
import { AI_MODELS } from '../../config/modelConfigs';
import { MODEL_PRICING, formatCost } from '../../config/modelPricing';

interface ModelSelectorEnhancedProps {
  providerId: string;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  showPricing?: boolean;
  compactMode?: boolean;
}

export const ModelSelectorEnhanced: React.FC<ModelSelectorEnhancedProps> = ({
  providerId,
  selectedModel,
  onSelectModel,
  showPricing = true,
  compactMode = false,
}) => {
  const { theme } = useTheme();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const isPremium = user?.subscription === 'pro' || user?.subscription === 'business';
  
  const models = useMemo(() => {
    return AI_MODELS[providerId] || [];
  }, [providerId]);
  
  const canSelectModel = (model: typeof models[0]) => {
    if (!model.isPremium) return true;
    return isPremium;
  };
  
  if (compactMode) {
    return (
      <TouchableOpacity
        onPress={() => {
          // Show modal or dropdown
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: theme.spacing.xs,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.sm,
        }}
      >
        <Typography variant="caption">
          {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
        </Typography>
      </TouchableOpacity>
    );
  }
  
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {models.map((model) => {
          const isSelected = selectedModel === model.id;
          const isLocked = !canSelectModel(model);
          const pricing = MODEL_PRICING[providerId]?.[model.id];
          
          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => !isLocked && onSelectModel(model.id)}
              disabled={isLocked}
              style={{
                backgroundColor: isSelected 
                  ? theme.colors.primary[500]
                  : theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginRight: theme.spacing.sm,
                opacity: isLocked ? 0.5 : 1,
                minWidth: 140,
              }}
            >
              <Typography 
                variant="subtitle" 
                weight="semibold"
                style={{ 
                  color: isSelected ? '#FFFFFF' : theme.colors.text.primary 
                }}
              >
                {model.name}
              </Typography>
              
              {model.isPremium && (
                <Badge 
                  label={isLocked ? "Locked" : "Premium"} 
                  type="premium" 
                />
              )}
              
              {showPricing && pricing && (
                <Typography variant="caption" color="secondary">
                  ~{formatCost(
                    (200 * pricing.inputPer1M + 800 * pricing.outputPer1M) / 1_000_000
                  )} per message
                </Typography>
              )}
              
              <Typography variant="caption" color="secondary">
                {(model.contextLength / 1000).toFixed(0)}K context
              </Typography>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
```

### Step 2.2: Update DebateSetupScreen for Model Selection
**File**: `/src/screens/DebateSetupScreen.tsx`

Add after line 67 (state declarations):
```typescript
const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
```

Add model selection handler after line 99:
```typescript
const handleModelSelect = (aiId: string, modelId: string) => {
  setSelectedModels(prev => ({
    ...prev,
    [aiId]: modelId
  }));
};
```

Update handleStartDebate to include models (around line 150):
```typescript
const aiConfigsWithModels = selectedAIs.map(ai => ({
  ...ai,
  model: selectedModels[ai.id] || AI_MODELS[ai.provider]?.[0]?.id || '',
}));
```

### Step 2.3: Add Model Selection to Redux Store
**File**: `/src/store/index.ts`

Add to ChatState interface (line 53):
```typescript
selectedModels: { [aiId: string]: string };
```

Update startSession reducer (line 68):
```typescript
startSession: (state, action: PayloadAction<{ 
  selectedAIs: AIConfig[]; 
  aiPersonalities?: { [aiId: string]: string };
  selectedModels?: { [aiId: string]: string };
}>) => {
  // ... existing code
  state.selectedModels = action.payload.selectedModels || {};
},
```

### Testing Checkpoint 2
```bash
# Test model selection:
1. Open app and navigate to Debate Setup
2. Verify Grok appears in provider list
3. Select an AI and verify model dropdown appears
4. Check that premium models show lock icon for free users
```

---

## Phase 3: Expert Mode Implementation (Day 3-4)

### Step 3.1: Create Expert Mode Panel
**File**: `/src/components/organisms/ExpertModePanel.tsx` (NEW FILE)

```typescript
import React, { useState } from 'react';
import { View, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { Typography, Button } from '../molecules';
import { useTheme } from '../../theme';
import { 
  ModelParameters, 
  DEFAULT_PARAMETERS, 
  PARAMETER_RANGES,
  PROVIDER_SUPPORTED_PARAMS 
} from '../../config/modelConfigs';

interface ExpertModePanelProps {
  providerId: string;
  parameters: ModelParameters;
  onUpdateParameters: (params: ModelParameters) => void;
  onClose: () => void;
}

const PRESETS = {
  creative: { temperature: 1.5, topP: 0.95 },
  balanced: { temperature: 0.7, topP: 0.85 },
  precise: { temperature: 0.3, topP: 0.75 },
};

export const ExpertModePanel: React.FC<ExpertModePanelProps> = ({
  providerId,
  parameters,
  onUpdateParameters,
  onClose,
}) => {
  const { theme } = useTheme();
  const [localParams, setLocalParams] = useState(parameters);
  const supportedParams = PROVIDER_SUPPORTED_PARAMS[providerId] || [];
  
  const applyPreset = (preset: keyof typeof PRESETS) => {
    const newParams = {
      ...localParams,
      ...PRESETS[preset],
    };
    setLocalParams(newParams);
    onUpdateParameters(newParams);
  };
  
  const handleParameterChange = (key: keyof ModelParameters, value: number) => {
    const newParams = {
      ...localParams,
      [key]: value,
    };
    setLocalParams(newParams);
  };
  
  return (
    <View style={{ 
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    }}>
      <Typography variant="h3" weight="bold" style={{ marginBottom: theme.spacing.md }}>
        Expert Mode Parameters
      </Typography>
      
      {/* Preset Buttons */}
      <View style={{ flexDirection: 'row', marginBottom: theme.spacing.lg }}>
        {Object.keys(PRESETS).map((preset) => (
          <Button
            key={preset}
            label={preset.charAt(0).toUpperCase() + preset.slice(1)}
            onPress={() => applyPreset(preset as keyof typeof PRESETS)}
            variant="outline"
            size="small"
            style={{ marginRight: theme.spacing.sm }}
          />
        ))}
      </View>
      
      {/* Temperature Slider */}
      {supportedParams.includes('temperature') && (
        <View style={{ marginBottom: theme.spacing.md }}>
          <Typography variant="subtitle" weight="semibold">
            Temperature: {localParams.temperature.toFixed(1)}
          </Typography>
          <Typography variant="caption" color="secondary">
            {PARAMETER_RANGES.temperature.description}
          </Typography>
          <Slider
            value={localParams.temperature}
            onValueChange={(val) => handleParameterChange('temperature', val)}
            minimumValue={PARAMETER_RANGES.temperature.min}
            maximumValue={PARAMETER_RANGES.temperature.max}
            step={PARAMETER_RANGES.temperature.step}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.colors.border}
          />
        </View>
      )}
      
      {/* Max Tokens Slider */}
      {supportedParams.includes('maxTokens') && (
        <View style={{ marginBottom: theme.spacing.md }}>
          <Typography variant="subtitle" weight="semibold">
            Max Tokens: {localParams.maxTokens}
          </Typography>
          <Typography variant="caption" color="secondary">
            {PARAMETER_RANGES.maxTokens.description}
          </Typography>
          <Slider
            value={localParams.maxTokens}
            onValueChange={(val) => handleParameterChange('maxTokens', Math.round(val))}
            minimumValue={100}
            maximumValue={4096}
            step={100}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.colors.border}
          />
        </View>
      )}
      
      {/* Apply Button */}
      <Button
        label="Apply Settings"
        onPress={() => {
          onUpdateParameters(localParams);
          onClose();
        }}
        variant="primary"
        fullWidth
      />
    </View>
  );
};
```

**Implementation Note**: Add more parameter controls based on PROVIDER_SUPPORTED_PARAMS.

### Step 3.2: Add Expert Mode Toggle to Settings
**File**: `/src/screens/SettingsScreen.tsx`

Add expert mode section (find appropriate location):
```typescript
{isPremium && (
  <View style={styles.section}>
    <Typography variant="h3" weight="bold">
      Expert Mode
    </Typography>
    <TouchableOpacity
      style={styles.settingRow}
      onPress={() => navigation.navigate('ExpertMode')}
    >
      <Typography>Configure AI Parameters</Typography>
      <Typography color="secondary">›</Typography>
    </TouchableOpacity>
  </View>
)}
```

### Testing Checkpoint 3
```bash
# Test expert mode:
1. Enable premium features
2. Open expert mode panel
3. Adjust temperature and max tokens
4. Apply preset and verify changes
5. Ensure parameters persist in Redux
```

---

## Phase 4: Cost Tracking Implementation (Day 4-5)

### Step 4.1: Create Cost Tracking Service
**File**: `/src/services/costTracker.ts` (NEW FILE)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateMessageCost } from '../config/modelPricing';

export interface TokenUsage {
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  timestamp: number;
  sessionId: string;
  messageId: string;
}

export interface CostSummary {
  total: number;
  byProvider: Record<string, number>;
  bySession: Record<string, number>;
  messageCount: number;
}

class CostTrackerService {
  private static instance: CostTrackerService;
  private usage: TokenUsage[] = [];
  private readonly STORAGE_KEY = 'token_usage_history';
  private readonly MAX_HISTORY_DAYS = 30;
  
  static getInstance(): CostTrackerService {
    if (!this.instance) {
      this.instance = new CostTrackerService();
    }
    return this.instance;
  }
  
  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.usage = JSON.parse(stored);
        this.cleanOldData();
      }
    } catch (error) {
      console.error('Failed to load usage history:', error);
    }
  }
  
  trackMessage(usage: TokenUsage) {
    this.usage.push(usage);
    this.persistUsage();
  }
  
  getSessionCost(sessionId: string): number {
    return this.usage
      .filter(u => u.sessionId === sessionId)
      .reduce((total, u) => {
        const cost = calculateMessageCost(
          u.providerId,
          u.modelId,
          u.inputTokens,
          u.outputTokens
        );
        return total + cost;
      }, 0);
  }
  
  getDailyCost(): CostSummary {
    const today = new Date().setHours(0, 0, 0, 0);
    const todayUsage = this.usage.filter(u => u.timestamp >= today);
    
    const summary: CostSummary = {
      total: 0,
      byProvider: {},
      bySession: {},
      messageCount: todayUsage.length,
    };
    
    todayUsage.forEach(u => {
      const cost = calculateMessageCost(
        u.providerId,
        u.modelId,
        u.inputTokens,
        u.outputTokens
      );
      
      summary.total += cost;
      summary.byProvider[u.providerId] = 
        (summary.byProvider[u.providerId] || 0) + cost;
      summary.bySession[u.sessionId] = 
        (summary.bySession[u.sessionId] || 0) + cost;
    });
    
    return summary;
  }
  
  private async persistUsage() {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.usage)
      );
    } catch (error) {
      console.error('Failed to persist usage:', error);
    }
  }
  
  private cleanOldData() {
    const cutoff = Date.now() - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    this.usage = this.usage.filter(u => u.timestamp > cutoff);
  }
}

export const costTracker = CostTrackerService.getInstance();
```

### Step 4.2: Create Cost Display Component
**File**: `/src/components/molecules/CostIndicator.tsx` (NEW FILE)

```typescript
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Typography } from './Typography';
import { Badge } from './Badge';
import { useTheme } from '../../theme';
import { formatCost } from '../../config/modelPricing';
import { costTracker } from '../../services/costTracker';

interface CostIndicatorProps {
  sessionId?: string;
  mode: 'compact' | 'detailed';
  refreshInterval?: number;
}

export const CostIndicator: React.FC<CostIndicatorProps> = ({
  sessionId,
  mode = 'compact',
  refreshInterval = 5000,
}) => {
  const { theme } = useTheme();
  const [cost, setCost] = useState(0);
  
  useEffect(() => {
    const updateCost = () => {
      if (sessionId) {
        setCost(costTracker.getSessionCost(sessionId));
      } else {
        setCost(costTracker.getDailyCost().total);
      }
    };
    
    updateCost();
    const interval = setInterval(updateCost, refreshInterval);
    return () => clearInterval(interval);
  }, [sessionId, refreshInterval]);
  
  if (mode === 'compact') {
    return (
      <Badge 
        label={formatCost(cost)} 
        type="info"
      />
    );
  }
  
  return (
    <View style={{ 
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
    }}>
      <Typography variant="caption" color="secondary">
        {sessionId ? 'Session Cost' : 'Today\'s Total'}
      </Typography>
      <Typography variant="subtitle" weight="bold">
        {formatCost(cost)}
      </Typography>
    </View>
  );
};
```

### Step 4.3: Integrate Cost Tracking with API Calls
**File**: `/src/utils/apiHelpers.ts` (UPDATE)

Add token tracking to API response handler:
```typescript
import { costTracker } from '../services/costTracker';

// In your API response handler, add:
const handleAPIResponse = async (
  response: any,
  providerId: string,
  modelId: string,
  sessionId: string,
  messageId: string
) => {
  // Extract token usage from response
  const usage = extractTokenUsage(response, providerId);
  
  if (usage) {
    costTracker.trackMessage({
      providerId,
      modelId,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      timestamp: Date.now(),
      sessionId,
      messageId,
    });
  }
  
  return response;
};

// Provider-specific token extraction
const extractTokenUsage = (response: any, provider: string) => {
  switch (provider) {
    case 'openai':
    case 'grok':
      return response.usage;
    case 'claude':
      return {
        promptTokens: response.usage?.input_tokens,
        completionTokens: response.usage?.output_tokens,
      };
    case 'google':
      return {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
      };
    default:
      return null;
  }
};
```

### Testing Checkpoint 4
```bash
# Test cost tracking:
1. Start a debate with multiple AIs
2. Send several messages
3. Verify cost indicator updates
4. Check session cost calculation
5. Verify daily totals in Stats screen
```

---

## Phase 5: Testing & Validation (Day 5-6)

### Step 5.1: Create Test Suite
**File**: `/src/__tests__/api-integration.test.ts` (NEW FILE)

```typescript
import { AI_MODELS } from '../config/modelConfigs';
import { MODEL_PRICING, calculateMessageCost } from '../config/modelPricing';
import { costTracker } from '../services/costTracker';

describe('API Integration Tests', () => {
  describe('Model Configuration', () => {
    test('All providers have at least one model', () => {
      const providers = ['claude', 'openai', 'google', 'grok', 'perplexity'];
      providers.forEach(provider => {
        expect(AI_MODELS[provider]).toBeDefined();
        expect(AI_MODELS[provider].length).toBeGreaterThan(0);
      });
    });
    
    test('All models have pricing information', () => {
      Object.entries(AI_MODELS).forEach(([provider, models]) => {
        models.forEach(model => {
          const pricing = MODEL_PRICING[provider]?.[model.id];
          expect(pricing).toBeDefined();
          expect(pricing.inputPer1M).toBeGreaterThan(0);
        });
      });
    });
    
    test('Default models are not premium', () => {
      Object.values(AI_MODELS).forEach(models => {
        const defaultModel = models.find(m => m.isDefault);
        if (defaultModel) {
          expect(defaultModel.isPremium).not.toBe(true);
        }
      });
    });
  });
  
  describe('Cost Calculation', () => {
    test('Calculates message cost correctly', () => {
      const cost = calculateMessageCost('openai', 'gpt-4o', 1000, 2000);
      const expected = (1000 * 2.50 + 2000 * 10.00) / 1_000_000;
      expect(cost).toBeCloseTo(expected, 4);
    });
    
    test('Returns 0 for unknown models', () => {
      const cost = calculateMessageCost('unknown', 'model', 1000, 1000);
      expect(cost).toBe(0);
    });
  });
  
  describe('Cost Tracker', () => {
    beforeEach(() => {
      costTracker.initialize();
    });
    
    test('Tracks message usage', () => {
      costTracker.trackMessage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 500,
        outputTokens: 1000,
        timestamp: Date.now(),
        sessionId: 'test-session',
        messageId: 'msg-1',
      });
      
      const sessionCost = costTracker.getSessionCost('test-session');
      expect(sessionCost).toBeGreaterThan(0);
    });
  });
});
```

### Step 5.2: Manual Testing Checklist

```markdown
## Manual Testing Checklist

### Grok Integration
- [ ] Grok appears in provider list
- [ ] Can add Grok API key
- [ ] API key validation works
- [ ] Grok models display correctly
- [ ] Can select different Grok models

### Model Selection
- [ ] Model dropdown appears for each AI
- [ ] Premium models locked for free users
- [ ] Model selection persists in Redux
- [ ] Pricing displays correctly
- [ ] Context window info shows

### Expert Mode
- [ ] Expert mode toggle in settings (premium only)
- [ ] Parameter sliders work smoothly
- [ ] Presets apply correctly
- [ ] Parameters persist between sessions
- [ ] Provider-specific params show/hide correctly

### Cost Tracking
- [ ] Cost updates after each message
- [ ] Session cost calculates correctly
- [ ] Daily totals accurate
- [ ] Cost display formats properly
- [ ] Historical data persists

### Performance
- [ ] No lag when switching models
- [ ] Smooth slider interactions
- [ ] Fast cost calculations
- [ ] No memory leaks with tracking
```

### Step 5.3: Performance Benchmarks

```typescript
// Add to test file
describe('Performance Benchmarks', () => {
  test('Model selection renders under 100ms', async () => {
    const start = performance.now();
    // Render ModelSelectorEnhanced
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });
  
  test('Cost calculation under 10ms for 1000 messages', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateMessageCost('openai', 'gpt-4o', 500, 1000);
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(10);
  });
});
```

---

## Error Handling Strategies

### API Key Validation Errors
```typescript
const validateAPIKey = async (provider: string, key: string): Promise<boolean> => {
  try {
    // Provider-specific validation
    const response = await testProviderConnection(provider, key);
    return response.success;
  } catch (error) {
    Alert.alert(
      'Invalid API Key',
      `The ${provider} API key appears to be invalid. Please check and try again.`,
      [{ text: 'OK' }]
    );
    return false;
  }
};
```

### Model Unavailability
```typescript
const handleModelUnavailable = (provider: string, modelId: string) => {
  const fallback = AI_MODELS[provider]?.find(m => m.isDefault)?.id;
  if (fallback) {
    Alert.alert(
      'Model Unavailable',
      `${modelId} is temporarily unavailable. Using ${fallback} instead.`
    );
    return fallback;
  }
  throw new Error(`No models available for ${provider}`);
};
```

### Rate Limiting
```typescript
const handleRateLimit = (error: any) => {
  const retryAfter = error.headers?.['retry-after'] || 60;
  Alert.alert(
    'Rate Limited',
    `Please wait ${retryAfter} seconds before trying again.`,
    [{ text: 'OK' }]
  );
};
```

---

## Rollback Procedures

If issues arise during implementation:

### Phase 1 Rollback
```bash
# Revert Grok additions
git checkout -- src/config/aiProviders.ts
git checkout -- src/types/index.ts
git checkout -- src/config/modelConfigs.ts
git checkout -- src/config/modelPricing.ts
```

### Phase 2 Rollback
```bash
# Revert UI changes
git checkout -- src/screens/DebateSetupScreen.tsx
git checkout -- src/store/index.ts
rm src/components/organisms/ModelSelectorEnhanced.tsx
```

### Emergency Full Rollback
```bash
# Create backup branch first
git checkout -b backup-api-implementation
git checkout main
git reset --hard HEAD~[number of commits]
```

---

## Decision Points for Engineer

### 1. Model Display Format
**Option A**: Show full model names (e.g., "claude-3-5-sonnet-20241022")
**Option B**: Show friendly names (e.g., "Claude 3.5 Sonnet")
**Recommendation**: Option B for better UX

### 2. Cost Display Precision
**Option A**: Always show 3 decimal places ($0.003)
**Option B**: Dynamic based on amount (<$0.01 = 3 decimals, else 2)
**Recommendation**: Option B for cleaner display

### 3. Expert Mode Access
**Option A**: Hidden behind settings
**Option B**: Toggle directly in debate setup
**Recommendation**: Option A to avoid UI clutter

### 4. Parameter Persistence
**Option A**: Save per provider
**Option B**: Save per model
**Recommendation**: Option B for more granular control

---

## Implementation Notes

### Critical Details

**⚠️ TypeScript Compliance**
- MUST maintain zero TypeScript errors
- Use strict type checking throughout
- No `any` types allowed

**⚠️ Redux State Management**
- Always dispatch actions for state changes
- Use selectors for accessing state
- Maintain immutability

**⚠️ Performance Optimization**
- Use React.memo for expensive components
- Implement useMemo for calculations
- Debounce slider updates

**⚠️ Testing Requirements**
- Run full test suite after each phase
- Manual testing required for UI changes
- Performance benchmarks must pass

---

## Success Criteria

✅ **Phase 1 Complete When:**
- Grok provider fully integrated
- Model registry system functional
- All TypeScript errors resolved

✅ **Phase 2 Complete When:**
- Model selection UI working
- Premium/free logic implemented
- Redux integration complete

✅ **Phase 3 Complete When:**
- Expert mode panel functional
- Parameters persist correctly
- Presets working

✅ **Phase 4 Complete When:**
- Cost tracking accurate
- Display components working
- Historical data persisting

✅ **Phase 5 Complete When:**
- All tests passing
- Performance benchmarks met
- Manual testing checklist complete

---

## Final Verification

Before marking implementation complete:

```bash
# Code quality checks
npx tsc --noEmit        # MUST have ZERO errors
npm run lint            # MUST have ZERO warnings
npm test                # All tests MUST pass

# Manual verification
- [ ] All 9 providers functional
- [ ] Model selection working
- [ ] Expert mode operational
- [ ] Cost tracking accurate
- [ ] No performance regressions
```

## Support Resources

- API Documentation: `/docs/API_ARCHITECTURE_ANALYSIS.md`
- Provider Docs: Check each provider's `docsUrl` in `aiProviders.ts`
- React Native: https://reactnative.dev/docs/getting-started
- Redux Toolkit: https://redux-toolkit.js.org/