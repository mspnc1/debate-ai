# PR Bundle: Curated Model and Capability Updates

This bundle consolidates curated entries to update:
- src/config/modelConfigs.ts (add curated models)
- src/config/providerCapabilities.ts (image/video generation blocks)

## ModelConfigs additions (curated)
### Provider: openai
```ts
// Curated ModelConfig entries for AI_MODELS['openai'] (default + recommended)
{
      id: 'gpt-5.4',
      name: 'gpt-5.4',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
      isDefault: true,
    },
{
      id: 'gpt-4.1-2025-04-14',
      name: 'gpt-4.1-2025-04-14',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
    },
{
      id: 'gpt-4o',
      name: 'gpt-4o',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
    },
{
      id: 'gpt-4o-mini-2024-07-18',
      name: 'gpt-4o-mini-2024-07-18',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
    },
{
      id: 'o3-mini',
      name: 'o3-mini',
      description: 'No description available',
      contextLength: 128000,
    },
{
      id: 'o1-pro-2025-03-19',
      name: 'o1-pro-2025-03-19',
      description: 'No description available',
      contextLength: 128000,
    },
{
      id: 'dall-e-3',
      name: 'dall-e-3',
      description: 'No description available',
      contextLength: 128000,
      supportsImageGeneration: true,
    },
```
### Provider: claude
```ts
// Curated ModelConfig entries for AI_MODELS['claude'] (default + recommended)
{
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      isDefault: true,
    },
```
### Provider: google
```ts
// Curated ModelConfig entries for AI_MODELS['google'] (default + recommended)
{
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Stable release (June 17th, 2025) of Gemini 2.5 Pro',
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
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Stable version of Gemini 2.5 Flash, our mid-size multimodal model that supports up to 1 million tokens, released in June of 2025.',
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
{
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash-Lite',
      description: 'Stable version of Gemini 2.5 Flash-Lite, released in July of 2025',
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
      id: 'mistral-large-latest',
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
      id: 'mistral-medium-latest',
      name: 'mistral-medium-2508',
      description: 'Update on Mistral Medium 3 with improved capabilities.',
      contextLength: 131072,
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
      id: 'command-a-vision-07-2025',
      name: 'command-a-vision-07-2025',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      isDefault: true,
    },
{
      id: 'command-r-08-2024',
      name: 'command-r-08-2024',
      description: 'No description available',
      contextLength: 132096,
      supportsDocuments: true,
      supportsFunctions: true,
    },
```
### Provider: together
```ts
// together: no curated entries
```
### Provider: deepseek
```ts
// Curated ModelConfig entries for AI_MODELS['deepseek'] (default + recommended)
{
      id: 'deepseek-reasoner',
      name: 'deepseek-reasoner',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      isDefault: true,
    },
{
      id: 'deepseek-chat',
      name: 'deepseek-chat',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
    },
```
### Provider: grok
```ts
// Curated ModelConfig entries for AI_MODELS['grok'] (default + recommended)
{
      id: 'grok-4-0709',
      name: 'grok-4-0709',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      isDefault: true,
    },
{
      id: 'grok-3',
      name: 'grok-3',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
    },
{
      id: 'grok-3-mini',
      name: 'grok-3-mini',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
    },
```

## ProviderCapabilities additions (imageGeneration)
### Provider: openai
```ts
// Insert into getProviderCapabilities('openai') imageGeneration models/sizes
imageGeneration: { supported: true, models: ["dall-e-3","dall-e-2","gpt-image-1","gpt-image-1-mini","gpt-image-1.5"], sizes: ["auto","1024x1024","1024x1536","1536x1024"], maxPromptLength: 4000 },
```
### Provider: together
```ts
// together: no image generation models discovered
```
### Provider: grok
```ts
// Insert into getProviderCapabilities('grok') imageGeneration models/sizes
imageGeneration: { supported: true, models: ["grok-imagine-image","grok-imagine-image-pro"], sizes: ["1024x1024"], maxPromptLength: 4000 },
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
videoGeneration: { supported: true, models: ["veo-2.0-generate-001","veo-3.0-generate-001","veo-3.0-fast-generate-001","veo-3.1-generate-preview","veo-3.1-fast-generate-preview"], resolutions: ["480p","720p","1080p"], maxPromptLength: 4000 },
```
### Provider: together
```ts
// together: no video generation models discovered
```
### Provider: grok
```ts
// Insert into getProviderCapabilities('grok') videoGeneration block (if/when added)
videoGeneration: { supported: true, models: ["grok-imagine-video"], resolutions: ["720p","1080p"], maxPromptLength: 4000 },
```