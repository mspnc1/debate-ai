# Google Gemini API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'x-goog-api-key': 'YOUR_API_KEY',     // Required: API key header
  'Content-Type': 'application/json'     // Required: JSON content
}
```

### API Key Setup
- Obtain from: https://ai.google.dev (click "Get API key" in sidebar)
- Alternative: Google Cloud Console for Vertex AI
- **Environment Variables**: 
  - `GEMINI_API_KEY` or `GOOGLE_API_KEY` (GOOGLE_API_KEY takes precedence)
- Free tier available with limits

### API Endpoint
```javascript
const baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Example: ${baseURL}/gemini-2.5-flash:generateContent
```

## Available Models & Pricing

### Gemini 2.5 Series (2025)
| Model | Context Window | Max Output | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|------------|----------------|-----------------|----------|
| Gemini 2.5 Pro | 1M tokens | 65K | $1.25 (<200K), $2.50 (>200K) | $10 (<200K), $15 (>200K) | Complex reasoning |
| Gemini 2.5 Flash | 1M tokens | 65K | $0.15 | $0.60 | Balanced performance |
| Gemini 2.5 Flash-Lite | 1M tokens | 65K | $0.10 | $0.40 | High-volume, low-cost |

### Special Pricing
- **Thinking Mode**: $3.50 per 1M tokens (Flash), varies for Pro
- **Audio Input**: $1.00 per 1M tokens
- **Knowledge Cutoff**: Latest models updated regularly

## Rate Limits

### Free Tier
- **5 RPM** (Requests Per Minute)
- **25 RPD** (Requests Per Day)  
- **1M token** context window
- Access via Google AI Studio

### Paid Tiers
| Tier | Requirements | Limits |
|------|-------------|--------|
| Tier 1 | Paid account | Higher RPM/TPM |
| Tier 2 | $250+ spent, 30+ days | Enterprise quotas |
| Tier 3 | Contact sales | Custom limits |

## Basic Chat Request

```javascript
const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: 'What is the capital of France?'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  }
);

const data = await response.json();
console.log(data.candidates[0].content.parts[0].text);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse',
  {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: 'Tell me a story' }
          ]
        }
      ]
    })
  }
);

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
      const data = JSON.parse(line.slice(6));
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        process.stdout.write(text);
      }
    }
  }
}
```

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Check request format |
| 401 | Invalid API key | Verify API key |
| 429 | Rate limit exceeded | Implement exponential backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(requestOptions.url, requestOptions);
      
      if (response.status === 429) {
        // Rate limited - exponential backoff with jitter
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
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "The capital of France is Paris."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "probability": "NEGLIGIBLE"
        }
      ]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 8,
    "candidatesTokenCount": 7,
    "totalTokenCount": 15
  }
}
```

## Multi-Turn Conversations

```javascript
const conversation = {
  contents: [
    {
      role: 'user',
      parts: [{ text: 'Hello!' }]
    },
    {
      role: 'model',
      parts: [{ text: 'Hello! How can I help you today?' }]
    },
    {
      role: 'user',
      parts: [{ text: 'Tell me about Paris' }]
    }
  ]
};

const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(conversation)
  }
);
```

## System Instructions

```javascript
const request = {
  systemInstruction: {
    parts: [
      {
        text: 'You are a helpful AI assistant specializing in debates.'
      }
    ]
  },
  contents: [
    {
      parts: [
        { text: 'What makes a good debate argument?' }
      ]
    }
  ]
};
```

## Best Practices

1. **API Key Security**: Store in environment variables, use API key restrictions
2. **Rate Limit Management**: Implement exponential backoff, monitor quotas
3. **Model Selection**:
   - Use Flash-Lite for high-volume, simple tasks ($0.10/$0.40)
   - Use Flash for balanced performance ($0.15/$0.60)
   - Use Pro for complex reasoning ($1.25+/$10+)
4. **Context Management**: Utilize 1M token context window efficiently
5. **Error Handling**: Always implement retry logic for 429/5xx errors
6. **Streaming**: Use SSE streaming for real-time responses

## Quick Integration Example

```javascript
class GeminiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async sendMessage(message, model = 'gemini-2.5-flash') {
    const url = `${this.baseURL}/${model}:generateContent`;
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    };

    const response = await this.makeRequestWithRetry({ url, ...requestOptions });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async streamMessage(message, onChunk, model = 'gemini-2.5-flash') {
    const url = `${this.baseURL}/${model}:streamGenerateContent?alt=sse`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: message }]
          }
        ]
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
      // ... (implementation details)
    }
  }

  async makeRequestWithRetry(options, maxRetries = 5) {
    // Implementation from above
  }
}

// Usage
const gemini = new GeminiService(process.env.GEMINI_API_KEY);
const response = await gemini.sendMessage('Hello, Gemini!');
```

## Important Notes

- **April 29, 2025 Update**: Gemini 1.5 Pro/Flash not available for new projects
- **Free Tier Limitation**: 5 RPM means one request every 12 seconds
- **Token Counting**: Differs slightly from other models, especially for non-English
- **Enterprise**: Use Vertex AI for production workloads

## Next Steps
- See [advanced-features.md](./advanced-features.md) for multimodal, function calling, Live API
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://ai.google.dev/gemini-api/docs