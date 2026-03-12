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
      name: 'GPT-4o',
      description: 'Previous flagship multimodal model',
      contextLength: 128000,
      maxOutputTokens: 16384, // Pricing: $2.5/1M in, $10/1M out [merged]
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
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
      name: 'O3 Mini',
      description: 'Smaller reasoning model, faster and more affordable',
      contextLength: 200000,
      maxOutputTokens: 100000, // Pricing: $1.1/1M in, $4.4/1M out [merged]
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
{
      id: 'o1-pro-2025-03-19',
      name: 'o1-pro-2025-03-19',
      description: 'No description available',
      contextLength: 128000,
    },
{
      id: 'dall-e-3',
      name: 'DALL-E 3',
      description: 'Image generation model',
      contextLength: 128000,
      supportsImageGeneration: true,
    },
```
### Provider: claude
```ts
// Curated ModelConfig entries for AI_MODELS['claude'] (default + recommended)
{
      id: 'claude-4.1-opus-20250805',
      name: 'Claude 4.1 Opus',
      description: 'No description available',
      contextLength: 128000,
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      isDefault: true,
    },
{
      id: 'claude-4-sonnet-20250514',
      name: 'Claude 4 Sonnet',
      description: 'Balanced performance and speed',
      contextLength: 200000,
      maxOutputTokens: 64000, // Pricing: $3/1M in, $15/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
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
      maxOutputTokens: 65536, // Pricing: $1.25/1M in, $10/1M out [merged]
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
      maxOutputTokens: 65536, // Pricing: $0.15/1M in, $0.6/1M out [merged]
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
      maxOutputTokens: 65536, // Pricing: $0.075/1M in, $0.3/1M out [merged]
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
      description: 'Advanced search model with comprehensive answers and citations',
      contextLength: 200000,
      maxOutputTokens: 8000, // Pricing: $3/1M in, $15/1M out [merged]
      supportsWebSearch: true,
      isDefault: true,
    },
{
      id: 'sonar',
      name: 'Sonar',
      description: 'Fast search model with real-time web access and citations',
      contextLength: 128000,
      maxOutputTokens: 8000, // Pricing: $1/1M in, $1/1M out [merged]
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
      contextLength: 262144, // Pricing: $2/1M in, $6/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      isDefault: true,
    },
{
      id: 'mistral-medium-latest',
      name: 'mistral-medium-2508',
      description: 'Update on Mistral Medium 3 with improved capabilities.',
      contextLength: 131072, // Pricing: $0.4/1M in, $2/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
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
      contextLength: 128000, // Pricing: $2.5/1M in, $10/1M out [merged]
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
      name: 'DeepSeek Reasoner',
      description: 'Advanced reasoning model with chain-of-thought',
      contextLength: 64000,
      maxOutputTokens: 8192, // Pricing: $0.55/1M in, $2.19/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsThinking: true,
      isDefault: true,
    },
{
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      description: 'General-purpose chat model with strong reasoning',
      contextLength: 64000,
      maxOutputTokens: 8192, // Pricing: $0.27/1M in, $1.1/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
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
      name: 'Grok 3',
      description: 'Previous flagship xAI model',
      contextLength: 131072,
      maxOutputTokens: 131072, // Pricing: $3/1M in, $15/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
{
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      description: 'Lightweight reasoning model from xAI',
      contextLength: 131072,
      maxOutputTokens: 131072, // Pricing: $0.3/1M in, $0.5/1M out [merged]
      supportsVision: true,
      supportsDocuments: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
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