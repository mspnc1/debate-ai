# Mistral AI API Best Practices

## Rate Limit Management

### Understanding Mistral Rate Limits
```javascript
class MistralRateLimiter {
  constructor() {
    // Check actual limits at: https://admin.mistral.ai/plateforme/limits
    this.limits = {
      hobbyist: {
        rpm: 60,  // Estimated
        tpm: 100000  // Estimated
      },
      standard: {
        rpm: 500,
        tpm: 1000000
      },
      enterprise: {
        rpm: 'custom',
        tpm: 'custom'
      }
    };
    
    this.requests = [];
    this.tokens = 0;
    this.resetTime = Date.now() + 60000;
  }

  async checkRateLimit(estimatedTokens) {
    const now = Date.now();
    
    // Reset counters every minute
    if (now > this.resetTime) {
      this.requests = [];
      this.tokens = 0;
      this.resetTime = now + 60000;
    }
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 60000);
    
    const tier = this.getUserTier();
    const limits = this.limits[tier];
    
    // Check request limit
    if (this.requests.length >= limits.rpm) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      return { allowed: false, waitTime, reason: 'rpm_limit' };
    }
    
    // Check token limit
    if (this.tokens + estimatedTokens > limits.tpm) {
      const waitTime = this.resetTime - now;
      return { allowed: false, waitTime, reason: 'tpm_limit' };
    }
    
    return { allowed: true };
  }

  recordRequest(tokensUsed) {
    this.requests.push(Date.now());
    this.tokens += tokensUsed;
  }

  getUserTier() {
    // Determine based on API key or account settings
    const tier = process.env.MISTRAL_TIER || 'standard';
    return tier;
  }
}
```

### Handling 429 Errors
```javascript
class MistralErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const errorData = await this.parseError(response);
          
          if (response.status === 429) {
            // Rate limit exceeded
            const delay = this.calculateBackoff(attempt);
            console.log(`Rate limit hit: "${errorData.message}". Retrying in ${delay}ms...`);
            await this.wait(delay);
            continue;
          }
          
          if (response.status === 401) {
            throw new Error('Invalid API key or payment activation required');
          }
          
          if (response.status >= 500) {
            // Server error - retry with backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Server error. Retrying in ${delay}ms...`);
            await this.wait(delay);
            continue;
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`);
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
      const text = await response.text();
      const error = JSON.parse(text);
      return {
        message: error.message || error.error || text,
        code: error.code,
        status: response.status
      };
    } catch {
      return {
        message: `HTTP ${response.status}`,
        status: response.status
      };
    }
  }

  calculateBackoff(attempt) {
    // Exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(base + jitter, 60000); // Max 60 seconds
  }

  isRetryable(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           error.status === 429 ||
           error.status >= 500;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Cost Optimization

### 1. Smart Model Selection
```javascript
class MistralModelOptimizer {
  selectOptimalModel(task) {
    const models = {
      'mistral-large-2': {
        cost: { input: 3, output: 9 },
        capabilities: ['complex-reasoning', 'functions', 'math'],
        context: 128000
      },
      'mistral-medium-3': {
        cost: { input: 2.75, output: 8.1 },
        capabilities: ['balanced', 'functions'],
        context: 32000
      },
      'mistral-small': {
        cost: { input: 1, output: 3 },
        capabilities: ['basic', 'fast'],
        context: 32000
      },
      'mistral-nemo': {
        cost: { input: 0.3, output: 0.3 },
        capabilities: ['general'],
        context: 128000
      },
      'codestral-latest': {
        cost: { input: 1, output: 1 },
        capabilities: ['code', '80-languages'],
        context: 256000
      },
      'mistral-7b': {
        cost: { input: 0.25, output: 0.25 },
        capabilities: ['basic', 'open'],
        context: 32000
      }
    };
    
    // Decision logic
    if (task.type === 'code') {
      if (task.contextSize > 32000) {
        return 'codestral-latest';  // 256K context for code
      }
      return 'codestral-mamba-latest';  // Linear inference
    }
    
    if (task.complexity === 'high' || task.requiresMath) {
      return 'mistral-large-2';
    }
    
    if (task.costCritical && task.simple) {
      return 'mistral-7b';  // Cheapest option
    }
    
    if (task.needsLargeContext && task.general) {
      return 'mistral-nemo';  // 128K context, low cost
    }
    
    return 'mistral-medium-3';  // Balanced default
  }

  estimateCost(model, inputTokens, outputTokens) {
    const models = this.getModelPricing();
    const pricing = models[model]?.cost || { input: 1, output: 3 };
    
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    
    return {
      inputCost,
      outputCost,
      total: inputCost + outputCost
    };
  }
}
```

### 2. Context Management
```javascript
class MistralContextManager {
  constructor() {
    this.contextLimits = {
      'mistral-large-2': 128000,
      'mistral-medium-3': 32000,
      'mistral-small': 32000,
      'mistral-nemo': 128000,
      'codestral-latest': 256000,  // Largest context!
      'mistral-7b': 32000
    };
  }

  optimizeContext(messages, model) {
    const limit = this.contextLimits[model] || 32000;
    let totalTokens = 0;
    const optimized = [];
    
    // Process from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);
      
      if (totalTokens + tokens > limit * 0.9) { // Leave 10% buffer
        // Summarize older messages
        if (i > 0) {
          const summary = this.summarizeMessages(messages.slice(0, i));
          optimized.unshift({
            role: 'system',
            content: `Previous context: ${summary}`
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
    // Adjust for multilingual content
    const isMultilingual = /[^\x00-\x7F]/.test(text);
    const charsPerToken = isMultilingual ? 3 : 4;
    return Math.ceil(text.length / charsPerToken);
  }

  summarizeMessages(messages) {
    // Create concise summary
    const points = messages
      .filter(m => m.role === 'user')
      .map(m => m.content.substring(0, 100))
      .join('; ');
    
    return `Previous discussion: ${points}`;
  }
}
```

### 3. Response Caching
```javascript
class MistralCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 3600000; // 1 hour
    this.stats = {
      hits: 0,
      misses: 0,
      savings: 0
    };
  }

  generateKey(model, messages, options = {}) {
    const key = JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature,
      jsonMode: options.response_format?.type === 'json_object'
    });
    
    return this.hash(key);
  }

  hash(str) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  get(model, messages, options) {
    const key = this.generateKey(model, messages, options);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.stats.hits++;
      
      // Estimate cost savings
      const optimizer = new MistralModelOptimizer();
      const cost = optimizer.estimateCost(
        model,
        cached.usage.prompt_tokens,
        cached.usage.completion_tokens
      );
      this.stats.savings += cost.total;
      
      return cached.data;
    }
    
    this.stats.misses++;
    return null;
  }

  set(model, messages, options, data, usage) {
    const key = this.generateKey(model, messages, options);
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      usage,
      timestamp: Date.now()
    });
  }

  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    
    return {
      ...this.stats,
      hitRate: hitRate || 0,
      estimatedSavings: `$${this.stats.savings.toFixed(4)}`
    };
  }
}
```

## Performance Optimization

### 1. Request Batching
```javascript
class MistralBatchProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.queue = [];
    this.processing = false;
    this.batchSize = 5;
    this.batchDelay = 200; // ms between batches
  }

  async addRequest(request, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const queueItem = {
        request,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      };
      
      if (priority === 'high') {
        this.queue.unshift(queueItem);
      } else {
        this.queue.push(queueItem);
      }
      
      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  async processBatch() {
    this.processing = true;
    const rateLimiter = new MistralRateLimiter();
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process batch in parallel
      const promises = batch.map(async (item) => {
        try {
          // Check rate limit
          const canProceed = await rateLimiter.checkRateLimit(1000);
          
          if (!canProceed.allowed) {
            // Put back in queue
            this.queue.unshift(item);
            await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
            return null;
          }
          
          const response = await this.executeRequest(item.request);
          rateLimiter.recordRequest(response.usage?.total_tokens || 0);
          item.resolve(response);
        } catch (error) {
          item.reject(error);
        }
      });
      
      await Promise.allSettled(promises);
      
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }
    
    this.processing = false;
  }

  async executeRequest(request) {
    const errorHandler = new MistralErrorHandler();
    return await errorHandler.handleRequest(() =>
      fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })
    );
  }
}
```

### 2. Streaming Optimization
```javascript
class MistralStreamOptimizer {
  async streamWithBuffer(request, onChunk, bufferSize = 5) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkBuffer = '';
    let chunkCount = 0;
    
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            if (chunkBuffer) {
              onChunk(chunkBuffer);
            }
            
            return {
              totalTime: Date.now() - startTime,
              timeToFirstToken: firstTokenTime - startTime,
              tokenCount,
              tokensPerSecond: tokenCount / ((Date.now() - startTime) / 1000)
            };
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              
              tokenCount++;
              chunkBuffer += content;
              chunkCount++;
              
              if (chunkCount >= bufferSize) {
                onChunk(chunkBuffer);
                chunkBuffer = '';
                chunkCount = 0;
              }
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class MistralSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable not set');
    }
    
    // Validate key format (workspace-scoped)
    if (!apiKey.includes('-')) {
      console.warn('API key may be invalid or using old format');
    }
    
    return apiKey;
  }

  async verifyPaymentActivation(apiKey) {
    // Test if payments are activated
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      if (response.status === 401) {
        throw new Error('Payment activation required for API access');
      }
      
      return response.ok;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }
}
```

### 2. Input Sanitization
```javascript
class MistralInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/<<SYS>>/gi, '')
      .replace(/<</gi, '')
      .replace(/>>/gi, '')
      .trim();
    
    // Validate length based on model
    const maxLength = this.getMaxLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  getMaxLength() {
    // Conservative limits based on context window
    const model = process.env.MISTRAL_MODEL || 'mistral-medium-latest';
    const limits = {
      'codestral-latest': 256000 * 3,  // ~256K tokens
      'mistral-nemo': 128000 * 3,      // ~128K tokens
      'mistral-large-2': 128000 * 3,
      'mistral-medium-3': 32000 * 3,
      'mistral-small': 32000 * 3
    };
    
    return limits[model] || 96000;  // Default ~32K tokens
  }

  validateFunctionCall(functionDef) {
    // Validate function definitions
    if (!functionDef.name || !functionDef.parameters) {
      throw new Error('Invalid function definition');
    }
    
    // Validate parameter schema
    if (functionDef.parameters.type !== 'object') {
      throw new Error('Function parameters must be an object');
    }
    
    return true;
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class MistralUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byModel: {} },
      errors: { 429: 0, 401: 0, 500: 0, other: 0 },
      latency: [],
      models: {},
      functions: { called: 0, successful: 0 }
    };
  }

  trackRequest(model, usage, latency, options = {}) {
    this.metrics.requests++;
    
    // Track tokens
    this.metrics.tokens.input += usage.prompt_tokens || 0;
    this.metrics.tokens.output += usage.completion_tokens || 0;
    
    // Calculate cost
    const optimizer = new MistralModelOptimizer();
    const cost = optimizer.estimateCost(
      model,
      usage.prompt_tokens || 0,
      usage.completion_tokens || 0
    );
    
    this.metrics.costs.total += cost.total;
    
    // Track by model
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = {
        count: 0,
        tokens: 0,
        cost: 0,
        avgLatency: 0
      };
    }
    
    const modelMetrics = this.metrics.models[model];
    modelMetrics.count++;
    modelMetrics.tokens += usage.total_tokens || 0;
    modelMetrics.cost += cost.total;
    modelMetrics.avgLatency = 
      (modelMetrics.avgLatency * (modelMetrics.count - 1) + latency) / 
      modelMetrics.count;
    
    // Track latency
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
    
    // Track function calls
    if (options.functionCalled) {
      this.metrics.functions.called++;
      if (options.functionSuccess) {
        this.metrics.functions.successful++;
      }
    }
  }

  trackError(status) {
    if (status === 429) {
      this.metrics.errors[429]++;
    } else if (status === 401) {
      this.metrics.errors[401]++;
    } else if (status >= 500) {
      this.metrics.errors[500]++;
    } else {
      this.metrics.errors.other++;
    }
  }

  getReport() {
    const avgLatency = this.metrics.latency.length > 0 ?
      this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length : 0;
    
    const totalErrors = Object.values(this.metrics.errors).reduce((a, b) => a + b, 0);
    
    return {
      ...this.metrics,
      avgLatency,
      avgCostPerRequest: this.metrics.costs.total / this.metrics.requests,
      errorRate: totalErrors / this.metrics.requests,
      functionSuccessRate: this.metrics.functions.called > 0 ?
        this.metrics.functions.successful / this.metrics.functions.called : 0
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Multilingual Debate Support
```javascript
class MistralMultilingualDebate {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.languageModels = {
      'en': 'mistral-medium-latest',
      'fr': 'mistral-large-latest',  // Better for French
      'de': 'mistral-large-latest',  // Better for German
      'es': 'mistral-large-latest',  // Better for Spanish
      'code': 'codestral-latest'     // For technical debates
    };
  }

  async conductDebate(topic, language = 'en') {
    const model = this.languageModels[language] || 'mistral-medium-latest';
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are debating in ${language}. Respond naturally in this language.`
          },
          {
            role: 'user',
            content: topic
          }
        ],
        temperature: 0.7
      })
    });
    
    return await response.json();
  }
}
```

### 2. Code-Based Debates
```javascript
class CodeDebateManager {
  async analyzeCodeArgument(code, position) {
    // Use Codestral for technical debates
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'codestral-latest',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer debating code architecture.'
          },
          {
            role: 'user',
            content: `Analyze this code and argue ${position}:\n${code}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    return await response.json();
  }
}
```

## Summary Checklist

✅ Implement rate limiting with tier awareness  
✅ Use exponential backoff for 429 errors  
✅ Verify payment activation  
✅ Select models based on task requirements  
✅ Leverage 256K context with Codestral  
✅ Cache responses to reduce costs  
✅ Batch requests efficiently  
✅ Stream with buffering  
✅ Secure API keys (workspace-scoped)  
✅ Sanitize inputs properly  
✅ Track usage and costs by model  
✅ Monitor function call success rates  
✅ Utilize multilingual capabilities  
✅ Use specialized models (Codestral for code)