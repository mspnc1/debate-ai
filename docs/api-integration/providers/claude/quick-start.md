# Claude API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'x-api-key': 'YOUR_API_KEY',           // Required: Your Claude API key
  'anthropic-version': '2024-10-01',     // Required: API version
  'content-type': 'application/json'     // Required: JSON content
}
```

### API Key Format
- Format: `sk-ant-api03-xxxxx...`
- Obtain from: https://console.anthropic.com/account/keys
- Store securely in environment variables

## Available Models & Pricing

### Claude 4 Series (Latest - 2025)
| Model | Context Window | Max Output | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|------------|----------------|-----------------|----------|
| Claude 4 Opus | 200K | 8192 | $15.00 | $75.00 | Complex reasoning, coding |
| Claude 4 Sonnet | 200K (1M beta) | 8192 | $3.00 | $15.00 | Balanced performance |

### Claude 3.5 Series (Still Available)
| Model | Context Window | Max Output | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|------------|----------------|-----------------|----------|
| Claude 3.5 Sonnet | 200K | 8192 | $3.00 | $15.00 | General tasks |
| Claude 3.5 Haiku | 200K | 4096 | $0.80 | $4.00 | Fast, simple tasks |

## Basic Message Request

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2024-10-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-4-sonnet-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    system: 'You are a helpful AI assistant.' // Optional system prompt
  })
});
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2024-10-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-4-sonnet-20250514',
    max_tokens: 1024,
    stream: true,  // Enable streaming
    messages: [
      { role: 'user', content: 'Tell me a story' }
    ]
  })
});

// Handle SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Parse SSE events: content_block_start, content_block_delta, content_block_stop
  console.log(chunk);
}
```

## Rate Limits & Error Handling

### Rate Limit Types
- **RPM**: Requests per minute
- **ITPM**: Input tokens per minute  
- **OTPM**: Output tokens per minute

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check your API key |
| 429 | Rate limit exceeded | Implement exponential backoff |
| 529 | API overloaded | Retry after short delay |
| 500 | Server error | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', requestOptions);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || 
                          Math.pow(2, attempt) + Math.random();
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (response.status === 529) {
        // API overloaded, shorter retry
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

## Response Format

### Standard Response
```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "The capital of France is Paris."
    }
  ],
  "model": "claude-4-sonnet-20250514",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 15,
    "output_tokens": 8
  }
}
```

## Best Practices

1. **Environment Variables**: Never hardcode API keys
2. **Error Handling**: Always implement retry logic for 429/529 errors
3. **Token Management**: Monitor usage to stay within limits
4. **Streaming**: Use for real-time responses in debates
5. **Model Selection**: 
   - Use Haiku for simple, fast responses
   - Use Sonnet for balanced performance
   - Use Opus for complex reasoning and coding

## Quick Integration Example

```javascript
class ClaudeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.anthropic.com/v1/messages';
  }

  async sendMessage(message, model = 'claude-4-sonnet-20250514') {
    const requestOptions = {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2024-10-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }]
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    return await response.json();
  }

  async makeRequestWithRetry(options, maxRetries = 3) {
    // Implementation from above
  }
}
```

## Next Steps
- See [advanced-features.md](./advanced-features.md) for vision, function calling
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.anthropic.com