# Together AI API Best Practices

## Rate Limit Management

### Understanding Together Rate Limits
```javascript
class TogetherRateLimiter {
  constructor() {
    this.limits = {
      free: {
        qps: 1,  // Queries per second
        rpm: 0.3,  // Requests per minute (DeepSeek R1)
        tpm: 10000  // Tokens per minute
      },
      build1: {
        qps: 10,
        rpm: 3,
        tpm: 100000
      },
      build2: {
        qps: 10,
        rpm: 60,
        tpm: 1000000
      },
      build3_4: {
        qps: 10,
        rpm: 400,
        tpm: 10000000
      },
      build5_plus: {
        qps: 10,
        rpm: 1200,
        tpm: 50000000
      },
      enterprise: {
        qps: 'custom',
        rpm: 'unlimited',
        tpm: 'unlimited'
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
    
    // Check QPS limit (per second)
    const recentRequests = this.requests.filter(time => now - time < 1000);
    if (recentRequests.length >= limits.qps) {
      return { allowed: false, waitTime: 1000, reason: 'qps_limit' };
    }
    
    // Check RPM limit
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
    // Determine based on account status or environment
    return process.env.TOGETHER_TIER || 'build1';
  }
}
```

### Handling 429 Errors
```javascript
class TogetherErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const errorData = await this.parseError(response);
          
          if (response.status === 429) {
            // Rate limit exceeded - check headers
            const retryAfter = response.headers.get('retry-after');
            const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
            const rateLimitReset = response.headers.get('x-ratelimit-reset');
            
            const delay = this.calculateBackoff(attempt, retryAfter, rateLimitReset);
            
            console.log(`Rate limit hit. Remaining: ${rateLimitRemaining}. Retrying in ${delay}ms...`);
            await this.wait(delay);
            continue;
          }
          
          if (response.status === 401) {
            throw new Error('Invalid API key');
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

  calculateBackoff(attempt, retryAfter, rateLimitReset) {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    
    if (rateLimitReset) {
      const resetTime = parseInt(rateLimitReset) * 1000;
      return Math.max(0, resetTime - Date.now());
    }
    
    // Exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(base + jitter, 60000); // Max 60 seconds
  }

  async parseError(response) {
    try {
      const text = await response.text();
      const error = JSON.parse(text);
      return {
        message: error.error?.message || error.message || text,
        code: error.error?.code || error.code,
        status: response.status
      };
    } catch {
      return {
        message: `HTTP ${response.status}`,
        status: response.status
      };
    }
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
class TogetherModelOptimizer {
  selectOptimalModel(task) {
    const models = {
      // Llama models
      'llama-3.3-70b-turbo': {
        cost: { input: 0.88, output: 0.88 },
        capabilities: ['general', 'fast', 'recommended'],
        context: 128000
      },
      'llama-3.1-405b': {
        cost: { input: 3.5, output: 3.5 },
        capabilities: ['highest-quality', 'complex'],
        context: 128000
      },
      'llama-3.1-8b': {
        cost: { input: 0.18, output: 0.18 },
        capabilities: ['fast', 'efficient'],
        context: 128000
      },
      // Mixtral models
      'mixtral-8x7b': {
        cost: { input: 0.6, output: 0.6 },
        capabilities: ['moe', 'fast', 'function-calling'],
        context: 32000
      },
      // DeepSeek models
      'deepseek-r1': {
        cost: { input: 0.55, output: 2.19 },
        capabilities: ['reasoning', 'step-by-step'],
        context: 64000
      },
      'deepseek-v3': {
        cost: { input: 0.27, output: 1.10 },
        capabilities: ['general', 'cost-effective'],
        context: 128000
      },
      // Qwen models
      'qwen-2.5-72b': {
        cost: { input: 1.2, output: 1.2 },
        capabilities: ['multilingual', 'high-quality'],
        context: 32000
      }
    };
    
    // Decision logic
    if (task.requiresReasoning) {
      return 'deepseek-r1';
    }
    
    if (task.requiresHighestQuality) {
      return 'llama-3.1-405b';
    }
    
    if (task.requiresFunctionCalling) {
      return 'mixtral-8x7b';  // Best function calling support
    }
    
    if (task.requiresVision) {
      return 'llama-3.2-90b-vision';
    }
    
    if (task.costCritical) {
      if (task.simple) {
        return 'llama-3.2-1b';  // $0.04 per 1M tokens
      }
      return 'llama-3.1-8b';  // $0.18 per 1M tokens
    }
    
    // Default recommendation
    return 'llama-3.3-70b-turbo';
  }

  estimateCost(model, inputTokens, outputTokens) {
    const models = this.getModelPricing();
    const pricing = models[model]?.cost || { input: 0.88, output: 0.88 };
    
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

### 2. Batch Processing Optimization
```javascript
class BatchOptimizer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.batchQueue = [];
    this.processing = false;
  }

  async addToBatch(request) {
    this.batchQueue.push(request);
    
    // Process when batch is full or after delay
    if (this.batchQueue.length >= 100) {
      return await this.processBatch();
    }
    
    if (!this.processing) {
      // Set timer to process batch after delay
      setTimeout(() => this.processBatch(), 5000);
    }
  }

  async processBatch() {
    if (this.batchQueue.length === 0) return;
    
    this.processing = true;
    const requests = [...this.batchQueue];
    this.batchQueue = [];
    
    try {
      // Submit batch for 50% discount
      const batchRequests = requests.map((req, idx) => ({
        custom_id: `req-${Date.now()}-${idx}`,
        method: 'POST',
        url: '/v1/chat/completions',
        body: req
      }));
      
      const response = await fetch('https://api.together.xyz/v1/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batchRequests,
          completion_window: '24h'
        })
      });
      
      const batch = await response.json();
      return batch.id;
    } finally {
      this.processing = false;
    }
  }
}
```

### 3. Response Caching
```javascript
class TogetherCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
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
      topP: options.top_p,
      maxTokens: options.max_tokens
    });
    
    return this.hash(key);
  }

  hash(str) {
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
      const optimizer = new TogetherModelOptimizer();
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

### 1. Request Pooling
```javascript
class RequestPool {
  constructor(apiKey, maxConcurrent = 10) {
    this.apiKey = apiKey;
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.queue = [];
  }

  async execute(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const { request, resolve, reject } = this.queue.shift();
      this.activeRequests++;
      
      this.makeRequest(request)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }
  }

  async makeRequest(request) {
    const errorHandler = new TogetherErrorHandler();
    return await errorHandler.handleRequest(() =>
      fetch('https://api.together.xyz/v1/chat/completions', {
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
class StreamOptimizer {
  async streamWithBuffer(request, onChunk, bufferSize = 5) {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        stream_options: {
          include_usage: true
        }
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

### 3. Model Warm-up
```javascript
class ModelWarmup {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.warmedModels = new Set();
  }

  async warmupModel(model) {
    if (this.warmedModels.has(model)) {
      return;
    }

    try {
      // Send minimal request to warm up model
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1
        })
      });

      if (response.ok) {
        this.warmedModels.add(model);
        console.log(`Model ${model} warmed up successfully`);
      }
    } catch (error) {
      console.error(`Failed to warm up model ${model}:`, error);
    }
  }

  async warmupMultipleModels(models) {
    await Promise.all(models.map(model => this.warmupModel(model)));
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class TogetherSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.TOGETHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('TOGETHER_API_KEY environment variable not set');
    }
    
    // Basic validation
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('together-')) {
      console.warn('API key format may be invalid');
    }
    
    return apiKey;
  }

  async verifyAPIKey(apiKey) {
    try {
      const response = await fetch('https://api.together.xyz/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 2. Input Sanitization
```javascript
class TogetherInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\x00/g, '')  // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Remove control characters
      .trim();
    
    // Validate length based on model
    const maxLength = this.getMaxLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  getMaxLength() {
    const model = process.env.TOGETHER_MODEL || 'llama-3.3-70b';
    const limits = {
      'llama-3.1-405b': 128000 * 3,  // ~128K tokens
      'llama-3.1-70b': 128000 * 3,
      'mixtral-8x7b': 32000 * 3,     // ~32K tokens
      'deepseek-v3': 128000 * 3
    };
    
    return limits[model] || 128000 * 3;
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
    
    // Check for injection in function name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionDef.name)) {
      throw new Error('Invalid function name');
    }
    
    return true;
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class TogetherUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byModel: {} },
      errors: { 429: 0, 401: 0, 500: 0, other: 0 },
      latency: [],
      models: {},
      batchJobs: { submitted: 0, completed: 0, savings: 0 }
    };
  }

  trackRequest(model, usage, latency, options = {}) {
    this.metrics.requests++;
    
    // Track tokens
    this.metrics.tokens.input += usage.prompt_tokens || 0;
    this.metrics.tokens.output += usage.completion_tokens || 0;
    
    // Calculate cost
    const optimizer = new TogetherModelOptimizer();
    const cost = optimizer.estimateCost(
      model,
      usage.prompt_tokens || 0,
      usage.completion_tokens || 0
    );
    
    // Apply batch discount if applicable
    const finalCost = options.batch ? cost.total * 0.5 : cost.total;
    this.metrics.costs.total += finalCost;
    
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
    modelMetrics.cost += finalCost;
    modelMetrics.avgLatency = 
      (modelMetrics.avgLatency * (modelMetrics.count - 1) + latency) / 
      modelMetrics.count;
    
    // Track latency
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
    
    // Track batch jobs
    if (options.batch) {
      this.metrics.batchJobs.completed++;
      this.metrics.batchJobs.savings += cost.total * 0.5;
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
      batchSavingsRate: this.metrics.batchJobs.savings / this.metrics.costs.total
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Multi-Model Consensus
```javascript
class DebateConsensus {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestPool = new RequestPool(apiKey, 5);
  }

  async getMultiModelConsensus(topic, question) {
    const models = [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct'
    ];

    const responses = await Promise.all(
      models.map(model => 
        this.requestPool.execute({
          model,
          messages: [
            {
              role: 'system',
              content: `You are analyzing: ${topic}`
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      )
    );

    return this.analyzeConsensus(responses);
  }

  analyzeConsensus(responses) {
    // Extract and compare responses
    const opinions = responses.map(r => ({
      model: r.model,
      content: r.choices[0].message.content
    }));

    // Find common themes
    // Implementation would include NLP analysis
    return {
      opinions,
      consensusLevel: this.calculateConsensus(opinions)
    };
  }

  calculateConsensus(opinions) {
    // Simple similarity calculation
    // In production, use more sophisticated NLP
    return 0.75; // Placeholder
  }
}
```

### 2. Cost-Optimized Debate Rounds
```javascript
class CostOptimizedDebate {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.batchOptimizer = new BatchOptimizer(apiKey);
  }

  async runDebateRound(participants, topic, roundNumber) {
    // Use cheaper models for initial rounds
    const model = roundNumber <= 2 
      ? 'meta-llama/Llama-3.1-8B-Instruct-Turbo'  // $0.18/1M
      : 'meta-llama/Llama-3.3-70B-Instruct-Turbo'; // $0.88/1M

    const requests = participants.map(p => ({
      model,
      messages: [
        {
          role: 'system',
          content: `You are ${p.name} debating ${topic}`
        },
        {
          role: 'user',
          content: `Round ${roundNumber}: Present your argument`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }));

    // Batch for 50% discount
    if (roundNumber <= 2) {
      const batchId = await this.batchOptimizer.processBatch(requests);
      return { batchId, status: 'processing' };
    }

    // Real-time for final rounds
    return await Promise.all(requests.map(r => 
      fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(r)
      }).then(res => res.json())
    ));
  }
}
```

## Summary Checklist

✅ Implement rate limiting with tier awareness  
✅ Use exponential backoff for 429 errors  
✅ Cache responses to reduce costs  
✅ Select models based on task requirements  
✅ Use batch processing for 50% discount  
✅ Pool requests for optimal concurrency  
✅ Stream with buffering for efficiency  
✅ Warm up models before heavy usage  
✅ Track usage and costs by model  
✅ Monitor error rates and latency  
✅ Use cheaper models for simple tasks  
✅ Batch non-urgent requests  
✅ Implement request deduplication  
✅ Use OpenAI SDK for easy integration