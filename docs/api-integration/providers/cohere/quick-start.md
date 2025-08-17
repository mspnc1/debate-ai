# Cohere API Quick Start Guide

## Authentication

### Required Headers
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',  // Bearer token format (space after Bearer)
  'Content-Type': 'application/json',      // JSON content
  'Accept': 'application/json',            // Accept JSON responses
  'X-Client-Name': 'symposium-ai'          // Optional: client identification
}
```

### API Key Setup
- Obtain from: https://dashboard.cohere.com
- Navigate to "API Keys" section in dashboard
- **Important**: Store key securely - shown only once
- Available tiers: Trial (rate-limited) and Production
- Store in environment variables

### API Endpoint
```javascript
const baseURL = 'https://api.cohere.com/v2';  // Latest v2 API
// Legacy v1 still available at: https://api.cohere.ai
```

## Available Models & Pricing

### Command Models (2025)
| Model | Context Window | Input (per 1M) | Output (per 1M) | Best For |
|-------|---------------|----------------|-----------------|----------|
| Command A 03-2025 | 128K | ~$3.00 | ~$15.00 | Most performant, 150% throughput |
| Command R+ | 128K | $3.00 | $15.00 | Complex RAG workflows |
| Command R | 128K | $0.50 | $1.50 | Balanced performance |
| Command Light | 4K | $0.15 | $0.60 | Fast, cost-effective |

### Specialized Models
| Model | Purpose | Context | Price |
|-------|---------|---------|-------|
| Command A Vision | Visual + text understanding | 128K | ~$4/$20 per 1M |
| Embed v3.0 | Text embeddings | 512 tokens | $0.10 per 1M tokens |
| Embed v3.0 Multimodal | Text + image embeddings | 512 tokens | ~$0.15 per 1M |
| Rerank 3.5 | Document reranking | 4K | $2.00 per 1M queries |
| Aya Expanse | 23 languages | 8K | ~$0.80/$2.50 per 1M |

## Rate Limits

### Trial Tier
- 5,000 generation units per month
- 100 calls per minute for Embed/Classify
- Free API calls for testing

### Production Tier
- Higher rate limits (contact sales)
- Priority processing
- SLA guarantees

## Basic Chat Request

```javascript
const response = await fetch('https://api.cohere.com/v2/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'command-r-plus',
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
console.log(data.message.content[0].text);
```

## Streaming Responses (SSE)

```javascript
const response = await fetch('https://api.cohere.com/v2/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'command-r',
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
        if (parsed.type === 'content-delta') {
          process.stdout.write(parsed.delta.message.content.text);
        }
      } catch (e) {
        // Skip parsing errors
      }
    }
  }
}
```

## RAG with Documents

```javascript
const ragRequest = {
  model: 'command-r-plus',
  messages: [
    {
      role: 'user',
      content: 'What does the documentation say about pricing?'
    }
  ],
  documents: [
    {
      id: 'doc1',
      text: 'Our pricing starts at $99/month for the basic plan.',
      title: 'Pricing Guide'
    },
    {
      id: 'doc2',
      text: 'Enterprise plans start at $999/month with custom features.',
      title: 'Enterprise Pricing'
    }
  ],
  citation_options: {
    mode: 'accurate'  // Generate precise citations
  }
};

const response = await fetch('https://api.cohere.com/v2/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(ragRequest)
});

// Response includes citations
const data = await response.json();
console.log('Answer:', data.message.content[0].text);
console.log('Citations:', data.message.citations);
```

## Tool Use (Function Calling)

```javascript
const toolRequest = {
  model: 'command-r-plus',
  messages: [
    {
      role: 'user',
      content: 'What\'s the weather in Paris?'
    }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit']
            }
          },
          required: ['location']
        }
      }
    }
  ]
};

const response = await fetch('https://api.cohere.com/v2/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(toolRequest)
});
```

## Error Handling

### Common Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 401 | Invalid API key | Check API key |
| 429 | Rate limit exceeded | Implement backoff |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Exponential Backoff Implementation
```javascript
async function makeRequestWithRetry(requestOptions, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.cohere.com/v2/chat', requestOptions);
      
      if (response.status === 429) {
        // Rate limited - exponential backoff
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

### Standard Response (v2 API)
```json
{
  "id": "msg_abc123",
  "message": {
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "The capital of France is Paris."
      }
    ],
    "citations": [
      {
        "start": 25,
        "end": 30,
        "text": "Paris",
        "sources": [
          {
            "type": "document",
            "id": "doc1",
            "document": {
              "id": "doc1",
              "text": "Paris is the capital city of France..."
            }
          }
        ]
      }
    ]
  },
  "usage": {
    "billed_units": {
      "input_tokens": 25,
      "output_tokens": 8
    },
    "tokens": {
      "input_tokens": 25,
      "output_tokens": 8,
      "total_tokens": 33
    }
  },
  "finish_reason": "complete"
}
```

## Embeddings

```javascript
const embeddingResponse = await fetch('https://api.cohere.com/v2/embed', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'embed-english-v3.0',
    texts: [
      'First text to embed',
      'Second text to embed'
    ],
    input_type: 'search_document',  // or 'search_query'
    embedding_types: ['float']
  })
});

const embeddings = await embeddingResponse.json();
```

## Reranking

```javascript
const rerankResponse = await fetch('https://api.cohere.com/v2/rerank', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'rerank-english-v3.0',
    query: 'What is quantum computing?',
    documents: [
      { text: 'Quantum computing uses quantum mechanics...' },
      { text: 'Classical computing uses binary digits...' },
      { text: 'Quantum computers manipulate qubits...' }
    ],
    top_n: 2,
    return_documents: true
  })
});
```

## Best Practices

1. **API Key Security**: Store in environment variables, never commit to code
2. **Model Selection**:
   - Use Command A 03-2025 for highest performance
   - Use Command R+ for complex RAG workflows
   - Use Command R for balanced cost/performance
   - Use Command Light for simple, fast tasks
3. **Rate Limit Management**: Implement exponential backoff
4. **Streaming**: Use for real-time responses in UIs
5. **RAG**: Always include citations for factual accuracy
6. **Error Handling**: Always implement retry logic
7. **Context Windows**: Command models support up to 128K tokens

## Quick Integration Example

```javascript
class CohereService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.cohere.com/v2';
  }

  async sendMessage(message, options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'command-r',
        messages: [{ role: 'user', content: message }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        documents: options.documents,
        stream: options.stream || false
      })
    };

    const response = await this.makeRequestWithRetry(requestOptions);
    const data = await response.json();
    return data.message.content[0].text;
  }

  async streamMessage(message, onChunk, model = 'command-r') {
    const response = await fetch(`${this.baseURL}/chat`, {
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
          if (parsed.type === 'content-delta') {
            onChunk(parsed.delta.message.content.text);
          }
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
const cohere = new CohereService(process.env.COHERE_API_KEY);

// Standard message
const response = await cohere.sendMessage('Hello, Cohere!');

// RAG with documents
const ragResponse = await cohere.sendMessage(
  'What does the document say?',
  {
    model: 'command-r-plus',
    documents: [{ text: 'Document content...' }]
  }
);

// Streaming
await cohere.streamMessage(
  'Tell me a story',
  (chunk) => process.stdout.write(chunk)
);
```

## Important Notes

- **V2 API**: Latest version with improved features
- **RAG Focus**: Strong emphasis on retrieval-augmented generation
- **Citations**: Built-in citation generation for grounded responses
- **Connectors**: Build-Your-Own-Connector framework available
- **Weekly Updates**: Command models retrained weekly
- **Enterprise Ready**: Private deployments available

## Next Steps
- See [advanced-features.md](./advanced-features.md) for RAG, connectors, tool use
- See [best-practices.md](./best-practices.md) for optimization tips
- Official docs: https://docs.cohere.com