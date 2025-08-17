# Claude API Best Practices

## Rate Limit Management

### Understanding Rate Limits
Claude enforces three types of rate limits:
- **RPM** (Requests Per Minute): Number of API calls
- **ITPM** (Input Tokens Per Minute): Total input tokens processed
- **OTPM** (Output Tokens Per Minute): Total output tokens generated

### Rate Limit Strategy
```javascript
class RateLimiter {
  constructor() {
    this.requestQueue = [];
    this.tokensUsed = { input: 0, output: 0 };
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000;
  }

  async executeWithRateLimit(request) {
    // Check if we need to reset counters
    if (Date.now() > this.resetTime) {
      this.tokensUsed = { input: 0, output: 0 };
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    // Check rate limits before executing
    if (this.requestCount >= 50) { // Example limit
      const waitTime = this.resetTime - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.executeWithRateLimit(request);
    }

    this.requestCount++;
    return await this.executeRequest(request);
  }
}
```

### Token Bucket Algorithm
```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  async consume(tokens) {
    this.refill();
    
    if (this.tokens < tokens) {
      const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.consume(tokens);
    }

    this.tokens -= tokens;
    return true;
  }

  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + (timePassed * this.refillRate));
    this.lastRefill = now;
  }
}
```

## Error Handling Best Practices

### Comprehensive Error Handler
```javascript
class ClaudeErrorHandler {
  async handleError(error, response, attempt = 0) {
    const maxRetries = 3;
    
    if (!response) {
      // Network error
      if (attempt < maxRetries) {
        await this.wait(Math.pow(2, attempt) * 1000);
        return { retry: true };
      }
      throw new Error('Network error after retries');
    }

    switch (response.status) {
      case 400:
        // Bad request - don't retry
        const errorData = await response.json();
        throw new Error(`Invalid request: ${errorData.error.message}`);
        
      case 401:
        // Authentication error - don't retry
        throw new Error('Invalid API key');
        
      case 429:
        // Rate limit - retry with backoff
        const retryAfter = response.headers.get('retry-after');
        if (attempt < maxRetries) {
          const waitTime = retryAfter ? 
            parseInt(retryAfter) * 1000 : 
            Math.min(Math.pow(2, attempt) * 1000, 60000);
          await this.wait(waitTime);
          return { retry: true };
        }
        throw new Error('Rate limit exceeded');
        
      case 529:
        // Overloaded - retry with shorter delay
        if (attempt < maxRetries) {
          await this.wait((attempt + 1) * 2000);
          return { retry: true };
        }
        throw new Error('API overloaded');
        
      case 500:
      case 502:
      case 503:
        // Server errors - retry with backoff
        if (attempt < maxRetries) {
          await this.wait(Math.pow(2, attempt) * 1000);
          return { retry: true };
        }
        throw new Error('Server error after retries');
        
      default:
        throw new Error(`Unexpected status: ${response.status}`);
    }
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Cost Optimization

### 1. Model Selection Strategy
```javascript
class ModelSelector {
  selectOptimalModel(task) {
    const taskComplexity = this.assessComplexity(task);
    
    if (taskComplexity.requiresVision) {
      return 'claude-4-sonnet-20250514'; // Vision capable
    }
    
    if (taskComplexity.simple && taskComplexity.short) {
      return 'claude-3-5-haiku-20250514'; // $0.80/$4 per 1M tokens
    }
    
    if (taskComplexity.complex || taskComplexity.coding) {
      return 'claude-4-opus-20250514'; // $15/$75 per 1M tokens
    }
    
    return 'claude-4-sonnet-20250514'; // $3/$15 per 1M tokens - balanced
  }
}
```

### 2. Prompt Caching for Repeated Context
```javascript
// Cache system prompts and common context
const cachedSystemPrompt = {
  type: 'text',
  text: 'You are participating in a debate. Follow these rules...',
  cache_control: { type: 'ephemeral' }
};

// Reuse across multiple requests to save on input tokens
```

### 3. Batch Processing for Non-Urgent Tasks
```javascript
// 50% discount for batch processing
async function batchProcess(requests) {
  const batch = {
    requests: requests.map((req, i) => ({
      custom_id: `req_${i}`,
      params: req
    }))
  };
  
  // Submit batch - processes within 24 hours at 50% cost
  return await submitBatch(batch);
}
```

### 4. Token Counting Before Requests
```javascript
// Estimate tokens before sending (rough approximation)
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function validateRequest(messages, maxTokens) {
  const inputTokens = messages.reduce((sum, msg) => {
    return sum + estimateTokens(msg.content);
  }, 0);
  
  const totalCost = (inputTokens / 1000000) * 3 + // Input cost
                   (maxTokens / 1000000) * 15;     // Output cost
  
  return { inputTokens, estimatedCost: totalCost };
}
```

## Performance Optimization

### 1. Connection Pooling
```javascript
// Reuse connections for better performance
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 10
});

fetch('https://api.anthropic.com/v1/messages', {
  agent,
  // ... other options
});
```

### 2. Request Queuing with Priority
```javascript
class PriorityQueue {
  constructor() {
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
  }

  add(request, priority = 'normal') {
    this.queues[priority].push(request);
  }

  async process() {
    // Process high priority first
    for (const priority of ['high', 'normal', 'low']) {
      while (this.queues[priority].length > 0) {
        const request = this.queues[priority].shift();
        await this.executeRequest(request);
      }
    }
  }
}
```

### 3. Streaming for Better UX
```javascript
// Stream responses for real-time feedback
async function streamResponse(messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({
      model: 'claude-4-sonnet-20250514',
      stream: true,
      messages
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Process complete SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        // Process streaming data immediately
        if (data.delta?.text) {
          process.stdout.write(data.delta.text);
        }
      }
    }
  }
}
```

## Security Best Practices

### 1. API Key Management
```javascript
// Never hardcode API keys
const apiKey = process.env.CLAUDE_API_KEY;

// Validate API key format
function validateApiKey(key) {
  if (!key || !key.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format');
  }
  return key;
}
```

### 2. Input Sanitization
```javascript
function sanitizeInput(userInput) {
  // Remove potential prompt injection attempts
  const cleaned = userInput
    .replace(/\[INST\]/g, '')
    .replace(/\[\/INST\]/g, '')
    .replace(/System:/gi, '')
    .trim();
  
  // Validate length
  if (cleaned.length > 100000) {
    throw new Error('Input too long');
  }
  
  return cleaned;
}
```

### 3. Response Validation
```javascript
function validateResponse(response) {
  // Ensure response structure is valid
  if (!response.content || !Array.isArray(response.content)) {
    throw new Error('Invalid response structure');
  }
  
  // Check for sensitive information
  const text = response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('');
  
  if (containsSensitiveInfo(text)) {
    console.warn('Response contains sensitive information');
  }
  
  return response;
}
```

## Monitoring and Logging

### Request Tracking
```javascript
class RequestMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      errors: {},
      avgLatency: 0,
      tokenUsage: { input: 0, output: 0 },
      costs: 0
    };
  }

  trackRequest(request, response, duration) {
    this.metrics.totalRequests++;
    this.metrics.avgLatency = 
      (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + duration) / 
      this.metrics.totalRequests;

    if (response.usage) {
      this.metrics.tokenUsage.input += response.usage.input_tokens;
      this.metrics.tokenUsage.output += response.usage.output_tokens;
      
      // Calculate costs (example for Sonnet)
      this.metrics.costs += 
        (response.usage.input_tokens / 1000000) * 3 +
        (response.usage.output_tokens / 1000000) * 15;
    }
  }

  trackError(errorCode) {
    this.metrics.errors[errorCode] = (this.metrics.errors[errorCode] || 0) + 1;
  }

  getReport() {
    return {
      ...this.metrics,
      avgCostPerRequest: this.metrics.costs / this.metrics.totalRequests
    };
  }
}
```

## Debate-Specific Optimizations

### 1. Conversation Context Management
```javascript
class DebateContextManager {
  constructor(maxContextTokens = 50000) {
    this.maxTokens = maxContextTokens;
  }

  trimContext(messages) {
    // Keep most recent messages within token limit
    let totalTokens = 0;
    const trimmed = [];
    
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);
      if (totalTokens + tokens > this.maxTokens) break;
      totalTokens += tokens;
      trimmed.unshift(messages[i]);
    }
    
    return trimmed;
  }

  summarizeOldContext(messages) {
    // Summarize older messages to preserve context
    const old = messages.slice(0, -10);
    if (old.length === 0) return messages;
    
    return [
      {
        role: 'system',
        content: `Previous discussion summary: ${this.generateSummary(old)}`
      },
      ...messages.slice(-10)
    ];
  }
}
```

### 2. Parallel Debater Responses
```javascript
async function getDebaterResponses(topic, debaters) {
  // Send requests in parallel for all debaters
  const promises = debaters.map(debater => 
    sendClaudeMessage({
      model: debater.model,
      messages: [
        { role: 'system', content: debater.personality },
        { role: 'user', content: topic }
      ]
    })
  );
  
  // Wait for all responses
  return await Promise.all(promises);
}
```

### 3. Streaming Debate Responses
```javascript
class DebateStreamer {
  async streamDebate(debaters, topic) {
    for (const debater of debaters) {
      console.log(`\n${debater.name}:`);
      
      await this.streamResponse({
        model: debater.model,
        messages: [
          { role: 'system', content: debater.personality },
          { role: 'user', content: topic }
        ]
      });
    }
  }
}
```

## Testing Strategies

### Mock Responses for Development
```javascript
class MockClaudeAPI {
  async sendMessage(request) {
    // Return mock response for testing
    await this.simulateLatency();
    
    return {
      id: 'mock_' + Date.now(),
      content: [{
        type: 'text',
        text: 'Mock response for: ' + request.messages[0].content
      }],
      usage: {
        input_tokens: 100,
        output_tokens: 50
      }
    };
  }

  simulateLatency() {
    return new Promise(resolve => 
      setTimeout(resolve, Math.random() * 1000)
    );
  }
}
```

## Summary Checklist

✅ Implement exponential backoff for 429/529 errors  
✅ Use appropriate models for task complexity  
✅ Enable streaming for real-time responses  
✅ Cache common prompts to reduce costs  
✅ Monitor token usage and costs  
✅ Sanitize user inputs  
✅ Validate API responses  
✅ Use connection pooling  
✅ Implement request queuing  
✅ Track metrics and errors  
✅ Test with mock responses  
✅ Manage conversation context efficiently