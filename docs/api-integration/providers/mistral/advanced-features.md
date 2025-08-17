# Mistral AI API Advanced Features

## Function Calling

### Overview
Function calling allows Mistral models to connect to external tools and APIs. Available for:
- Mistral Small
- Mistral Large (improved in 24.11 version)
- Mistral Medium 3

### Define Functions
```javascript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit'
          }
        },
        required: ['location']
      }
    }
  }
];

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
        role: 'user',
        content: 'What\'s the weather in Paris?'
      }
    ],
    tools: tools,
    tool_choice: 'auto'  // auto, none, or specific function
  })
});

// Check for function calls in response
const result = await response.json();
if (result.choices[0].message.tool_calls) {
  const toolCall = result.choices[0].message.tool_calls[0];
  
  // Execute the function
  const functionResult = await executeFunction(
    toolCall.function.name,
    JSON.parse(toolCall.function.arguments)
  );
  
  // Send result back to Mistral
  const followUp = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { /* same headers */ },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'user', content: 'What\'s the weather in Paris?' },
        result.choices[0].message,  // Assistant's function call
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        }
      ]
    })
  });
}
```

### Real-Time API Integration Example
```javascript
// Example: Flight status integration
const flightStatusTool = {
  type: 'function',
  function: {
    name: 'get_flight_status',
    description: 'Get real-time flight status information',
    parameters: {
      type: 'object',
      properties: {
        flight_number: {
          type: 'string',
          description: 'Flight number (e.g., AA123)'
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format'
        }
      },
      required: ['flight_number']
    }
  }
};

// Mistral will intelligently call this function when needed
```

## Mistral Agents with Function Calling

### Agent Creation with Tools
```javascript
// Agents support function calling with JSON schema format
const agentConfig = {
  model: 'mistral-large-latest',
  name: 'Research Assistant',
  description: 'An agent that can search and analyze information',
  tools: [
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Search the web for information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            max_results: { type: 'integer', default: 5 }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'analyze_data',
        description: 'Analyze numerical data',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'number' }
            },
            operation: {
              type: 'string',
              enum: ['mean', 'median', 'sum', 'std']
            }
          },
          required: ['data', 'operation']
        }
      }
    }
  ]
};
```

## JSON Mode and Structured Output

### Basic JSON Mode
```javascript
const jsonRequest = {
  model: 'mistral-large-latest',
  messages: [
    {
      role: 'user',
      content: 'List the top 3 programming languages for AI development'
    }
  ],
  response_format: { type: 'json_object' }
};

// Response will be valid JSON
```

### Structured Output with Schema
```javascript
const structuredRequest = {
  model: 'mistral-large-latest',
  messages: [
    {
      role: 'system',
      content: 'You are a data extraction assistant. Always respond with valid JSON.'
    },
    {
      role: 'user',
      content: 'Extract company information from: Apple Inc. was founded in 1976 by Steve Jobs.'
    }
  ],
  response_format: { type: 'json_object' },
  // Optional: provide expected schema
  json_schema: {
    type: 'object',
    properties: {
      company_name: { type: 'string' },
      founded_year: { type: 'integer' },
      founders: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['company_name', 'founded_year']
  }
};
```

## Codestral Advanced Features

### Code Generation with Context
```javascript
// Codestral 25.01 with 256K context window
const codeGenRequest = {
  model: 'codestral-latest',
  messages: [
    {
      role: 'system',
      content: 'You are an expert programmer. Generate clean, documented code.'
    },
    {
      role: 'user',
      content: `Given this large codebase context:
      ${largeCodebaseContext} // Up to 256K tokens
      
      Implement a new feature that...`
    }
  ],
  temperature: 0.3,  // Lower for more deterministic code
  max_tokens: 2000
};
```

### Multi-Language Code Support
```javascript
// Codestral supports 80+ programming languages
const multiLangRequest = {
  model: 'codestral-latest',
  messages: [
    {
      role: 'user',
      content: 'Convert this Python function to Rust:\n' + pythonCode
    }
  ]
};
```

### Codestral Mamba (Linear Inference)
```javascript
// Codestral Mamba for infinite sequence handling
const mambaRequest = {
  model: 'codestral-mamba-latest',
  messages: [
    {
      role: 'user',
      content: 'Process this extremely long code sequence...'
      // Mamba architecture allows for linear time inference
      // Effective for potentially infinite length sequences
    }
  ]
};
```

## Fine-Tuning Integration

### Using Fine-Tuned Models
```javascript
// After fine-tuning a model
const fineTunedRequest = {
  model: 'ft:mistral-large-2:my-org:my-fine-tune:abc123',
  messages: [
    {
      role: 'user',
      content: 'Domain-specific query...'
    }
  ],
  temperature: 0.7
};

// Fine-tuning costs:
// - Mistral Large 2: $9/1M tokens + $4/month storage
// - Codestral: $3/1M tokens + $2/month storage
```

## Streaming with Function Calls

### Handle Streaming + Tool Calls
```javascript
class MistralStreamHandler {
  async streamWithTools(request, tools, onChunk, onToolCall) {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        tools,
        stream: true
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCall = null;
    
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
            if (currentToolCall && onToolCall) {
              onToolCall(currentToolCall);
            }
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            // Handle content streaming
            if (delta?.content) {
              onChunk(delta.content);
            }
            
            // Handle tool call streaming
            if (delta?.tool_calls) {
              currentToolCall = delta.tool_calls[0];
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

## Multi-Turn Conversations

### Context Management
```javascript
class MistralConversation {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.messages = [];
    this.model = 'mistral-large-latest';
  }
  
  async addMessage(role, content) {
    this.messages.push({ role, content });
    
    // Trim context if needed (model dependent)
    this.trimContext();
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.messages
      })
    });
    
    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    
    this.messages.push(assistantMessage);
    return assistantMessage.content;
  }
  
  trimContext() {
    const maxContextTokens = this.getMaxContext();
    // Implement token counting and trimming logic
    // Keep most recent messages within token limit
  }
  
  getMaxContext() {
    const contextLimits = {
      'mistral-large-latest': 128000,
      'mistral-medium-latest': 32000,
      'mistral-small-latest': 32000,
      'codestral-latest': 256000
    };
    return contextLimits[this.model] || 32000;
  }
}
```

## Embeddings

### Generate Embeddings
```javascript
const embeddingResponse = await fetch('https://api.mistral.ai/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistral-embed',
    input: [
      'First text to embed',
      'Second text to embed'
    ]
  })
});

const embeddings = await embeddingResponse.json();
// Use embeddings for similarity search, RAG, etc.
```

## Performance Optimizations

### 1. Model Selection by Task
```javascript
class MistralModelSelector {
  selectOptimalModel(task) {
    if (task.type === 'code_generation') {
      if (task.contextSize > 32000) {
        return 'codestral-latest';  // 256K context
      }
      return 'codestral-mamba-latest';  // Linear inference
    }
    
    if (task.complexity === 'high' || task.requiresFunctions) {
      return 'mistral-large-latest';  // Best reasoning
    }
    
    if (task.costSensitive) {
      return 'mistral-small-latest';  // $1/$3 per 1M
    }
    
    return 'mistral-medium-latest';  // Balanced
  }
}
```

### 2. Batch Processing
```javascript
async function batchProcess(requests) {
  // Process multiple requests efficiently
  const promises = requests.map(req => 
    fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req)
    })
  );
  
  // Use Promise.allSettled to handle partial failures
  const results = await Promise.allSettled(promises);
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : null
  );
}
```

## Integration Tips for Debates

### 1. Multilingual Debates
```javascript
// Mistral excels at multilingual support
const multilingualDebate = {
  model: 'mistral-large-latest',
  messages: [
    {
      role: 'system',
      content: 'You are debating in multiple languages. Respond in the same language as the input.'
    },
    {
      role: 'user',
      content: 'Quelle est votre position sur le changement climatique?'
    }
  ]
};
```

### 2. Code Review Debates
```javascript
// Use Codestral for technical debates
const codeDebate = {
  model: 'codestral-latest',
  messages: [
    {
      role: 'system',
      content: 'You are debating code architecture decisions.'
    },
    {
      role: 'user',
      content: 'Should we use microservices or monolithic architecture? Here\'s our codebase...'
    }
  ],
  temperature: 0.7
};
```

### 3. Structured Debate Scoring
```javascript
// Use JSON mode for consistent scoring
const scoringRequest = {
  model: 'mistral-large-latest',
  messages: [
    {
      role: 'user',
      content: 'Score this debate round...'
    }
  ],
  response_format: { type: 'json_object' },
  json_schema: {
    type: 'object',
    properties: {
      scores: {
        type: 'object',
        properties: {
          team1: { type: 'number', minimum: 0, maximum: 100 },
          team2: { type: 'number', minimum: 0, maximum: 100 }
        }
      },
      reasoning: { type: 'string' },
      winner: { type: 'string' }
    }
  }
};
```

## Unique Mistral Features

1. **European Focus**: Strong GDPR compliance and data sovereignty
2. **Multilingual Excellence**: Superior support for European languages
3. **256K Context (Codestral)**: One of the largest context windows
4. **Linear Inference (Mamba)**: Handle infinite sequences
5. **80+ Programming Languages**: Comprehensive code support
6. **Cost-Effective**: Competitive pricing, especially for European users
7. **JSON Mode for All Models**: Universal structured output support
8. **Fine-Tuning Available**: Customize models for specific domains