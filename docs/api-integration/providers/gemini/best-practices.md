# Google Gemini API Best Practices

## Rate Limit Management

### Understanding Gemini Rate Limits
```javascript
class GeminiRateLimiter {
  constructor() {
    this.limits = {
      free: {
        rpm: 5,           // 5 requests per minute
        rpd: 25,          // 25 requests per day
        tpm: 32000,       // Tokens per minute
        ipm: 10           // Images per minute
      },
      tier1: {
        rpm: 60,
        rpd: 1500,
        tpm: 1000000,
        ipm: 100
      },
      tier2: {
        rpm: 1000,        // Requires $250+ spend
        rpd: 50000,
        tpm: 4000000,
        ipm: 1000
      }
    };
    
    this.usage = {
      requests: [],
      dailyRequests: 0,
      resetTime: this.getNextResetTime()
    };
  }

  async checkRateLimit(tier = 'free') {
    const now = Date.now();
    const limit = this.limits[tier];
    
    // Clean old requests
    this.usage.requests = this.usage.requests.filter(
      time => now - time < 60000
    );
    
    // Check minute limit
    if (this.usage.requests.length >= limit.rpm) {
      const oldestRequest = this.usage.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      return { allowed: false, waitTime };
    }
    
    // Check daily limit
    if (this.usage.dailyRequests >= limit.rpd) {
      const waitTime = this.usage.resetTime - now;
      return { allowed: false, waitTime, reason: 'daily_limit' };
    }
    
    return { allowed: true };
  }

  recordRequest() {
    const now = Date.now();
    this.usage.requests.push(now);
    this.usage.dailyRequests++;
    
    // Reset daily counter if needed
    if (now > this.usage.resetTime) {
      this.usage.dailyRequests = 1;
      this.usage.resetTime = this.getNextResetTime();
    }
  }

  getNextResetTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }
}
```

### Handling 429 Errors
```javascript
class GeminiErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const error = await this.parseError(response);
          
          if (response.status === 429) {
            // Rate limit exceeded
            const delay = this.calculateBackoff(attempt, error);
            console.log(`Rate limited. Waiting ${delay}ms...`);
            await this.wait(delay);
            continue;
          }
          
          if (response.status >= 500) {
            // Server error - retry with backoff
            const delay = Math.pow(2, attempt) * 1000;
            await this.wait(delay);
            continue;
          }
          
          throw new Error(error.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1 && this.isRetryable(error)) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.wait(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  async parseError(response) {
    try {
      const error = await response.json();
      return {
        message: error.error?.message || 'Unknown error',
        code: error.error?.code,
        details: error.error?.details
      };
    } catch {
      return { message: `HTTP ${response.status}` };
    }
  }

  calculateBackoff(attempt, error) {
    // Check for RESOURCE_EXHAUSTED error
    if (error.code === 'RESOURCE_EXHAUSTED') {
      // Longer wait for quota exhaustion
      return Math.min(60000 * (attempt + 1), 300000); // Up to 5 minutes
    }
    
    // Standard exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(base + jitter, 60000);
  }

  isRetryable(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           error.message?.includes('RESOURCE_EXHAUSTED');
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Cost Optimization

### 1. Smart Model Selection
```javascript
class GeminiModelSelector {
  selectOptimalModel(task) {
    const models = {
      'gemini-2.5-pro': {
        cost: { 
          input: 1.25,  // <200K tokens
          inputLarge: 2.50,  // >200K tokens
          output: 10,
          outputLarge: 15,
          thinking: 5  // Estimated
        },
        capabilities: ['complex-reasoning', 'thinking', 'multimodal'],
        context: 1000000
      },
      'gemini-2.5-flash': {
        cost: { 
          input: 0.15, 
          output: 0.60,
          thinking: 3.50,
          audio: 1.00
        },
        capabilities: ['balanced', 'thinking', 'multimodal'],
        context: 1000000
      },
      'gemini-2.5-flash-lite': {
        cost: { 
          input: 0.10, 
          output: 0.40,
          thinking: 2.00  // Estimated
        },
        capabilities: ['fast', 'thinking-optional'],
        context: 1000000
      }
    };
    
    // Decision logic
    if (task.requiresDeepReasoning || task.complexity > 8) {
      return 'gemini-2.5-pro';
    }
    
    if (task.volume > 1000 && task.complexity < 3) {
      return 'gemini-2.5-flash-lite';
    }
    
    if (task.multimodal || task.balanced) {
      return 'gemini-2.5-flash';
    }
    
    // Default to most cost-effective
    return 'gemini-2.5-flash-lite';
  }

  estimateCost(model, inputTokens, outputTokens, options = {}) {
    const models = this.getModelPricing();
    const pricing = models[model].cost;
    
    let cost = 0;
    
    // Input cost (check for large context)
    if (model === 'gemini-2.5-pro' && inputTokens > 200000) {
      cost += (inputTokens / 1000000) * pricing.inputLarge;
    } else {
      cost += (inputTokens / 1000000) * pricing.input;
    }
    
    // Output cost
    if (model === 'gemini-2.5-pro' && inputTokens > 200000) {
      cost += (outputTokens / 1000000) * pricing.outputLarge;
    } else {
      cost += (outputTokens / 1000000) * pricing.output;
    }
    
    // Additional costs
    if (options.thinking) {
      cost += (options.thinkingTokens / 1000000) * pricing.thinking;
    }
    
    if (options.audio) {
      cost += (options.audioTokens / 1000000) * pricing.audio;
    }
    
    return cost;
  }
}
```

### 2. Context Caching Strategy
```javascript
class GeminiCacheManager {
  constructor() {
    this.caches = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      savings: 0
    };
  }

  async createCachedContext(content, ttl = 3600) {
    const cacheKey = this.generateKey(content);
    
    // Check if already cached
    if (this.caches.has(cacheKey)) {
      const cached = this.caches.get(cacheKey);
      if (Date.now() < cached.expiry) {
        this.cacheStats.hits++;
        return cached.id;
      }
    }
    
    // Create new cache
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/cachedContents',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'models/gemini-2.5-flash',
          contents: [
            {
              parts: [{ text: content }]
            }
          ],
          ttl: `${ttl}s`
        })
      }
    );
    
    const data = await response.json();
    
    this.caches.set(cacheKey, {
      id: data.name,
      expiry: Date.now() + (ttl * 1000)
    });
    
    this.cacheStats.misses++;
    return data.name;
  }

  generateKey(content) {
    // Simple hash for cache key
    return content.substring(0, 100) + '_' + content.length;
  }

  getStats() {
    const hitRate = this.cacheStats.hits / 
                   (this.cacheStats.hits + this.cacheStats.misses);
    
    return {
      ...this.cacheStats,
      hitRate: hitRate || 0
    };
  }
}
```

### 3. Thinking Budget Optimization
```javascript
class ThinkingOptimizer {
  determineThinkingBudget(task) {
    // Thinking costs $3.50/1M for Flash, more for Pro
    
    if (task.type === 'simple_query') {
      return 'off';  // No thinking needed
    }
    
    if (task.type === 'moderate_reasoning') {
      return 'low';  // Minimal thinking
    }
    
    if (task.type === 'complex_problem') {
      return 'medium';  // Balanced thinking
    }
    
    if (task.type === 'critical_analysis') {
      return 'high';  // Maximum thinking
    }
    
    // For Flash-Lite, thinking is off by default
    if (task.model === 'gemini-2.5-flash-lite') {
      return task.requiresReasoning ? 1000 : 0;  // Token budget
    }
    
    return 'low';  // Default to minimal
  }

  createThinkingRequest(content, budget) {
    return {
      contents: [
        {
          parts: [{ text: content }]
        }
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingBudget: budget
        }
      }
    };
  }
}
```

## Performance Optimization

### 1. Request Batching
```javascript
class GeminiBatchProcessor {
  constructor(tier = 'free') {
    this.queue = [];
    this.processing = false;
    this.rateLimiter = new GeminiRateLimiter();
    this.tier = tier;
  }

  async addRequest(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  async processBatch() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const canProceed = await this.rateLimiter.checkRateLimit(this.tier);
      
      if (!canProceed.allowed) {
        // Wait for rate limit reset
        await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
        continue;
      }
      
      const item = this.queue.shift();
      
      try {
        const response = await this.executeRequest(item.request);
        this.rateLimiter.recordRequest();
        item.resolve(response);
      } catch (error) {
        item.reject(error);
      }
      
      // For free tier, wait 12 seconds between requests (5 RPM)
      if (this.tier === 'free' && this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
    
    this.processing = false;
  }

  async executeRequest(request) {
    const errorHandler = new GeminiErrorHandler();
    return await errorHandler.handleRequest(() => 
      fetch(request.url, request.options)
    );
  }
}
```

### 2. Streaming Optimization
```javascript
class GeminiStreamHandler {
  async streamWithMetrics(url, options, onChunk) {
    const startTime = Date.now();
    let tokenCount = 0;
    let firstTokenTime = null;
    
    const response = await fetch(`${url}?alt=sse`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              tokenCount += this.estimateTokens(text);
              onChunk(text);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }

    return {
      totalTime: Date.now() - startTime,
      timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : null,
      tokenCount,
      tokensPerSecond: tokenCount / ((Date.now() - startTime) / 1000)
    };
  }

  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class GeminiSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      throw new Error('No Gemini API key found in environment');
    }
    
    // Check key format (basic validation)
    if (apiKey.length < 30) {
      throw new Error('API key appears to be invalid');
    }
    
    return apiKey;
  }

  createRestrictedKey(allowedDomains = []) {
    // Configure API key restrictions
    return {
      restrictions: {
        browserKeyRestrictions: {
          allowedReferrers: allowedDomains
        },
        apiTargets: [
          {
            service: 'generativelanguage.googleapis.com'
          }
        ]
      }
    };
  }

  // Use ephemeral tokens for client-side access
  async generateEphemeralToken() {
    // Server-side endpoint to generate short-lived tokens
    const response = await fetch('/api/generate-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.validateAPIKey()}`
      }
    });
    
    return await response.json();
  }
}
```

### 2. Input Sanitization
```javascript
class GeminiInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\[.*?\]/g, '')  // Remove bracketed commands
      .replace(/\{.*?\}/g, '')  // Remove curly brace patterns
      .trim();
    
    // Check content length for context window
    const maxLength = 1000000 * 3;  // ~1M tokens * 3 chars
    if (sanitized.length > maxLength) {
      console.warn('Input truncated to fit context window');
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Validate multimodal inputs
    if (typeof input === 'object' && input.inlineData) {
      this.validateMediaInput(input.inlineData);
    }
    
    return sanitized;
  }

  validateMediaInput(inlineData) {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'video/mp4', 'video/mpeg', 'video/mov',
      'audio/wav', 'audio/mp3', 'audio/aiff'
    ];
    
    if (!allowedMimeTypes.includes(inlineData.mimeType)) {
      throw new Error(`Unsupported media type: ${inlineData.mimeType}`);
    }
    
    // Check base64 data size (max ~20MB)
    const maxSize = 20 * 1024 * 1024 * 1.37;  // Base64 overhead
    if (inlineData.data.length > maxSize) {
      throw new Error('Media file too large');
    }
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class GeminiUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0, thinking: 0, audio: 0 },
      costs: { total: 0, byModel: {} },
      errors: {},
      latency: [],
      models: {}
    };
  }

  trackRequest(model, usage, latency, options = {}) {
    this.metrics.requests++;
    
    // Track token usage
    this.metrics.tokens.input += usage.promptTokenCount || 0;
    this.metrics.tokens.output += usage.candidatesTokenCount || 0;
    
    if (options.thinkingTokens) {
      this.metrics.tokens.thinking += options.thinkingTokens;
    }
    
    if (options.audioTokens) {
      this.metrics.tokens.audio += options.audioTokens;
    }
    
    // Calculate costs
    const cost = this.calculateCost(model, usage, options);
    this.metrics.costs.total += cost;
    
    // Track by model
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = { 
        count: 0, 
        tokens: 0, 
        cost: 0 
      };
    }
    this.metrics.models[model].count++;
    this.metrics.models[model].tokens += usage.totalTokenCount || 0;
    this.metrics.models[model].cost += cost;
    
    // Track latency
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  trackError(errorCode) {
    this.metrics.errors[errorCode] = (this.metrics.errors[errorCode] || 0) + 1;
  }

  calculateCost(model, usage, options) {
    const selector = new GeminiModelSelector();
    return selector.estimateCost(
      model,
      usage.promptTokenCount || 0,
      usage.candidatesTokenCount || 0,
      options
    );
  }

  getReport() {
    const avgLatency = this.metrics.latency.length > 0 ?
      this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length : 0;
    
    return {
      ...this.metrics,
      avgLatency,
      avgCostPerRequest: this.metrics.costs.total / this.metrics.requests,
      errorRate: Object.values(this.metrics.errors).reduce((a, b) => a + b, 0) / 
                this.metrics.requests
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Multimodal Debate Management
```javascript
class GeminiDebateManager {
  async conductMultimodalDebate(topic, media) {
    const participants = [
      { model: 'gemini-2.5-flash', role: 'proponent' },
      { model: 'gemini-2.5-flash', role: 'opponent' },
      { model: 'gemini-2.5-pro', role: 'moderator' }
    ];
    
    // Include media in debate context
    const baseContent = {
      parts: [
        { text: `Debate topic: ${topic}` }
      ]
    };
    
    if (media) {
      baseContent.parts.push({
        inlineData: {
          mimeType: media.mimeType,
          data: media.data
        }
      });
    }
    
    // Execute debate rounds with rate limiting
    const rateLimiter = new GeminiRateLimiter();
    const results = [];
    
    for (const participant of participants) {
      const canProceed = await rateLimiter.checkRateLimit();
      
      if (!canProceed.allowed) {
        await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
      }
      
      const response = await this.getDebateResponse(
        participant,
        baseContent
      );
      
      results.push(response);
      rateLimiter.recordRequest();
    }
    
    return results;
  }
}
```

### 2. Live Voice Debate
```javascript
class GeminiVoiceDebate {
  setupLiveDebate() {
    const ws = new WebSocket(
      'wss://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:live'
    );
    
    const participants = [
      { voice: 'Aoede', role: 'proponent' },
      { voice: 'Charon', role: 'opponent' },
      { voice: 'Puck', role: 'moderator' }
    ];
    
    ws.on('open', () => {
      // Configure for debate
      ws.send(JSON.stringify({
        setup: {
          model: 'gemini-2.0-flash',
          config: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: participants[0].voice
                }
              }
            }
          }
        }
      }));
    });
    
    return ws;
  }
}
```

## Summary Checklist

✅ Implement rate limiting for free/paid tiers  
✅ Use exponential backoff for 429 errors  
✅ Handle RESOURCE_EXHAUSTED errors properly  
✅ Select appropriate models based on cost/performance  
✅ Utilize context caching for repeated content  
✅ Optimize thinking budget for Flash models  
✅ Batch requests respecting rate limits  
✅ Stream responses for better UX  
✅ Secure API keys with restrictions  
✅ Sanitize multimodal inputs  
✅ Track usage metrics and costs  
✅ Monitor error rates and latency  
✅ Use Live API for voice interactions  
✅ Leverage Google Search grounding for facts