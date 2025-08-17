# Mistral AI API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',  // Bearer token format
  'Content-Type': 'application/json',      // JSON content
  'Accept': 'application/json'             // Accept JSON responses
}
```

### API Key Setup
- Obtain from: https://console.mistral.ai (La Plateforme)
- Navigate to "API keys" section in your workspace
- **Important**: Copy key immediately - shown only once
- **Payment Activation Required**: Must activate payments to enable API keys
- Store securely in environment variables

### API Endpoint
```javascript
const baseURL = 'https://api.mistral.ai/v1';
```

## Available Models & Pricing

### Premier Models (2025)
| Model | Context Window | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|----------------|-----------------|----------|
| Mistral Large 2 | 128K | ~$3 | ~$9 | Complex reasoning, math |
| Mistral Medium 3 | 32K | $2.75 | $8.10 | Balanced performance |
| Mistral Small | 32K | $1.00 | $3.00 | Cost-effective tasks |
| Mistral Nemo | 128K | ~$0.30 | ~$0.30 | General purpose |

### Specialized Models
| Model | Context Window | Input/Output | Best For |
|-------|---------------|--------------|----------|
| Codestral 25.01 | 256K | ~$1 per 1M | Code generation (80+ languages) |
| Codestral (original) | 32K | ~$1 per 1M | Legacy code generation |
| Codestral Mamba | Linear | ~$0.25 per 1M | Infinite sequence coding |

### Open Models (Legacy)
| Model | Context | Input/Output (per 1M) |
|-------|---------|----------------------|
| Mistral 7B | 32K | $0.25 / $0.25 |
| Mixtral 8x7B | 32K | $0.70 / $0.70 |
| Mixtral 8x22B | 64K | $2.00 / $6.00 |

### Fine-tuning Costs
- Mistral Large 2: $9 per 1M tokens + $4/month storage
- Codestral: $3 per 1M tokens + $2/month storage
- Other models: Variable pricing

## Rate Limits

### Usage Tiers
Check current limits at: https://admin.mistral.ai/plateforme/limits

- **Hobbyist Tier**: Free access with limited requests
- **Standard Tier**: Higher limits with payment activation
- **Enterprise**: Custom limits

## Basic Chat Request

```javascript
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistral-large-latest',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistral-medium-latest',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    stream: true  // Enable SSE streaming
  })
});

// Handle SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      if (data === '[DONE]') {
        console.log('Stream complete');
        break;
      }
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      } catch (e) {
        // Skip parsing errors
      }
    }
  }
}
```

## JSON Mode

```javascript
const jsonResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistral-large-latest',
    messages: [
      {
        role: 'user',
        content: 'List 3 programming languages with their uses in JSON format'
      }
    ],
    response_format: { type: 'json_object' },  // Enable JSON mode
    max_tokens: 500
  })
});

const data = await jsonResponse.json();
const structuredOutput = JSON.parse(data.choices[0].message.content);
```

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key |
| 429 | Rate limit exceeded | Implement exponential backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', requestOptions);
      
      if (response.status === 429) {
        // Rate limited - use exponential backoff
        const delay = Math.min(
          Math.pow(2, attempt) * 1000 + Math.random() * 1000,
          60000 // Max 60 seconds
        );
        
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.status >= 500) {
        // Server error - retry with backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Response Format

### Standard Response
```json
{
  "id": "chat-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "mistral-large-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 8,
    "total_tokens": 33
  }
}
```

## Code Generation with Codestral

```javascript
const codeResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'codestral-latest',  // 256K context, 80+ languages
    messages: [
      {
        role: 'user',
        content: 'Write a Python function to calculate fibonacci numbers'
      }
    ],
    temperature: 0.3,  // Lower temperature for code
    max_tokens: 500
  })
});
```

## Best Practices

1. **API Key Security**: Store in environment variables, never commit to code
2. **Model Selection**:
   - Use Mistral Large 2 for complex reasoning
   - Use Mistral Medium 3 for balanced cost/performance
   - Use Mistral Small for simple tasks
   - Use Codestral for code generation (256K context!)
3. **Rate Limit Management**: Implement exponential backoff
4. **Streaming**: Use for real-time responses
5. **JSON Mode**: Available for all models, use for structured output
6. **Error Handling**: Always implement retry logic
7. **Context Windows**: Codestral offers up to 256K tokens

## Quick Integration Example

```javascript
class MistralService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.mistral.ai/v1';
  }

  async sendMessage(message, options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'mistral-medium-latest',
        messages: [{ role: 'user', content: message }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async streamMessage(message, onChunk, model = 'mistral-medium-latest') {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        stream: true
      })
    });

    // Handle SSE streaming
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      // Parse SSE events and call onChunk
      this.parseStreamChunk(chunk, onChunk);
    }
  }

  parseStreamChunk(chunk, onChunk) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (e) {
          // Skip parsing errors
        }
      }
    }
  }

  async makeRequestWithRetry(options, maxRetries = 5) {
    // Implementation from above
  }
}

// Usage
const mistral = new MistralService(process.env.MISTRAL_API_KEY);

// Standard message
const response = await mistral.sendMessage('Hello, Mistral!');

// Code generation
const code = await mistral.sendMessage(
  'Write a sorting algorithm',
  { model: 'codestral-latest', temperature: 0.3 }
);

// JSON mode
const jsonData = await mistral.sendMessage(
  'List top 3 AI companies',
  { jsonMode: true }
);
```

## Important Notes

- **Workspace Scoped**: API keys are scoped to specific workspaces
- **Payment Required**: Must activate payments for API access
- **Free Tier**: Hobbyist tier available for experimentation
- **European Alternative**: Strong multilingual support
- **256K Context**: Codestral offers one of the largest context windows

## Next Steps
- See [advanced-features.md](./advanced-features.md) for function calling, agents
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.mistral.ai