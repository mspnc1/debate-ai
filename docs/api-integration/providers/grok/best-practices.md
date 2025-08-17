# Grok 4 API Best Practices

## Rate Limit Management

### Understanding Grok Rate Limits
```javascript
class GrokRateLimiter {
  constructor() {
    this.limits = {
      standard: {
        requestsPerMinute: 60,
        tokensPerMinute: 16000,
        requestsPerDay: 1000
      },
      enhanced: {
        requestsPerMinute: 480,
        tokensPerMinute: 2000000,
        requestsPerDay: 10000
      },
      nonPremium: {
        requestsPer2Hours: 20
      }
    };
    
    this.usage = {
      requests: 0,
      tokens: 0,
      resetTime: Date.now() + 60000
    };
  }

  async checkRateLimit(estimatedTokens) {
    const now = Date.now();
    
    // Reset counters if time window passed
    if (now > this.resetTime) {
      this.usage = {
        requests: 0,
        tokens: 0,
        resetTime: now + 60000
      };
    }
    
    const limit = this.getUserLimit();
    
    if (this.usage.requests >= limit.requestsPerMinute ||
        this.usage.tokens + estimatedTokens > limit.tokensPerMinute) {
      const waitTime = this.resetTime - now;
      return { allowed: false, waitTime };
    }
    
    return { allowed: true };
  }

  getUserLimit() {
    // Determine user's rate limit tier
    const subscription = process.env.GROK_SUBSCRIPTION;
    
    if (subscription === 'heavy') return this.limits.enhanced;
    if (subscription === 'super') return this.limits.standard;
    return this.limits.nonPremium;
  }
}
```

### Monitoring Rate Limit Headers
```javascript
class RateLimitMonitor {
  parseHeaders(response) {
    return {
      dailyLimit: parseInt(response.headers.get('x-ratelimit-limit-requests')),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests')),
      resetTime: parseInt(response.headers.get('x-ratelimit-reset-requests')),
      retryAfter: response.headers.get('retry-after')
    };
  }

  shouldRetry(headers) {
    if (headers.retryAfter) {
      return {
        retry: true,
        delay: parseInt(headers.retryAfter) * 1000
      };
    }
    
    if (headers.remaining === 0) {
      const now = Date.now() / 1000;
      const delay = (headers.resetTime - now) * 1000;
      return {
        retry: true,
        delay: Math.max(delay, 1000)
      };
    }
    
    return { retry: false };
  }
}
```

## Error Handling Best Practices

### Comprehensive Error Handler
```javascript
class GrokErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const handled = await this.handleHTTPError(response, attempt, maxRetries);
          if (handled.retry) {
            await this.wait(handled.delay);
            continue;
          }
          throw new Error(handled.message);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = this.calculateBackoff(attempt);
          console.log(`Retrying after ${delay}ms...`);
          await this.wait(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  async handleHTTPError(response, attempt, maxRetries) {
    const status = response.status;
    const headers = this.parseHeaders(response);
    
    switch (status) {
      case 400:
        // Check for Grok 4 specific errors
        const body = await response.text();
        if (body.includes('presencePenalty') || 
            body.includes('frequencyPenalty') ||
            body.includes('stop')) {
          return {
            retry: false,
            message: 'Grok 4 does not support these parameters. Remove them from request.'
          };
        }
        if (body.includes('reasoning_effort')) {
          return {
            retry: false,
            message: 'Grok 4 does not use reasoning_effort parameter.'
          };
        }
        return { retry: false, message: `Bad request: ${body}` };
        
      case 401:
        return {
          retry: false,
          message: 'Invalid API key. Check your Grok subscription status.'
        };
        
      case 429:
        if (attempt < maxRetries - 1) {
          const retryAfter = headers.retryAfter;
          const delay = retryAfter ? 
            parseInt(retryAfter) * 1000 : 
            this.calculateBackoff(attempt);
          
          return { retry: true, delay };
        }
        return { retry: false, message: 'Rate limit exceeded' };
        
      case 500:
      case 502:
      case 503:
        if (attempt < maxRetries - 1) {
          return {
            retry: true,
            delay: this.calculateBackoff(attempt)
          };
        }
        return { retry: false, message: `Server error: ${status}` };
        
      default:
        return { retry: false, message: `Unexpected status: ${status}` };
    }
  }

  calculateBackoff(attempt) {
    // Exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(base + jitter, 60000); // Max 60 seconds
  }

  isRetryableError(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }

  parseHeaders(response) {
    return {
      retryAfter: response.headers.get('retry-after'),
      remaining: parseInt(response.headers.get('x-ratelimit-remaining-requests'))
    };
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Cost Optimization

### 1. Smart Model Selection
```javascript
class GrokModelOptimizer {
  selectOptimalModel(task) {
    // Model capabilities and costs
    const models = {
      'grok-4-heavy': {
        cost: { input: 5, output: 20 }, // Estimated premium pricing
        context: 256000,
        capabilities: ['reasoning', 'multimodal', 'live-search']
      },
      'grok-4': {
        cost: { input: 3, output: 15 },
        context: 128000,
        capabilities: ['reasoning', 'multimodal', 'live-search']
      },
      'grok-3': {
        cost: { input: 1, output: 5 }, // Estimated lower pricing
        context: 131072,
        capabilities: ['basic']
      },
      'grok-3-mini': {
        cost: { input: 0.5, output: 2 }, // Estimated lowest pricing
        context: 131072,
        capabilities: ['basic']
      }
    };
    
    // Select based on requirements
    if (task.requiresLiveData || task.requiresReasoning) {
      if (task.contextSize > 128000) {
        return 'grok-4-heavy';
      }
      return 'grok-4';
    }
    
    if (task.volume > 1000 && task.complexity === 'low') {
      return 'grok-3-mini';
    }
    
    return 'grok-3'; // Default for basic tasks
  }

  estimateCost(model, inputTokens, outputTokens, searchSources = 0) {
    const baseC

ost = this.calculateTokenCost(model, inputTokens, outputTokens);
    const searchCost = searchSources * 0.025; // $0.025 per source
    
    return {
      tokenCost: baseCost,
      searchCost: searchCost,
      total: baseCost + searchCost
    };
  }

  calculateTokenCost(model, inputTokens, outputTokens) {
    const rates = {
      'grok-4': { input: 3, output: 15 },
      'grok-4-heavy': { input: 5, output: 20 },
      'grok-3': { input: 1, output: 5 },
      'grok-3-mini': { input: 0.5, output: 2 }
    };
    
    const rate = rates[model] || rates['grok-4'];
    return (inputTokens / 1000000) * rate.input + 
           (outputTokens / 1000000) * rate.output;
  }
}
```

### 2. Caching Strategy
```javascript
class GrokCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      savings: 0
    };
  }

  getCachedResponse(prompt, maxAge = 3600000) { // 1 hour default
    const cacheKey = this.generateKey(prompt);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      this.cacheStats.hits++;
      this.cacheStats.savings += this.estimateSavings(cached.tokens);
      return cached.response;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  setCachedResponse(prompt, response, tokens) {
    const cacheKey = this.generateKey(prompt);
    this.cache.set(cacheKey, {
      response,
      tokens,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  generateKey(prompt) {
    // Simple hash for cache key
    return prompt.substring(0, 100) + '_' + prompt.length;
  }

  estimateSavings(tokens) {
    // Cached input tokens save 75% ($0.75 vs $3.00 per 1M)
    return (tokens / 1000000) * 2.25;
  }

  getStats() {
    const hitRate = this.cacheStats.hits / 
                   (this.cacheStats.hits + this.cacheStats.misses);
    
    return {
      ...this.cacheStats,
      hitRate: hitRate || 0,
      estimatedSavings: `$${this.cacheStats.savings.toFixed(2)}`
    };
  }
}
```

### 3. Request Batching
```javascript
class GrokBatchProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 10;
    this.batchDelay = 1000; // 1 second
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
      // Take batch of requests
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process in parallel
      const promises = batch.map(({ request }) => 
        this.executeRequest(request)
      );
      
      const results = await Promise.allSettled(promises);
      
      // Resolve/reject individual promises
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });
      
      // Rate limit between batches
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }
    
    this.processing = false;
  }

  async executeRequest(request) {
    // Execute individual request with error handling
    const errorHandler = new GrokErrorHandler();
    return await errorHandler.handleRequest(() => 
      fetch('https://api.x.ai/v1/chat/completions', request)
    );
  }
}
```

## Performance Optimization

### 1. Connection Pooling
```javascript
import { Agent } from 'https';

const httpsAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 25,
  maxFreeSockets: 10,
  timeout: 60000
});

// Use for all Grok requests
const optimizedFetch = (url, options) => {
  return fetch(url, {
    ...options,
    agent: httpsAgent
  });
};
```

### 2. Streaming Response Handler
```javascript
class GrokStreamHandler {
  async streamWithMetrics(request, onToken) {
    const startTime = Date.now();
    let tokenCount = 0;
    let firstTokenTime = null;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      ...request,
      body: JSON.stringify({
        ...JSON.parse(request.body),
        stream: true
      })
    });

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
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            
            if (content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              tokenCount++;
              onToken(content);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }

    return {
      totalTime: Date.now() - startTime,
      timeToFirstToken: firstTokenTime - startTime,
      tokenCount,
      tokensPerSecond: tokenCount / ((Date.now() - startTime) / 1000)
    };
  }
}
```

### 3. Request Optimization
```javascript
class GrokRequestOptimizer {
  optimizeMessages(messages, maxTokens = 100000) {
    let totalTokens = 0;
    const optimized = [];
    
    // Process from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);
      
      if (totalTokens + tokens > maxTokens) {
        // Add summary of older messages
        if (i > 0) {
          const summary = this.summarizeMessages(messages.slice(0, i));
          optimized.unshift({
            role: 'system',
            content: `Previous context summary: ${summary}`
          });
        }
        break;
      }
      
      totalTokens += tokens;
      optimized.unshift(messages[i]);
    }
    
    return optimized;
  }

  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  summarizeMessages(messages) {
    // Create concise summary of older messages
    const key_points = messages
      .filter(m => m.role === 'user')
      .map(m => m.content.substring(0, 50))
      .join('; ');
    
    return `Users discussed: ${key_points}`;
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class GrokSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.GROK_API_KEY;
    
    if (!apiKey) {
      throw new Error('GROK_API_KEY environment variable not set');
    }
    
    // Validate subscription
    const subscription = process.env.GROK_SUBSCRIPTION;
    if (!['super', 'heavy'].includes(subscription)) {
      console.warn('No premium subscription detected. Rate limits will be restricted.');
    }
    
    return apiKey;
  }

  rotateAPIKey(newKey) {
    // Securely update API key
    process.env.GROK_API_KEY = newKey;
    
    // Clear any cached data
    this.clearCache();
    
    console.log('API key rotated successfully');
  }

  clearCache() {
    // Clear sensitive cached data
    if (global.grokCache) {
      global.grokCache.clear();
    }
  }
}
```

### 2. Input Sanitization
```javascript
class GrokInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/System:/gi, 'System-')
      .trim();
    
    // Grok 4 specific: Remove unsupported parameters
    sanitized = this.removeUnsupportedParams(sanitized);
    
    // Validate length for context window
    const maxLength = 256000 * 3; // ~256K tokens * 3 chars/token
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      console.warn('Input truncated to fit context window');
    }
    
    return sanitized;
  }

  removeUnsupportedParams(text) {
    // Remove mentions of unsupported Grok 4 parameters
    const unsupported = [
      'presencePenalty',
      'frequencyPenalty',
      'stop',
      'reasoning_effort'
    ];
    
    let cleaned = text;
    unsupported.forEach(param => {
      const regex = new RegExp(`${param}[^,}]*[,}]`, 'gi');
      cleaned = cleaned.replace(regex, '');
    });
    
    return cleaned;
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class GrokUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { tokens: 0, search: 0 },
      errors: {},
      latency: [],
      models: {}
    };
  }

  trackRequest(model, usage, latency, searchSources = 0) {
    this.metrics.requests++;
    this.metrics.tokens.input += usage.prompt_tokens;
    this.metrics.tokens.output += usage.completion_tokens;
    
    // Calculate costs
    const tokenCost = this.calculateCost(model, usage);
    const searchCost = searchSources * 0.025;
    
    this.metrics.costs.tokens += tokenCost;
    this.metrics.costs.search += searchCost;
    
    // Track by model
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = { count: 0, tokens: 0, cost: 0 };
    }
    this.metrics.models[model].count++;
    this.metrics.models[model].tokens += usage.total_tokens;
    this.metrics.models[model].cost += tokenCost;
    
    // Track latency
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  trackError(errorCode) {
    this.metrics.errors[errorCode] = (this.metrics.errors[errorCode] || 0) + 1;
  }

  calculateCost(model, usage) {
    const rates = {
      'grok-4': { input: 3, output: 15 },
      'grok-4-heavy': { input: 5, output: 20 },
      'grok-3': { input: 1, output: 5 },
      'grok-3-mini': { input: 0.5, output: 2 }
    };
    
    const rate = rates[model] || rates['grok-4'];
    return (usage.prompt_tokens / 1000000) * rate.input +
           (usage.completion_tokens / 1000000) * rate.output;
  }

  getReport() {
    const avgLatency = this.metrics.latency.length > 0 ?
      this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length : 0;
    
    return {
      ...this.metrics,
      avgLatency,
      totalCost: this.metrics.costs.tokens + this.metrics.costs.search,
      avgCostPerRequest: (this.metrics.costs.tokens + this.metrics.costs.search) / 
                        this.metrics.requests,
      errorRate: Object.values(this.metrics.errors).reduce((a, b) => a + b, 0) / 
                this.metrics.requests
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Live Context Integration
```javascript
class GrokDebateEnhancer {
  async enhanceWithLiveContext(topic) {
    // Use Grok's unique X integration
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [
          {
            role: 'system',
            content: 'Analyze current X discussions and trending opinions.'
          },
          {
            role: 'user',
            content: `What are the latest viewpoints on X about: ${topic}`
          }
        ]
      })
    });
    
    return await response.json();
  }
}
```

### 2. Extended Debate Management
```javascript
class GrokDebateManager {
  constructor() {
    this.debateHistory = [];
    this.maxContextTokens = 256000; // Grok 4 Heavy
  }

  async conductDebateRound(participants, topic) {
    // Use different Grok models for different roles
    const assignments = {
      moderator: 'grok-4',        // Best reasoning
      debater1: 'grok-3',         // Cost-effective
      debater2: 'grok-3',         // Cost-effective
      factChecker: 'grok-4',      // Needs live search
      summarizer: 'grok-3-mini'   // Simple task
    };
    
    // Execute with proper rate limiting
    const rateLimiter = new GrokRateLimiter();
    const results = [];
    
    for (const [role, model] of Object.entries(assignments)) {
      const canProceed = await rateLimiter.checkRateLimit(1000);
      
      if (!canProceed.allowed) {
        await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
      }
      
      const response = await this.getDebateResponse(role, model, topic);
      results.push({ role, response });
    }
    
    return results;
  }
}
```

## Summary Checklist

✅ Implement exponential backoff with jitter for 429 errors  
✅ Monitor rate limit headers and adjust request frequency  
✅ Handle Grok 4 specific parameter restrictions  
✅ Use appropriate models based on task requirements  
✅ Leverage cached inputs for 75% cost savings  
✅ Implement request batching for better throughput  
✅ Use connection pooling for performance  
✅ Stream responses for real-time UX  
✅ Sanitize inputs and remove unsupported parameters  
✅ Track usage metrics and costs  
✅ Utilize live X data for unique insights  
✅ Manage extended context efficiently  
✅ Implement proper security for API keys  
✅ Cache frequently used responses