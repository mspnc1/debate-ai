# OpenAI GPT-5 API Best Practices

## Rate Limit Management

### Understanding Rate Limits
OpenAI enforces rate limits based on:
- **RPM** (Requests Per Minute): API call frequency
- **TPM** (Tokens Per Minute): Total tokens processed
- **TPD** (Tokens Per Day): Daily token quotas

### Exponential Backoff with Jitter
```javascript
class RateLimitHandler {
  async executeWithBackoff(fn, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status !== 429) throw error;
        
        // Calculate delay with exponential backoff + jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, 60000); // Max 60s
        
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

### Token Bucket Implementation
```javascript
class TokenBucket {
  constructor(tokensPerMinute) {
    this.capacity = tokensPerMinute;
    this.tokens = tokensPerMinute;
    this.refillRate = tokensPerMinute / 60; // Per second
    this.lastRefill = Date.now();
  }

  async waitForTokens(required) {
    this.refill();
    
    while (this.tokens < required) {
      const waitTime = ((required - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
    
    this.tokens -= required;
    return true;
  }

  refill() {
    const now = Date.now();
    const secondsPassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (secondsPassed * this.refillRate)
    );
    this.lastRefill = now;
  }
}

// Usage
const tokenBucket = new TokenBucket(90000); // 90K TPM
await tokenBucket.waitForTokens(estimatedTokens);
```

### Request Queue with Priority
```javascript
class PriorityRequestQueue {
  constructor() {
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
    this.processing = false;
  }

  async add(request, priority = 'normal') {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({ request, resolve, reject });
      if (!this.processing) this.process();
    });
  }

  async process() {
    this.processing = true;
    
    while (this.hasRequests()) {
      const { request, resolve, reject } = this.getNextRequest();
      
      try {
        const result = await this.executeRequest(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }

  getNextRequest() {
    for (const priority of ['high', 'normal', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
  }

  hasRequests() {
    return Object.values(this.queues).some(q => q.length > 0);
  }

  async executeRequest(request) {
    // Execute with rate limit handling
    return await fetch('https://api.openai.com/v1/chat/completions', request);
  }
}
```

## Error Handling Best Practices

### Comprehensive Error Handler
```javascript
class OpenAIErrorHandler {
  async handleAPICall(fn) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fn();
        
        if (!response.ok) {
          await this.handleHTTPError(response, attempt, maxRetries);
          continue;
        }
        
        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (this.isNetworkError(error)) {
          console.log(`Network error, attempt ${attempt + 1}/${maxRetries}`);
          await this.wait(Math.pow(2, attempt) * 1000);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  async handleHTTPError(response, attempt, maxRetries) {
    const errorBody = await response.text();
    let errorData;
    
    try {
      errorData = JSON.parse(errorBody);
    } catch {
      errorData = { message: errorBody };
    }

    switch (response.status) {
      case 400:
        throw new Error(`Bad Request: ${errorData.error?.message || errorBody}`);
        
      case 401:
        throw new Error('Authentication failed. Check your API key.');
        
      case 429:
        if (attempt < maxRetries - 1) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? 
            parseInt(retryAfter) * 1000 : 
            Math.pow(2, attempt) * 1000;
          
          console.log(`Rate limited. Waiting ${delay}ms...`);
          await this.wait(delay);
        } else {
          throw new Error('Rate limit exceeded after retries');
        }
        break;
        
      case 500:
      case 502:
      case 503:
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Server error. Retrying in ${delay}ms...`);
          await this.wait(delay);
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
        break;
        
      default:
        throw new Error(`Unexpected status ${response.status}: ${errorBody}`);
    }
  }

  isNetworkError(error) {
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND';
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Cost Optimization

### 1. Model Selection by Task
```javascript
class ModelOptimizer {
  selectOptimalModel(task) {
    const costPerMillion = {
      'gpt-5': { input: 1.25, output: 10 },
      'gpt-5-mini': { input: 0.25, output: 2 },
      'gpt-5-nano': { input: 0.05, output: 0.40 }
    };
    
    // Analyze task requirements
    if (task.requiresDeepReasoning || task.complexity > 8) {
      return 'gpt-5';
    }
    
    if (task.volume > 1000 && task.complexity < 3) {
      return 'gpt-5-nano'; // High volume, simple tasks
    }
    
    if (task.realTime && task.complexity < 6) {
      return 'gpt-5-nano'; // Fast responses needed
    }
    
    return 'gpt-5-mini'; // Balanced default
  }
  
  estimateCost(model, inputTokens, outputTokens) {
    const costs = {
      'gpt-5': { input: 1.25, output: 10 },
      'gpt-5-mini': { input: 0.25, output: 2 },
      'gpt-5-nano': { input: 0.05, output: 0.40 }
    };
    
    const cost = costs[model];
    return (inputTokens / 1000000) * cost.input + 
           (outputTokens / 1000000) * cost.output;
  }
}
```

### 2. Prompt Caching Strategy
```javascript
class PromptCache {
  constructor() {
    this.systemPrompts = new Map();
  }

  getCachedSystemPrompt(key, generator) {
    if (!this.systemPrompts.has(key)) {
      this.systemPrompts.set(key, generator());
    }
    return this.systemPrompts.get(key);
  }

  async makeRequestWithCache(messages, systemPromptKey) {
    const systemPrompt = this.getCachedSystemPrompt(
      systemPromptKey,
      () => this.generateSystemPrompt(systemPromptKey)
    );

    return {
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
      // 90% discount on cached system prompt tokens
    };
  }

  generateSystemPrompt(key) {
    const prompts = {
      'debate_moderator': 'You are an impartial debate moderator...',
      'fact_checker': 'You are a fact-checking assistant...',
      'summarizer': 'You are a concise summarizer...'
    };
    return prompts[key];
  }
}
```

### 3. Token Usage Optimization
```javascript
class TokenOptimizer {
  // Rough estimation: ~4 characters per token
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  truncateToTokenLimit(text, maxTokens) {
    const estimated = this.estimateTokens(text);
    if (estimated <= maxTokens) return text;
    
    // Truncate to approximately fit token limit
    const ratio = maxTokens / estimated;
    const targetLength = Math.floor(text.length * ratio * 0.95); // 5% buffer
    return text.substring(0, targetLength) + '...';
  }

  optimizeMessages(messages, maxContextTokens = 100000) {
    let totalTokens = 0;
    const optimized = [];
    
    // Process messages from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);
      
      if (totalTokens + tokens > maxContextTokens) {
        // Summarize older messages
        if (i > 0) {
          optimized.unshift({
            role: 'system',
            content: `[${i} older messages summarized]`
          });
        }
        break;
      }
      
      totalTokens += tokens;
      optimized.unshift(messages[i]);
    }
    
    return optimized;
  }
}
```

### 4. Batch Processing for Cost Savings
```javascript
class BatchProcessor {
  async processBatch(requests) {
    // 50% discount for batch processing
    const batchFile = this.createBatchFile(requests);
    const fileId = await this.uploadBatchFile(batchFile);
    const batchId = await this.createBatch(fileId);
    
    return await this.pollBatchCompletion(batchId);
  }

  createBatchFile(requests) {
    return requests.map((req, index) => ({
      custom_id: `req-${index}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: req
    })).map(r => JSON.stringify(r)).join('\n');
  }

  async pollBatchCompletion(batchId, maxWaitTime = 86400000) { // 24 hours
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkBatchStatus(batchId);
      
      if (status.status === 'completed') {
        return await this.downloadResults(status.output_file_id);
      }
      
      if (status.status === 'failed') {
        throw new Error(`Batch failed: ${status.errors}`);
      }
      
      // Check every 5 minutes
      await new Promise(resolve => setTimeout(resolve, 300000));
    }
    
    throw new Error('Batch processing timeout');
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

// Use agent for all requests
fetch('https://api.openai.com/v1/chat/completions', {
  agent: httpsAgent,
  // ... other options
});
```

### 2. Streaming for Better UX
```javascript
class StreamingHandler {
  async streamResponse(messages, onToken, onComplete) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete(fullResponse);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onToken(content);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }
  }
}
```

### 3. Parallel Processing
```javascript
class ParallelProcessor {
  async processMultipleDebaters(debaters, topic) {
    // Send requests in parallel for all debaters
    const promises = debaters.map(debater => 
      this.getDebaterResponse(debater, topic)
    );
    
    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      debater: debaters[index],
      response: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  async getDebaterResponse(debater, topic) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: debater.model || 'gpt-5-mini',
        messages: [
          { role: 'system', content: debater.personality },
          { role: 'user', content: topic }
        ],
        max_tokens: 500,
        temperature: debater.temperature || 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
class SecureAPIManager {
  constructor() {
    this.validateAPIKey();
  }

  validateAPIKey() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }
    
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid API key format');
    }
    
    if (apiKey.length < 40) {
      throw new Error('API key appears to be incomplete');
    }
    
    return apiKey;
  }

  rotateAPIKey(newKey) {
    // Update environment variable securely
    process.env.OPENAI_API_KEY = newKey;
    
    // Log rotation (without exposing keys)
    console.log('API key rotated successfully');
  }
}
```

### 2. Input Sanitization
```javascript
class InputSanitizer {
  sanitizeUserInput(input) {
    // Remove potential injection attempts
    let sanitized = input
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/<\|.*?\|>/g, '')
      .replace(/System:/gi, 'System-')
      .trim();
    
    // Limit length
    const maxLength = 50000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    // Validate content
    if (this.containsMaliciousPatterns(sanitized)) {
      throw new Error('Input contains potentially malicious content');
    }
    
    return sanitized;
  }

  containsMaliciousPatterns(text) {
    const patterns = [
      /ignore previous instructions/i,
      /disregard all prior/i,
      /\bsystem prompt\b/i,
      /reveal your instructions/i
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
}
```

## Monitoring and Analytics

### Usage Tracking
```javascript
class UsageMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      tokens: { input: 0, output: 0 },
      costs: { total: 0, byModel: {} },
      errors: {},
      latency: []
    };
  }

  trackRequest(model, usage, latency) {
    this.metrics.requests++;
    this.metrics.tokens.input += usage.prompt_tokens;
    this.metrics.tokens.output += usage.completion_tokens;
    
    const cost = this.calculateCost(model, usage);
    this.metrics.costs.total += cost;
    this.metrics.costs.byModel[model] = 
      (this.metrics.costs.byModel[model] || 0) + cost;
    
    this.metrics.latency.push(latency);
    
    // Keep only last 1000 latency measurements
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  trackError(errorCode) {
    this.metrics.errors[errorCode] = 
      (this.metrics.errors[errorCode] || 0) + 1;
  }

  calculateCost(model, usage) {
    const rates = {
      'gpt-5': { input: 1.25, output: 10 },
      'gpt-5-mini': { input: 0.25, output: 2 },
      'gpt-5-nano': { input: 0.05, output: 0.40 }
    };
    
    const rate = rates[model] || rates['gpt-5-mini'];
    return (usage.prompt_tokens / 1000000) * rate.input +
           (usage.completion_tokens / 1000000) * rate.output;
  }

  getReport() {
    const avgLatency = this.metrics.latency.length > 0 ?
      this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length :
      0;
    
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

### 1. Debate Context Management
```javascript
class DebateContextManager {
  constructor(maxTokens = 100000) {
    this.maxTokens = maxTokens;
    this.contextCache = new Map();
  }

  prepareDebateContext(debate) {
    const cacheKey = `${debate.topic}_${debate.round}`;
    
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey);
    }
    
    const context = {
      system: this.getDebateSystemPrompt(debate),
      history: this.optimizeDebateHistory(debate.messages),
      metadata: {
        round: debate.round,
        participants: debate.participants,
        scores: debate.scores
      }
    };
    
    this.contextCache.set(cacheKey, context);
    return context;
  }

  getDebateSystemPrompt(debate) {
    return `You are participating in a formal debate on "${debate.topic}".
    Rules: ${debate.rules}
    Your role: ${debate.currentSpeaker.role}
    Speaking time: ${debate.timeLimit} seconds
    Current round: ${debate.round}/${debate.totalRounds}`;
  }

  optimizeDebateHistory(messages) {
    // Keep only relevant recent exchanges
    const recentExchanges = messages.slice(-10);
    
    // Summarize older messages if needed
    if (messages.length > 10) {
      const summary = this.summarizeOldMessages(messages.slice(0, -10));
      return [
        { role: 'system', content: `Previous discussion summary: ${summary}` },
        ...recentExchanges
      ];
    }
    
    return recentExchanges;
  }
}
```

### 2. Multi-Model Debate Orchestration
```javascript
class DebateOrchestrator {
  async conductDebateRound(topic, participants) {
    // Use different models for different roles
    const modelAssignments = {
      moderator: 'gpt-5',      // Best reasoning for moderation
      debater1: 'gpt-5-mini',  // Balanced for arguments
      debater2: 'gpt-5-mini',  // Balanced for arguments
      factChecker: 'gpt-5',    // High accuracy needed
      summarizer: 'gpt-5-nano' // Simple task
    };
    
    // Execute in optimal order
    const moderatorIntro = await this.getModeratorIntro(topic);
    const debaterResponses = await this.getDebaterResponses(topic, participants);
    const factCheck = await this.factCheckClaims(debaterResponses);
    const summary = await this.summarizeRound(debaterResponses);
    
    return {
      moderatorIntro,
      debaterResponses,
      factCheck,
      summary
    };
  }
}
```

## Summary Checklist

✅ Implement exponential backoff with jitter for 429 errors  
✅ Use token bucket for rate limiting  
✅ Select appropriate models based on task complexity  
✅ Enable prompt caching for 90% discount  
✅ Use batch API for 50% discount on non-urgent tasks  
✅ Implement streaming for real-time responses  
✅ Use connection pooling for performance  
✅ Sanitize user inputs against prompt injection  
✅ Track usage metrics and costs  
✅ Optimize context window usage  
✅ Process parallel requests when possible  
✅ Implement comprehensive error handling  
✅ Secure API key management  
✅ Monitor and analyze API usage patterns