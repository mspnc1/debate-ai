# DeepSeek API Best Practices

## Rate Limit Management (No Limits!)

### Understanding DeepSeek's Unique Approach
```javascript
class DeepSeekLoadManager {
  constructor() {
    // DeepSeek has NO rate limits but may slow responses under load
    this.requestStats = {
      total: 0,
      slowResponses: 0,
      timeouts: 0,
      avgResponseTime: 0
    };
    
    this.slowThreshold = 10000; // 10 seconds
    this.timeoutThreshold = 1800000; // 30 minutes (DeepSeek max)
  }

  async makeRequest(requestOptions) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutThreshold);
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      // Track statistics
      this.updateStats(responseTime);
      
      if (responseTime > this.slowThreshold) {
        console.log(`Slow response detected: ${responseTime}ms (server may be under load)`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        this.requestStats.timeouts++;
        console.error('Request timeout after 30 minutes');
        // Consider retrying with simpler request
        throw new Error('DeepSeek request timeout - consider reducing complexity');
      }
      
      throw error;
    }
  }

  updateStats(responseTime) {
    this.requestStats.total++;
    
    if (responseTime > this.slowThreshold) {
      this.requestStats.slowResponses++;
    }
    
    // Update average response time
    const currentAvg = this.requestStats.avgResponseTime;
    this.requestStats.avgResponseTime = 
      (currentAvg * (this.requestStats.total - 1) + responseTime) / this.requestStats.total;
  }

  getLoadIndicator() {
    const slowRate = this.requestStats.slowResponses / this.requestStats.total;
    
    if (slowRate > 0.5) {
      return 'heavy'; // More than 50% slow responses
    } else if (slowRate > 0.2) {
      return 'moderate'; // 20-50% slow responses
    }
    return 'light'; // Less than 20% slow responses
  }
}
```

### Keep-Alive Connection Management
```javascript
class KeepAliveManager {
  async requestWithKeepAlive(requestOptions, onKeepAlive) {
    let lastKeepAlive = Date.now();
    const keepAliveThreshold = 30000; // Expect keep-alive every 30s
    
    const checkKeepAlive = setInterval(() => {
      const timeSinceLastKeepAlive = Date.now() - lastKeepAlive;
      
      if (timeSinceLastKeepAlive > keepAliveThreshold * 2) {
        console.warn('No keep-alive received for', timeSinceLastKeepAlive, 'ms');
      }
    }, keepAliveThreshold);
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=1800'  // 30 minutes
        }
      });
      
      if (requestOptions.body && JSON.parse(requestOptions.body).stream) {
        // Handle streaming with keep-alive
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
            if (line.includes(': keep-alive')) {
              lastKeepAlive = Date.now();
              if (onKeepAlive) {
                onKeepAlive({ timestamp: lastKeepAlive });
              }
            }
          }
        }
      }
      
      clearInterval(checkKeepAlive);
      return response;
    } catch (error) {
      clearInterval(checkKeepAlive);
      throw error;
    }
  }
}
```

## Cost Optimization

### 1. Smart Model Selection
```javascript
class DeepSeekCostOptimizer {
  constructor() {
    this.models = {
      'deepseek-reasoner': {
        input: 0.55,
        output: 2.19,
        cacheHit: 0.14,
        avgTokens: 23000,  // Average for reasoning
        capabilities: ['deep-reasoning', 'math', 'step-by-step']
      },
      'deepseek-chat': {
        input: 0.27,
        output: 1.10,
        cacheHit: 0.07,
        avgTokens: 500,  // Average for chat
        capabilities: ['general', 'fast', 'efficient']
      }
    };
    
    this.offPeakDiscount = 0.5;  // 50% off during 16:30-00:30 UTC
  }

  selectOptimalModel(task) {
    // Analyze task requirements
    const requiresReasoning = this.requiresReasoning(task);
    const estimatedComplexity = this.estimateComplexity(task);
    
    if (requiresReasoning || estimatedComplexity > 7) {
      return {
        model: 'deepseek-reasoner',
        reason: 'Complex task requires deep reasoning',
        estimatedCost: this.estimateCost('deepseek-reasoner', task)
      };
    }
    
    return {
      model: 'deepseek-chat',
      reason: 'Standard task - V3 is sufficient',
      estimatedCost: this.estimateCost('deepseek-chat', task)
    };
  }

  requiresReasoning(task) {
    const reasoningKeywords = [
      'solve', 'prove', 'calculate', 'derive',
      'explain why', 'step by step', 'analyze',
      'compare and contrast', 'evaluate'
    ];
    
    const taskLower = task.toLowerCase();
    return reasoningKeywords.some(keyword => taskLower.includes(keyword));
  }

  estimateComplexity(task) {
    let score = 0;
    
    // Length factor
    score += Math.min(task.length / 100, 5);
    
    // Math symbols
    if (/[∫∑∏√∂∇]/.test(task)) score += 3;
    if (/\d+[\+\-\*\/]\d+/.test(task)) score += 2;
    
    // Code blocks
    if (/```[\s\S]*```/.test(task)) score += 2;
    
    // Multi-step indicators
    if (/first|then|finally|step \d+/i.test(task)) score += 2;
    
    return score;
  }

  estimateCost(model, task, options = {}) {
    const modelConfig = this.models[model];
    const isOffPeak = this.isOffPeak();
    
    // Estimate tokens based on task
    const inputTokens = task.length / 4;  // Rough estimate
    const outputTokens = model === 'deepseek-reasoner' 
      ? modelConfig.avgTokens 
      : Math.min(task.length * 2, 1000);
    
    // Calculate base cost
    let inputCost = (inputTokens / 1000000) * modelConfig.input;
    let outputCost = (outputTokens / 1000000) * modelConfig.output;
    
    // Apply cache discount if applicable
    if (options.cached) {
      inputCost = (inputTokens / 1000000) * modelConfig.cacheHit;
    }
    
    // Apply off-peak discount
    if (isOffPeak) {
      inputCost *= this.offPeakDiscount;
      outputCost *= this.offPeakDiscount;
    }
    
    return {
      inputCost,
      outputCost,
      total: inputCost + outputCost,
      isOffPeak,
      isCached: options.cached
    };
  }

  isOffPeak() {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const currentTime = utcHours * 100 + utcMinutes;
    
    // Off-peak: 16:30-00:30 UTC
    return currentTime >= 1630 || currentTime <= 30;
  }
}
```

### 2. Context Cache Optimization
```javascript
class ContextCacheOptimizer {
  constructor() {
    this.contextFingerprints = new Map();
    this.cacheStats = {
      totalSaved: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  generateFingerprint(context) {
    // Generate a fingerprint for context identification
    let hash = 0;
    for (let i = 0; i < Math.min(context.length, 1000); i++) {
      hash = ((hash << 5) - hash) + context.charCodeAt(i);
      hash = hash & hash;
    }
    return `${hash}-${context.length}`;
  }

  async queryWithOptimalCaching(systemContext, queries) {
    const fingerprint = this.generateFingerprint(systemContext);
    const results = [];
    
    // First query establishes cache
    const firstQuery = queries[0];
    const firstResponse = await this.makeQuery(systemContext, firstQuery);
    results.push(firstResponse);
    
    // Track cache establishment
    this.contextFingerprints.set(fingerprint, {
      context: systemContext,
      established: Date.now(),
      tokenCount: firstResponse.usage.prompt_tokens
    });
    
    // Subsequent queries benefit from cache (75% discount)
    for (let i = 1; i < queries.length; i++) {
      const cachedResponse = await this.makeQuery(systemContext, queries[i]);
      results.push(cachedResponse);
      
      // Calculate savings
      if (cachedResponse.usage.prompt_cache_hit_tokens > 0) {
        const savedTokens = cachedResponse.usage.prompt_cache_hit_tokens;
        const normalCost = (savedTokens / 1000000) * 0.27;
        const cacheCost = (savedTokens / 1000000) * 0.07;
        const saved = normalCost - cacheCost;
        
        this.cacheStats.totalSaved += saved;
        this.cacheStats.cacheHits++;
      } else {
        this.cacheStats.cacheMisses++;
      }
    }
    
    return {
      results,
      cacheStats: this.cacheStats,
      estimatedSavings: `$${this.cacheStats.totalSaved.toFixed(4)}`
    };
  }

  async makeQuery(systemContext, userQuery) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemContext },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7
      })
    });
    
    return await response.json();
  }
}
```

### 3. Off-Peak Batch Processing
```javascript
class OffPeakBatchProcessor {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.stats = {
      processed: 0,
      saved: 0,
      avgWaitTime: 0
    };
  }

  async addToBatch(request, options = {}) {
    const estimatedCost = this.estimateCost(request);
    const offPeakCost = estimatedCost * 0.5;
    const savings = estimatedCost - offPeakCost;
    
    if (options.immediate) {
      // Process immediately at current rates
      return await this.processRequest(request);
    }
    
    // Add to queue for off-peak processing
    return new Promise((resolve, reject) => {
      const queueItem = {
        request,
        resolve,
        reject,
        addedAt: Date.now(),
        estimatedSavings: savings
      };
      
      this.queue.push(queueItem);
      
      if (!this.processing) {
        this.scheduleOffPeakProcessing();
      }
      
      console.log(`Queued for off-peak processing. Estimated savings: $${savings.toFixed(4)}`);
    });
  }

  async scheduleOffPeakProcessing() {
    this.processing = true;
    
    const timeUntilOffPeak = this.getTimeUntilOffPeak();
    
    if (timeUntilOffPeak > 0) {
      console.log(`Waiting ${Math.round(timeUntilOffPeak / 60000)} minutes for off-peak rates...`);
      await new Promise(resolve => setTimeout(resolve, timeUntilOffPeak));
    }
    
    console.log('Off-peak period started - processing batch at 50% discount');
    
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      const waitTime = Date.now() - item.addedAt;
      
      try {
        const result = await this.processRequest(item.request);
        
        // Track statistics
        this.stats.processed++;
        this.stats.saved += item.estimatedSavings;
        this.stats.avgWaitTime = 
          (this.stats.avgWaitTime * (this.stats.processed - 1) + waitTime) / 
          this.stats.processed;
        
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
    
    this.processing = false;
    console.log(`Batch complete. Total saved: $${this.stats.saved.toFixed(2)}`);
  }

  getTimeUntilOffPeak() {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const currentTime = utcHours * 100 + utcMinutes;
    
    // Already off-peak?
    if (currentTime >= 1630 || currentTime <= 30) {
      return 0;
    }
    
    // Calculate time until 16:30 UTC
    const offPeakStart = new Date(now);
    offPeakStart.setUTCHours(16, 30, 0, 0);
    
    if (now > offPeakStart) {
      offPeakStart.setDate(offPeakStart.getDate() + 1);
    }
    
    return offPeakStart - now;
  }

  estimateCost(request) {
    const model = request.model || 'deepseek-chat';
    const estimatedTokens = request.max_tokens || 1000;
    
    const pricing = {
      'deepseek-reasoner': { input: 0.55, output: 2.19 },
      'deepseek-chat': { input: 0.27, output: 1.10 }
    };
    
    const modelPricing = pricing[model];
    return (estimatedTokens / 1000000) * (modelPricing.input + modelPricing.output);
  }

  async processRequest(request) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return await response.json();
  }
}
```

## Performance Optimization

### 1. Parallel Processing (No Rate Limits!)
```javascript
class ParallelProcessor {
  constructor() {
    // DeepSeek allows unlimited parallel requests
    this.maxConcurrent = 50;  // Self-imposed limit for connection management
  }

  async processParallel(requests) {
    const batches = [];
    
    // Split into batches for manageable parallelism
    for (let i = 0; i < requests.length; i += this.maxConcurrent) {
      batches.push(requests.slice(i, i + this.maxConcurrent));
    }
    
    const results = [];
    
    for (const batch of batches) {
      const batchPromises = batch.map(request => 
        this.makeRequest(request).catch(error => ({
          error: error.message,
          request
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  async makeRequest(request) {
    const startTime = Date.now();
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    const data = await response.json();
    
    return {
      ...data,
      responseTime: Date.now() - startTime
    };
  }
}
```

### 2. Streaming Optimization
```javascript
class StreamOptimizer {
  async streamWithMetrics(request, onChunk, onMetrics) {
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let keepAliveCount = 0;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: true
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        // Handle keep-alive
        if (line.includes(': keep-alive')) {
          keepAliveCount++;
          continue;
        }
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            const metrics = {
              totalTime: Date.now() - startTime,
              timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : 0,
              totalTokens: tokenCount,
              tokensPerSecond: tokenCount / ((Date.now() - startTime) / 1000),
              keepAliveSignals: keepAliveCount,
              content: fullContent
            };
            
            if (onMetrics) onMetrics(metrics);
            return metrics;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              
              tokenCount++;
              fullContent += content;
              
              if (onChunk) onChunk(content);
            }
          } catch (e) {
            // Skip parsing errors
          }
        }
      }
    }
  }
}
```

### 3. Model Warm-up Strategy
```javascript
class ModelWarmup {
  constructor() {
    this.warmedModels = new Set();
    this.warmupStats = new Map();
  }

  async warmupModels() {
    const models = ['deepseek-chat', 'deepseek-reasoner'];
    
    for (const model of models) {
      if (!this.warmedModels.has(model)) {
        const startTime = Date.now();
        
        try {
          const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'Hi' }],
              max_tokens: 1
            })
          });
          
          const responseTime = Date.now() - startTime;
          
          if (response.ok) {
            this.warmedModels.add(model);
            this.warmupStats.set(model, {
              responseTime,
              timestamp: Date.now()
            });
            
            console.log(`Model ${model} warmed up in ${responseTime}ms`);
          }
        } catch (error) {
          console.error(`Failed to warm up ${model}:`, error);
        }
      }
    }
  }

  isModelWarmed(model) {
    if (!this.warmedModels.has(model)) return false;
    
    const stats = this.warmupStats.get(model);
    const age = Date.now() - stats.timestamp;
    
    // Consider model cold after 30 minutes
    return age < 1800000;
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class DeepSeekSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable not set');
    }
    
    // Basic validation
    if (apiKey.length < 30) {
      throw new Error('API key appears to be invalid');
    }
    
    return apiKey;
  }

  async verifyAPIKey(apiKey) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
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
class DeepSeekInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\x00/g, '')  // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Control characters
      .trim();
    
    // Validate length based on model
    const maxLength = this.getMaxLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  getMaxLength() {
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    const limits = {
      'deepseek-reasoner': 64000 * 3,  // ~64K tokens
      'deepseek-chat': 128000 * 3      // ~128K tokens
    };
    
    return limits[model] || 128000 * 3;
  }

  validateReasoningPrompt(prompt) {
    // Check if prompt is suitable for reasoning model
    const estimatedTokens = prompt.length / 4;
    
    if (estimatedTokens > 10000) {
      console.warn('Very long prompt for reasoning model - may result in extensive output');
    }
    
    return true;
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class DeepSeekUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0, cached: 0 },
      costs: { 
        total: 0, 
        saved: 0,
        offPeak: 0,
        cached: 0,
        byModel: {} 
      },
      performance: {
        avgResponseTime: 0,
        slowResponses: 0,
        timeouts: 0
      },
      models: {}
    };
  }

  trackRequest(model, usage, responseTime, options = {}) {
    this.metrics.requests++;
    
    // Track tokens
    this.metrics.tokens.input += usage.prompt_tokens || 0;
    this.metrics.tokens.output += usage.completion_tokens || 0;
    this.metrics.tokens.cached += usage.prompt_cache_hit_tokens || 0;
    
    // Calculate costs
    const optimizer = new DeepSeekCostOptimizer();
    const cost = optimizer.estimateCost(model, '', {
      cached: usage.prompt_cache_hit_tokens > 0
    });
    
    this.metrics.costs.total += cost.total;
    
    if (cost.isOffPeak) {
      this.metrics.costs.offPeak += cost.total * 0.5;  // Track off-peak savings
    }
    
    if (usage.prompt_cache_hit_tokens > 0) {
      const cacheSavings = (usage.prompt_cache_hit_tokens / 1000000) * 0.20;  // Difference
      this.metrics.costs.cached += cacheSavings;
    }
    
    // Track by model
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = {
        count: 0,
        tokens: 0,
        cost: 0,
        avgResponseTime: 0
      };
    }
    
    const modelMetrics = this.metrics.models[model];
    modelMetrics.count++;
    modelMetrics.tokens += usage.total_tokens || 0;
    modelMetrics.cost += cost.total;
    modelMetrics.avgResponseTime = 
      (modelMetrics.avgResponseTime * (modelMetrics.count - 1) + responseTime) / 
      modelMetrics.count;
    
    // Track performance
    this.metrics.performance.avgResponseTime = 
      (this.metrics.performance.avgResponseTime * (this.metrics.requests - 1) + responseTime) / 
      this.metrics.requests;
    
    if (responseTime > 10000) {
      this.metrics.performance.slowResponses++;
    }
    
    if (options.timeout) {
      this.metrics.performance.timeouts++;
    }
  }

  getReport() {
    const totalSaved = this.metrics.costs.offPeak + this.metrics.costs.cached;
    
    return {
      ...this.metrics,
      avgCostPerRequest: this.metrics.costs.total / this.metrics.requests,
      slowResponseRate: this.metrics.performance.slowResponses / this.metrics.requests,
      timeoutRate: this.metrics.performance.timeouts / this.metrics.requests,
      totalSaved,
      savingsRate: totalSaved / (this.metrics.costs.total + totalSaved)
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Reasoning-Powered Debate
```javascript
class ReasoningDebateManager {
  constructor() {
    this.costOptimizer = new DeepSeekCostOptimizer();
    this.cacheOptimizer = new ContextCacheOptimizer();
  }

  async conductDebate(topic, rounds) {
    const debateContext = `You are participating in a formal debate on: ${topic}`;
    const results = [];
    
    // Use cache optimization for shared context
    const queries = rounds.map(round => round.argument);
    const cachedResults = await this.cacheOptimizer.queryWithOptimalCaching(
      debateContext,
      queries
    );
    
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      
      // Decide model based on round complexity
      const model = round.requiresReasoning 
        ? 'deepseek-reasoner' 
        : 'deepseek-chat';
      
      if (round.requiresReasoning) {
        // Use reasoning model for complex arguments
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-reasoner',
            messages: [
              { role: 'system', content: debateContext },
              { role: 'user', content: round.argument }
            ],
            temperature: 0.3,
            max_tokens: 20000
          })
        });
        
        results.push(await response.json());
      } else {
        // Use cached V3 results
        results.push(cachedResults.results[i]);
      }
    }
    
    return {
      results,
      cacheStats: cachedResults.cacheStats,
      estimatedSavings: cachedResults.estimatedSavings
    };
  }
}
```

### 2. Cost-Effective Multi-Round Debates
```javascript
class EconomicalDebateStrategy {
  constructor() {
    this.offPeakProcessor = new OffPeakBatchProcessor();
  }

  async scheduleDebate(debateConfig) {
    const rounds = [];
    
    for (const round of debateConfig.rounds) {
      if (round.priority === 'high' || round.live) {
        // Process immediately
        rounds.push(await this.processRound(round));
      } else {
        // Queue for off-peak processing (50% savings)
        rounds.push(await this.offPeakProcessor.addToBatch({
          model: round.complex ? 'deepseek-reasoner' : 'deepseek-chat',
          messages: round.messages,
          temperature: 0.7,
          max_tokens: round.complex ? 15000 : 1000
        }));
      }
    }
    
    return rounds;
  }

  async processRound(round) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: round.complex ? 'deepseek-reasoner' : 'deepseek-chat',
        messages: round.messages,
        temperature: 0.7
      })
    });
    
    return await response.json();
  }
}
```

## Summary Checklist

✅ Take advantage of NO rate limits  
✅ Implement timeout handling (30-minute max)  
✅ Monitor keep-alive signals  
✅ Use off-peak hours for 50% savings  
✅ Leverage context caching (75% discount)  
✅ Select models based on complexity  
✅ Use R1 only when reasoning needed  
✅ Batch non-urgent requests for off-peak  
✅ Track response times for load indication  
✅ Implement parallel processing  
✅ Warm up models before heavy use  
✅ Monitor slow response patterns  
✅ Use V3 for simple tasks  
✅ Optimize context for cache hits