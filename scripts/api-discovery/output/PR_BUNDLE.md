# PR Bundle: Curated Model and Capability Updates

This bundle consolidates curated entries to update:
- src/config/modelConfigs.ts (add curated models)
- src/config/providerCapabilities.ts (image/video generation blocks)

## ModelConfigs additions (curated)
### Provider: openai
```ts
// Curated ModelConfig entries for AI_MODELS['openai'] (default + recommended)
{
      id: 'gpt-5.5',
      name: 'gpt-5.5',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
      isDefault: true,
    },
{
      id: 'gpt-5.4-mini',
      name: 'gpt-5.4-mini',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
    },
{
      id: 'gpt-5.4-nano',
      name: 'gpt-5.4-nano',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
    },
{
      id: 'o3',
      name: 'o3',
      description: 'No description available',
      contextLength: 128000,
    },
{
      id: 'o4-mini',
      name: 'o4-mini',
      description: 'No description available',
      contextLength: 128000,
    },
{
      id: 'gpt-image-2',
      name: 'GPT Image 2',
      description: 'No description available',
      contextLength: 128000,
      supportsImageGeneration: true,
    },
```
### Provider: claude
```ts
// Curated ModelConfig entries for AI_MODELS['claude'] (default + recommended)
{
      id: 'claude-opus-4-8',
      name: 'Claude Opus 4.8',
      description: 'Anthropic\'s most capable model for complex reasoning, long-horizon agentic coding, and high-autonomy work',
      contextLength: 1048576,
      maxOutputTokens: 128000, // Pricing: $5/1M in, $25/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      isDefault: true,
    },
{
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
    },
{
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude 4.5 Haiku',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
    },
```
### Provider: google
```ts
// Curated ModelConfig entries for AI_MODELS['google'] (default + recommended)
{
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      description: 'Gemini 3.5 Flash',
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
      isDefault: true,
    },
{
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro Preview',
      description: 'Gemini 3.1 Pro Preview',
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
{
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      description: 'Gemini 3.1 Flash Lite',
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
{
      id: 'imagen-4.0-generate-001',
      name: 'Imagen 4',
      description: 'Vertex served Imagen 4.0 model',
      contextLength: 480,
      maxOutputTokens: 8192,
      supportsImageGeneration: true,
    },
```
### Provider: perplexity
```ts
// Curated ModelConfig entries for AI_MODELS['perplexity'] (default + recommended)
{
      id: 'sonar-pro',
      name: 'Sonar Pro',
      description: 'No description available',
      contextLength: 128000,
      supportsWebSearch: true,
      isDefault: true,
    },
{
      id: 'sonar',
      name: 'Sonar',
      description: 'No description available',
      contextLength: 128000,
      supportsWebSearch: true,
    },
{
      id: 'sonar-reasoning-pro',
      name: 'Sonar Reasoning Pro',
      description: 'No description available',
      contextLength: 128000,
      supportsWebSearch: true,
    },
```
### Provider: mistral
```ts
// Curated ModelConfig entries for AI_MODELS['mistral'] (default + recommended)
{
      id: 'mistral-large-2512',
      name: 'mistral-large-2512',
      description: 'Official mistral-large-2512 Mistral AI model',
      contextLength: 262144,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsRealtime: true,
      supportsVoiceInput: true,
      supportsFunctions: true,
      isDefault: true,
    },
{
      id: 'mistral-medium-3-5',
      name: 'Mistral Medium 3.5',
      description: 'Official mistral-medium-3-5 Mistral AI model',
      contextLength: 262144, // Pricing: $0.4/1M in, $2/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsRealtime: true,
      supportsVoiceInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
{
      id: 'mistral-small-2603',
      name: 'mistral-small-2603',
      description: 'Mistral Small 4.',
      contextLength: 262144,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsRealtime: true,
      supportsVoiceInput: true,
      supportsFunctions: true,
    },
{
      id: 'codestral-2508',
      name: 'codestral-2508',
      description: 'Our cutting-edge language model for coding released August 2025.',
      contextLength: 256000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsRealtime: true,
      supportsVoiceInput: true,
      supportsFunctions: true,
    },
```
### Provider: cohere
```ts
// Curated ModelConfig entries for AI_MODELS['cohere'] (default + recommended)
{
      id: 'command-a-reasoning-08-2025',
      name: 'command-a-reasoning-08-2025',
      description: 'No description available',
      contextLength: 288768,
      supportsDocuments: true,
      supportsFunctions: true,
      isDefault: true,
    },
{
      id: 'command-a-vision-07-2025',
      name: 'command-a-vision-07-2025',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
{
      id: 'command-r-08-2024',
      name: 'command-r-08-2024',
      description: 'No description available',
      contextLength: 128000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
{
      id: 'command-r7b-12-2024',
      name: 'command-r7b-12-2024',
      description: 'No description available',
      contextLength: 132000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
```
### Provider: deepseek
```ts
// Curated ModelConfig entries for AI_MODELS['deepseek'] (default + recommended)
{
      id: 'deepseek-v4-flash',
      name: 'deepseek-v4-flash',
      description: 'No description available',
      contextLength: 1048576,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsThinking: true,
      isDefault: true,
    },
{
      id: 'deepseek-v4-pro',
      name: 'deepseek-v4-pro',
      description: 'No description available',
      contextLength: 1048576,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsThinking: true,
    },
```
### Provider: grok
```ts
// Curated ModelConfig entries for AI_MODELS['grok'] (default + recommended)
{
      id: 'grok-4.3',
      name: 'Grok 4.3',
      description: 'Current xAI flagship model for high-capability chat, vision, tool use, and reasoning',
      contextLength: 1000000, // Pricing: $12.5/1M in, $25/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
      isDefault: true,
    },
```

## ProviderCapabilities additions (imageGeneration)
### Provider: openai
```ts
// Insert into getProviderCapabilities('openai') imageGeneration models/sizes
imageGeneration: { supported: true, models: ["gpt-image-1","gpt-image-1-mini","gpt-image-1.5","chatgpt-image-latest","gpt-image-2","gpt-image-2-2026-04-21"], sizes: ["auto","1024x1024","1024x1536","1536x1024"], maxPromptLength: 4000 },
```
### Provider: grok
```ts
// Insert into getProviderCapabilities('grok') imageGeneration models/sizes
imageGeneration: { supported: true, models: ["grok-imagine-image","grok-imagine-image-quality"], sizes: ["1024x1024"], maxPromptLength: 4000 },
```

## ProviderCapabilities additions (videoGeneration - future)
### Provider: openai
```ts
// Insert into getProviderCapabilities('openai') videoGeneration block (if/when added)
videoGeneration: { supported: true, models: ["sora-2","sora-2-pro"], resolutions: ["720p","1080p"], maxPromptLength: 4000 },
```
### Provider: google
```ts
// Insert into getProviderCapabilities('google') videoGeneration block (if/when added)
videoGeneration: { supported: true, models: ["veo-2.0-generate-001","veo-3.0-generate-001","veo-3.0-fast-generate-001","veo-3.1-generate-preview","veo-3.1-fast-generate-preview","veo-3.1-lite-generate-preview"], resolutions: ["480p","720p","1080p"], maxPromptLength: 4000 },
```
### Provider: grok
```ts
// Insert into getProviderCapabilities('grok') videoGeneration block (if/when added)
videoGeneration: { supported: true, models: ["grok-imagine-video"], resolutions: ["720p","1080p"], maxPromptLength: 4000 },
```