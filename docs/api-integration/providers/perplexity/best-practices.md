# Perplexity API Best Practices

## Rate Limit Management

### Understanding Perplexity's Strict Rate Limits
```javascript
class PerplexityRateLimiter {
  constructor() {
    this.limit = 50;  // 50 requests per minute - very restrictive!
    this.requests = [];
    this.resetTime = Date.now() + 60000;
  }

  async checkRateLimit() {
    const now = Date.now();
    
    // Reset counter every minute
    if (now > this.resetTime) {
      this.requests = [];
      this.resetTime = now + 60000;
    }
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // Check if at limit
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      
      return {
        allowed: false,
        waitTime,
        requestsRemaining: 0
      };
    }
    
    // Conservative approach - leave buffer
    const safeLimit = 45;  // Stay under 50 to avoid 429s
    if (this.requests.length >= safeLimit) {
      return {
        allowed: false,
        waitTime: 2000,  // Wait 2 seconds
        requestsRemaining: this.limit - this.requests.length
      };
    }
    
    return {
      allowed: true,
      requestsRemaining: this.limit - this.requests.length
    };
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  getUsageStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < 60000);
    
    return {
      current: recentRequests.length,
      limit: this.limit,
      percentUsed: (recentRequests.length / this.limit) * 100,
      resetIn: Math.max(0, this.resetTime - now)
    };
  }
}
```

### Request Queue Management
```javascript
class PerplexityQueueManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.queue = [];
    this.processing = false;
    this.rateLimiter = new PerplexityRateLimiter();
    this.minInterval = 1200;  // 1.2 seconds between requests (50/min)
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
      
      // Add to queue based on priority
      if (priority === 'high') {
        this.queue.unshift(queueItem);
      } else {
        this.queue.push(queueItem);
      }
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const rateCheck = await this.rateLimiter.checkRateLimit();
      
      if (!rateCheck.allowed) {
        console.log(`Rate limit: waiting ${rateCheck.waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, rateCheck.waitTime));
        continue;
      }
      
      const item = this.queue.shift();
      
      try {
        const response = await this.executeRequest(item.request);
        this.rateLimiter.recordRequest();
        item.resolve(response);
        
        // Minimum interval between requests
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.minInterval));
        }
      } catch (error) {
        if (error.status === 429) {
          // Put back in queue for retry
          this.queue.unshift(item);
          // Wait significantly on 429
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          item.reject(error);
        }
      }
    }
    
    this.processing = false;
  }

  async executeRequest(request) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.response = await response.text();
      throw error;
    }
    
    return await response.json();
  }
}
```

## Error Handling Best Practices

### Comprehensive Error Handler
```javascript
class PerplexityErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const error = await this.parseError(response);
          
          if (response.status === 429) {
            // Rate limit - check for Retry-After header
            const retryAfter = response.headers.get('retry-after');
            const delay = this.calculateDelay(attempt, retryAfter);
            
            console.log(`Rate limit hit (attempt ${attempt + 1}/${maxRetries}). Waiting ${delay}ms...`);
            await this.wait(delay);
            continue;
          }
          
          if (response.status === 401) {
            throw new Error('Invalid API key or Pro subscription required');
          }
          
          if (response.status >= 500) {
            // Server error - retry with backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Server error. Retrying in ${delay}ms...`);
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
      const text = await response.text();
      const error = JSON.parse(text);
      return {
        message: error.error || error.message || text,
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

  calculateDelay(attempt, retryAfter) {
    if (retryAfter) {
      // Use server-provided retry time
      return parseInt(retryAfter) * 1000;
    }
    
    // Exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    
    // Longer delays for Perplexity due to strict limits
    return Math.min(base * 2 + jitter, 120000);  // Max 2 minutes
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
class PerplexityModelSelector {
  selectOptimalModel(task) {
    const models = {
      'sonar': {
        cost: {
          search: 0.005,  // $5 per 1000 searches
          input: 0.00000133,  // $1 per 750K words
          output: 0.00000133
        },
        context: 127000,
        citations: 'standard',
        speed: 'fast'
      },
      'sonar-pro': {
        cost: {
          search: 0.005,
          input: 0.000004,  // $3 per 750K words
          output: 0.00002   // $15 per 750K words
        },
        context: 200000,
        citations: 'double',  // 2x citations
        speed: 'moderate'
      },
      'llama-3.1-sonar-small': {
        cost: {
          search: 0.005,
          input: 0.000001,
          output: 0.000001
        },
        context: 127000,
        parameters: '8B'
      },
      'llama-3.1-sonar-large': {
        cost: {
          search: 0.005,
          input: 0.0000015,
          output: 0.0000015
        },
        context: 127000,
        parameters: '70B'
      }
    };
    
    // Decision logic
    if (task.requiresMaxCitations || task.complexity === 'high') {
      return 'sonar-pro';  // Double citations, better accuracy
    }
    
    if (task.costSensitive && task.simple) {
      return 'llama-3.1-sonar-small';  // Cheapest option
    }
    
    if (task.needsLargeContext) {
      return 'sonar-pro';  // 200K context
    }
    
    return 'sonar';  // Balanced default
  }

  estimateCost(model, searches, inputWords, outputWords) {
    const models = this.getModelPricing();
    const pricing = models[model].cost;
    
    const searchCost = searches * pricing.search;
    const inputCost = (inputWords / 750000) * (pricing.input * 750000);
    const outputCost = (outputWords / 750000) * (pricing.output * 750000);
    
    return {
      searchCost,
      inputCost,
      outputCost,
      total: searchCost + inputCost + outputCost
    };
  }
}
```

### 2. Search Result Caching
```javascript
class PerplexityCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 3600000;  // 1 hour
  }

  generateKey(query, options = {}) {
    const key = JSON.stringify({
      q: query.toLowerCase().trim(),
      domains: options.search_domain_filter?.sort(),
      recency: options.search_recency_filter
    });
    
    return key;
  }

  get(query, options) {
    const key = this.generateKey(query, options);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('Cache hit for query:', query);
      return cached.data;
    }
    
    return null;
  }

  set(query, options, data) {
    const key = this.generateKey(query, options);
    
    // LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCacheStats() {
    let validEntries = 0;
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.ttl) {
        validEntries++;
      }
    }
    
    return {
      size: this.cache.size,
      validEntries,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}
```

### 3. Request Batching and Deduplication
```javascript
class PerplexityBatchProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.pendingRequests = new Map();
    this.cache = new PerplexityCache();
    this.queueManager = new PerplexityQueueManager(apiKey);
  }

  async processRequest(query, options = {}) {
    // Check cache first
    const cached = this.cache.get(query, options);
    if (cached) {
      return cached;
    }
    
    // Check for pending duplicate request
    const requestKey = this.cache.generateKey(query, options);
    
    if (this.pendingRequests.has(requestKey)) {
      // Wait for existing request
      return await this.pendingRequests.get(requestKey);
    }
    
    // Create new request promise
    const requestPromise = this.executeRequest(query, options);
    this.pendingRequests.set(requestKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.cache.set(query, options, result);
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  async executeRequest(query, options) {
    return await this.queueManager.addRequest({
      model: options.model || 'sonar',
      messages: [
        { role: 'user', content: query }
      ],
      ...options
    });
  }
}
```

## Performance Optimization

### 1. Domain Filtering Strategy
```javascript
class DomainOptimizer {
  constructor() {
    this.trustedDomains = {
      news: ['reuters.com', 'apnews.com', 'bbc.com', 'npr.org'],
      science: ['nature.com', 'science.org', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov'],
      tech: ['techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com'],
      factCheck: ['factcheck.org', 'snopes.com', 'politifact.com'],
      academic: ['scholar.google.com', 'jstor.org', 'ieee.org']
    };
  }

  getDomainsForTopic(topic) {
    const keywords = topic.toLowerCase();
    const domains = [];
    
    if (keywords.includes('research') || keywords.includes('study')) {
      domains.push(...this.trustedDomains.science);
      domains.push(...this.trustedDomains.academic);
    }
    
    if (keywords.includes('news') || keywords.includes('current')) {
      domains.push(...this.trustedDomains.news);
    }
    
    if (keywords.includes('tech') || keywords.includes('ai') || keywords.includes('software')) {
      domains.push(...this.trustedDomains.tech);
    }
    
    if (keywords.includes('fact') || keywords.includes('verify')) {
      domains.push(...this.trustedDomains.factCheck);
    }
    
    // Limit to 10 domains for performance
    return domains.slice(0, 10);
  }
}
```

### 2. Streaming Optimization
```javascript
class PerplexityStreamOptimizer {
  async streamWithBuffer(request, onChunk, bufferSize = 10) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
    let chunkBuffer = '';
    let chunkCount = 0;
    
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
            // Flush remaining buffer
            if (chunkBuffer) {
              onChunk(chunkBuffer);
            }
            break;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              chunkBuffer += content;
              chunkCount++;
              
              // Flush buffer periodically
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
class PerplexitySecurityManager {
  validateAPIKey() {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable not set');
    }
    
    // Basic validation
    if (apiKey.length < 30) {
      throw new Error('API key appears to be invalid');
    }
    
    // Check Pro subscription (make test request)
    return this.verifyProSubscription(apiKey);
  }

  async verifyProSubscription(apiKey) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 2. Query Sanitization
```javascript
class PerplexityQuerySanitizer {
  sanitize(query) {
    // Remove potential injection attempts
    let sanitized = query
      .replace(/[<>]/g, '')  // Remove HTML tags
      .replace(/\\/g, '')    // Remove escape characters
      .trim();
    
    // Limit query length
    const maxLength = 4000;  // Conservative limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  validateDomains(domains) {
    if (!Array.isArray(domains)) {
      return [];
    }
    
    // Validate domain format
    const validDomains = domains.filter(domain => {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      return domainRegex.test(domain);
    });
    
    // Limit number of domains
    return validDomains.slice(0, 20);
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class PerplexityUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      searches: 0,
      tokens: { input: 0, output: 0 },
      costs: { search: 0, tokens: 0, total: 0 },
      errors: { 429: 0, 500: 0, other: 0 },
      cacheHits: 0,
      cacheMisses: 0,
      avgLatency: 0,
      models: {}
    };
  }

  trackRequest(response, latency, cached = false) {
    this.metrics.requests++;
    
    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      this.metrics.searches++;
    }
    
    // Track usage from response
    if (response.usage) {
      this.metrics.tokens.input += response.usage.prompt_tokens || 0;
      this.metrics.tokens.output += response.usage.completion_tokens || 0;
      this.metrics.costs.total += response.usage.total_cost || 0;
    }
    
    // Track latency
    const currentAvg = this.metrics.avgLatency;
    const totalRequests = this.metrics.requests;
    this.metrics.avgLatency = 
      (currentAvg * (totalRequests - 1) + latency) / totalRequests;
    
    // Track by model
    const model = response.model || 'unknown';
    if (!this.metrics.models[model]) {
      this.metrics.models[model] = { count: 0, cost: 0 };
    }
    this.metrics.models[model].count++;
    this.metrics.models[model].cost += response.usage?.total_cost || 0;
  }

  trackError(status) {
    if (status === 429) {
      this.metrics.errors[429]++;
    } else if (status >= 500) {
      this.metrics.errors[500]++;
    } else {
      this.metrics.errors.other++;
    }
  }

  getReport() {
    const cacheHitRate = this.metrics.cacheHits / 
                        (this.metrics.cacheHits + this.metrics.cacheMisses);
    
    return {
      ...this.metrics,
      cacheHitRate: cacheHitRate || 0,
      avgCostPerSearch: this.metrics.costs.total / this.metrics.searches,
      errorRate: (this.metrics.errors[429] + this.metrics.errors[500] + 
                 this.metrics.errors.other) / this.metrics.requests
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Fact-Checking Pipeline
```javascript
class DebateFactChecker {
  constructor(apiKey) {
    this.batchProcessor = new PerplexityBatchProcessor(apiKey);
    this.domainOptimizer = new DomainOptimizer();
  }

  async factCheckDebate(statements) {
    const factChecks = [];
    
    // Process in batches to respect rate limits
    for (const statement of statements) {
      const domains = this.domainOptimizer.getDomainsForTopic(statement);
      
      const result = await this.batchProcessor.processRequest(
        `Fact check: "${statement}"`,
        {
          model: 'sonar-pro',  // Better accuracy
          search_domain_filter: domains,
          search_recency_filter: 'month',
          max_tokens: 200
        }
      );
      
      factChecks.push({
        statement,
        verification: result.choices[0].message.content,
        sources: result.search_results
      });
      
      // Rate limit consideration
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return factChecks;
  }
}
```

### 2. Source Aggregation
```javascript
class DebateSourceAggregator {
  aggregateSources(responses) {
    const allSources = new Map();
    
    for (const response of responses) {
      if (response.search_results) {
        for (const source of response.search_results) {
          const key = source.url;
          
          if (!allSources.has(key)) {
            allSources.set(key, {
              ...source,
              citations: 1,
              usedIn: []
            });
          } else {
            const existing = allSources.get(key);
            existing.citations++;
          }
        }
      }
    }
    
    // Sort by citation frequency
    return Array.from(allSources.values())
      .sort((a, b) => b.citations - a.citations);
  }
}
```

## Summary Checklist

✅ Implement strict rate limiting (50 req/min)  
✅ Use request queuing with priority  
✅ Cache search results aggressively  
✅ Handle 429 errors with long backoff  
✅ Select models based on citation needs  
✅ Filter domains for trusted sources  
✅ Use recency filters appropriately  
✅ Batch and deduplicate requests  
✅ Stream with buffering for efficiency  
✅ Monitor usage and costs closely  
✅ Track cache hit rates  
✅ Implement fallback strategies  
✅ Sanitize queries and domains  
✅ Aggregate sources across debates