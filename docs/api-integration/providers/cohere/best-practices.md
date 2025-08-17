# Cohere API Best Practices

## Rate Limit Management

### Understanding Cohere Rate Limits
```javascript
class CohereRateLimiter {
  constructor() {
    this.limits = {
      trial: {
        rpm: 100,  // Requests per minute
        generationUnits: 5000,  // Monthly limit
        embedCallsPerMin: 100
      },
      production: {
        rpm: 1000,  // Higher with production key
        custom: true  // Contact sales for limits
      }
    };
    
    this.requests = [];
    this.generationUnits = 0;
    this.resetTime = Date.now() + 60000;
  }

  async checkRateLimit(estimatedUnits = 1) {
    const now = Date.now();
    
    // Reset counters every minute
    if (now > this.resetTime) {
      this.requests = [];
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
    
    // Check monthly generation units (trial only)
    if (tier === 'trial' && this.generationUnits + estimatedUnits > limits.generationUnits) {
      return { allowed: false, waitTime: null, reason: 'monthly_limit' };
    }
    
    return { allowed: true };
  }

  recordRequest(unitsUsed = 1) {
    this.requests.push(Date.now());
    this.generationUnits += unitsUsed;
  }

  getUserTier() {
    // Determine based on API key prefix or env variable
    return process.env.COHERE_TIER || 'trial';
  }
}
```

### Handling 429 Errors
```javascript
class CohereErrorHandler {
  async handleRequest(fn, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          const errorData = await this.parseError(response);
          
          if (response.status === 429) {
            // Rate limit exceeded
            const retryAfter = response.headers.get('retry-after');
            const delay = this.calculateBackoff(attempt, retryAfter);
            
            console.log(`Rate limit hit. Retrying in ${delay}ms...`);
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

  calculateBackoff(attempt, retryAfter) {
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }
    
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
class CohereModelOptimizer {
  selectOptimalModel(task) {
    const models = {
      'command-a-03-2025': {
        cost: { input: 3, output: 15 },
        capabilities: ['highest-performance', 'rag', 'tools'],
        context: 128000,
        throughput: '150%'
      },
      'command-r-plus': {
        cost: { input: 3, output: 15 },
        capabilities: ['complex-rag', 'citations', 'tools'],
        context: 128000
      },
      'command-r': {
        cost: { input: 0.5, output: 1.5 },
        capabilities: ['balanced', 'rag', 'citations'],
        context: 128000
      },
      'command-light': {
        cost: { input: 0.15, output: 0.6 },
        capabilities: ['basic', 'fast'],
        context: 4000
      }
    };
    
    // Decision logic
    if (task.requiresMaxPerformance) {
      return 'command-a-03-2025';  // Newest, fastest
    }
    
    if (task.requiresRAG || task.requiresCitations) {
      if (task.complexity === 'high') {
        return 'command-r-plus';
      }
      return 'command-r';  // Good RAG at lower cost
    }
    
    if (task.simple && task.costSensitive) {
      return 'command-light';  // Cheapest option
    }
    
    return 'command-r';  // Balanced default
  }

  estimateCost(model, inputTokens, outputTokens) {
    const models = this.getModelPricing();
    const pricing = models[model]?.cost || { input: 0.5, output: 1.5 };
    
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

### 2. Document Optimization for RAG
```javascript
class DocumentOptimizer {
  constructor() {
    this.maxDocumentSize = 50000;  // Characters per document
    this.maxDocuments = 100;  // Maximum documents per request
  }

  optimizeDocuments(documents) {
    // Remove duplicates
    const uniqueDocs = this.deduplicateDocuments(documents);
    
    // Chunk large documents
    const chunkedDocs = this.chunkLargeDocuments(uniqueDocs);
    
    // Prioritize by relevance
    const prioritizedDocs = this.prioritizeDocuments(chunkedDocs);
    
    // Trim to max count
    return prioritizedDocs.slice(0, this.maxDocuments);
  }

  deduplicateDocuments(documents) {
    const seen = new Set();
    return documents.filter(doc => {
      const hash = this.hashDocument(doc);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }

  chunkLargeDocuments(documents) {
    const chunked = [];
    
    for (const doc of documents) {
      if (doc.text.length <= this.maxDocumentSize) {
        chunked.push(doc);
      } else {
        // Split into chunks with overlap
        const chunks = this.splitWithOverlap(
          doc.text,
          this.maxDocumentSize,
          500  // 500 char overlap
        );
        
        chunks.forEach((chunk, idx) => {
          chunked.push({
            ...doc,
            id: `${doc.id}_chunk_${idx}`,
            text: chunk,
            metadata: {
              ...doc.metadata,
              chunk_index: idx,
              total_chunks: chunks.length
            }
          });
        });
      }
    }
    
    return chunked;
  }

  splitWithOverlap(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }
    
    return chunks;
  }

  prioritizeDocuments(documents) {
    // Score documents based on various factors
    return documents.map(doc => ({
      ...doc,
      score: this.scoreDocument(doc)
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...doc }) => doc);
  }

  scoreDocument(doc) {
    let score = 0;
    
    // Prefer documents with titles
    if (doc.title) score += 10;
    
    // Prefer documents with URLs
    if (doc.url) score += 5;
    
    // Prefer recent documents
    if (doc.metadata?.date) {
      const age = Date.now() - new Date(doc.metadata.date).getTime();
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 100 - daysSinceCreation);
    }
    
    // Prefer complete documents (not chunks)
    if (!doc.metadata?.chunk_index) score += 20;
    
    return score;
  }

  hashDocument(doc) {
    const content = `${doc.title}|${doc.text}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}
```

### 3. Response Caching
```javascript
class CohereCache {
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

  generateKey(model, messages, documents, options = {}) {
    const key = JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      documents: documents?.map(d => d.id),  // Use IDs for efficiency
      temperature: options.temperature,
      citationMode: options.citation_options?.mode
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

  get(model, messages, documents, options) {
    const key = this.generateKey(model, messages, documents, options);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.stats.hits++;
      
      // Estimate cost savings
      const optimizer = new CohereModelOptimizer();
      const cost = optimizer.estimateCost(
        model,
        cached.usage.billed_units.input_tokens,
        cached.usage.billed_units.output_tokens
      );
      this.stats.savings += cost.total;
      
      return cached.data;
    }
    
    this.stats.misses++;
    return null;
  }

  set(model, messages, documents, options, data, usage) {
    const key = this.generateKey(model, messages, documents, options);
    
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
class CohereBatchProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.queue = [];
    this.processing = false;
    this.batchSize = 10;
    this.batchDelay = 100; // ms between batches
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
    const rateLimiter = new CohereRateLimiter();
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      // Process batch in parallel
      const promises = batch.map(async (item) => {
        try {
          // Check rate limit
          const canProceed = await rateLimiter.checkRateLimit();
          
          if (!canProceed.allowed) {
            // Put back in queue
            this.queue.unshift(item);
            await new Promise(resolve => setTimeout(resolve, canProceed.waitTime));
            return null;
          }
          
          const response = await this.executeRequest(item.request);
          rateLimiter.recordRequest(response.usage?.billed_units?.total || 1);
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
    const errorHandler = new CohereErrorHandler();
    return await errorHandler.handleRequest(() =>
      fetch('https://api.cohere.com/v2/chat', {
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
class CohereStreamOptimizer {
  async streamWithBuffer(request, onChunk, bufferSize = 5) {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
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
            
            if (parsed.type === 'content-delta') {
              const content = parsed.delta?.message?.content?.text;
              
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

### 3. Embedding Optimization
```javascript
class EmbeddingOptimizer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.batchSize = 96;  // Max batch size for embeddings
    this.cache = new Map();
  }

  async getEmbeddings(texts, inputType = 'search_document') {
    const results = new Array(texts.length);
    const toEmbed = [];
    
    // Check cache
    for (let i = 0; i < texts.length; i++) {
      const cached = this.cache.get(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        toEmbed.push({ index: i, text: texts[i] });
      }
    }
    
    // Process in batches
    for (let i = 0; i < toEmbed.length; i += this.batchSize) {
      const batch = toEmbed.slice(i, i + this.batchSize);
      const embeddings = await this.embedBatch(
        batch.map(item => item.text),
        inputType
      );
      
      // Store results and update cache
      embeddings.forEach((embedding, idx) => {
        const item = batch[idx];
        results[item.index] = embedding;
        this.cache.set(item.text, embedding);
      });
    }
    
    return results;
  }

  async embedBatch(texts, inputType) {
    const response = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        texts: texts,
        input_type: inputType,
        embedding_types: ['float'],
        truncate: 'END'
      })
    });
    
    const data = await response.json();
    return data.embeddings;
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class CohereSecurityManager {
  validateAPIKey() {
    const apiKey = process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable not set');
    }
    
    // Basic validation
    if (apiKey.length < 30) {
      throw new Error('API key appears to be invalid');
    }
    
    return apiKey;
  }

  async verifyAPIKey(apiKey) {
    // Test with minimal request
    try {
      const response = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'command-light',
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

### 2. Input Sanitization
```javascript
class CohereInputSanitizer {
  sanitize(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/[<>]/g, '')  // Remove HTML tags
      .replace(/\\/g, '')    // Remove backslashes
      .trim();
    
    // Validate length
    const maxLength = this.getMaxLength();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  getMaxLength() {
    const model = process.env.COHERE_MODEL || 'command-r';
    const limits = {
      'command-r-plus': 128000 * 3,  // ~128K tokens
      'command-r': 128000 * 3,
      'command-light': 4000 * 3      // ~4K tokens
    };
    
    return limits[model] || 128000 * 3;
  }

  sanitizeDocuments(documents) {
    return documents.map(doc => ({
      ...doc,
      text: this.sanitize(doc.text),
      title: doc.title ? this.sanitize(doc.title) : undefined
    }));
  }
}
```

## Monitoring and Analytics

### Usage Tracker
```javascript
class CohereUsageTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byModel: {} },
      errors: { 429: 0, 401: 0, 500: 0, other: 0 },
      latency: [],
      models: {},
      citations: { generated: 0, accuracy: [] }
    };
  }

  trackRequest(model, usage, latency, options = {}) {
    this.metrics.requests++;
    
    // Track tokens
    this.metrics.tokens.input += usage.billed_units?.input_tokens || 0;
    this.metrics.tokens.output += usage.billed_units?.output_tokens || 0;
    
    // Calculate cost
    const optimizer = new CohereModelOptimizer();
    const cost = optimizer.estimateCost(
      model,
      usage.billed_units?.input_tokens || 0,
      usage.billed_units?.output_tokens || 0
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
    modelMetrics.tokens += usage.tokens?.total_tokens || 0;
    modelMetrics.cost += cost.total;
    modelMetrics.avgLatency = 
      (modelMetrics.avgLatency * (modelMetrics.count - 1) + latency) / 
      modelMetrics.count;
    
    // Track latency
    this.metrics.latency.push(latency);
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
    
    // Track citations
    if (options.citations) {
      this.metrics.citations.generated += options.citations.length;
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
      avgCitationsPerRequest: this.metrics.citations.generated / this.metrics.requests
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Citation-Rich Debate Arguments
```javascript
class DebateCitationManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.documentOptimizer = new DocumentOptimizer();
  }

  async generateCitedArgument(position, topic, sources) {
    // Optimize documents for best citation coverage
    const optimizedSources = this.documentOptimizer.optimizeDocuments(sources);
    
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus',
        messages: [
          {
            role: 'system',
            content: `You are debating ${position} on ${topic}. Use extensive citations.`
          },
          {
            role: 'user',
            content: 'Present your argument with detailed citations.'
          }
        ],
        documents: optimizedSources,
        citation_options: {
          mode: 'accurate',
          chunk_size: 512
        },
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    // Enhance citations with source metadata
    const enhancedCitations = this.enhanceCitations(
      data.message.citations,
      optimizedSources
    );
    
    return {
      argument: data.message.content[0].text,
      citations: enhancedCitations,
      sourceCount: optimizedSources.length
    };
  }

  enhanceCitations(citations, sources) {
    return citations.map(citation => {
      const enriched = { ...citation, sources: [] };
      
      for (const source of citation.sources) {
        const doc = sources.find(d => d.id === source.id);
        if (doc) {
          enriched.sources.push({
            title: doc.title,
            url: doc.url,
            snippet: source.text,
            metadata: doc.metadata
          });
        }
      }
      
      return enriched;
    });
  }
}
```

### 2. Multi-Model Consensus
```javascript
class MultiModelConsensus {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.models = ['command-r-plus', 'command-r', 'command-light'];
  }

  async getConsensus(question, documents) {
    const responses = await Promise.all(
      this.models.map(model => 
        this.queryModel(model, question, documents)
      )
    );
    
    // Analyze consensus
    const consensus = this.analyzeConsensus(responses);
    
    return {
      responses,
      consensus,
      agreement: consensus.agreementScore
    };
  }

  async queryModel(model, question, documents) {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: question }],
        documents,
        citation_options: { mode: 'accurate' },
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return {
      model,
      answer: data.message.content[0].text,
      citations: data.message.citations
    };
  }

  analyzeConsensus(responses) {
    // Extract key points from each response
    const keyPoints = responses.map(r => this.extractKeyPoints(r.answer));
    
    // Find common points
    const commonPoints = this.findCommonPoints(keyPoints);
    
    // Calculate agreement score
    const agreementScore = commonPoints.length / 
      Math.max(...keyPoints.map(kp => kp.length));
    
    return {
      commonPoints,
      agreementScore,
      divergentPoints: this.findDivergentPoints(keyPoints)
    };
  }
}
```

## Summary Checklist

✅ Implement rate limiting for trial/production tiers  
✅ Use exponential backoff for 429 errors  
✅ Cache responses with TTL  
✅ Optimize document preparation for RAG  
✅ Select models based on task requirements  
✅ Batch embedding requests (up to 96)  
✅ Stream responses with buffering  
✅ Deduplicate documents before processing  
✅ Track usage and costs by model  
✅ Monitor citation generation accuracy  
✅ Use accurate citation mode for debates  
✅ Implement multi-model consensus  
✅ Chunk large documents with overlap  
✅ Prioritize recent and complete documents