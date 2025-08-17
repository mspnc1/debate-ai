# OpenAI GPT-5 API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',  // Required: Bearer token format
  'Content-Type': 'application/json'       // Required: JSON content
}
```

### API Key Format
- Format: `sk-...` (standard OpenAI format)
- Obtain from: https://platform.openai.com/api-keys
- **Important**: Keys are shown only once - save immediately to password manager

## Available Models & Pricing

### GPT-5 Series (2025)
| Model | Context Window | Max Output | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|------------|----------------|-----------------|----------|
| GPT-5 | 272K input / 400K total | 128K | $1.25 | $10.00 | Complex reasoning, coding |
| GPT-5-mini | 272K input / 400K total | 128K | $0.25 | $2.00 | Balanced performance |
| GPT-5-nano | 272K input / 400K total | 128K | $0.05 | $0.40 | High-volume, simple tasks |

### Key Features
- **Knowledge Cutoff**: September 30, 2024 (GPT-5), May 30, 2024 (mini/nano)
- **Cache Discount**: 90% discount on cached input tokens
- **Total Context**: 400,000 tokens (272K input + 128K output)

## Basic Chat Completion Request

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
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
    max_tokens: 1000,
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ],
    stream: true  // Enable streaming
  })
});

// Handle SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim() !== '');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      
      const parsed = JSON.parse(data);
      const content = parsed.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
  }
}
```

## GPT-5 Specific Parameters

### Reasoning Effort
```javascript
{
  model: 'gpt-5',
  reasoning_effort: 'medium',  // Options: minimal, low, medium, high
  messages: [...]
}
```

### Verbosity Control
```javascript
{
  model: 'gpt-5',
  verbosity: 'low',  // Options: low, medium, high
  messages: [...]
}
```

## Rate Limits & Error Handling

### Rate Limit Types
- **RPM**: Requests per minute (varies by tier)
- **TPM**: Tokens per minute (input + output)
- **TPD**: Tokens per day (daily quotas)

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check your API key |
| 429 | Rate limit exceeded | Implement exponential backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);
      
      if (response.status === 429) {
        // Rate limited - use exponential backoff with jitter
        const delay = Math.min(
          Math.pow(2, attempt) * 1000 + Math.random() * 1000,
          60000 // Max 60 seconds
        );
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
  "id": "chatcmpl-9ABC123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-5",
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

## Best Practices

1. **Environment Variables**: Never hardcode API keys
2. **Error Handling**: Always implement exponential backoff for 429 errors
3. **Token Management**: Monitor usage to stay within limits
4. **Model Selection**:
   - Use nano for simple, high-volume tasks
   - Use mini for balanced performance
   - Use full GPT-5 for complex reasoning and coding
5. **Streaming**: Essential for real-time debate responses
6. **Caching**: Utilize 90% cache discount for repeated prompts

## Quick Integration Example

```javascript
class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
  }

  async sendMessage(message, model = 'gpt-5-mini') {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 1000,
        temperature: 0.7
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async streamMessage(message, onChunk, model = 'gpt-5-mini') {
    const requestOptions = {
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
    };

    const response = await fetch(this.baseURL, requestOptions);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) onChunk(content);
          } catch (e) {
            // Skip parsing errors
          }
        }
      }
    }
  }

  async makeRequestWithRetry(options, maxRetries = 3) {
    // Implementation from above
  }
}

// Usage
const openai = new OpenAIService(process.env.OPENAI_API_KEY);
const response = await openai.sendMessage('Hello, GPT-5!');
```

## Next Steps
- See [advanced-features.md](./advanced-features.md) for vision, function calling, assistants
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://platform.openai.com/docs