# OpenAI GPT-5 API Advanced Features

## Vision / Image Input

### Multimodal Models
GPT-4o and GPT-5 models integrate text and images in a single model, handling multiple data types simultaneously.

### Image Input Format
```javascript
const imageMessage = {
  model: 'gpt-5',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is in this image?'
        },
        {
          type: 'image_url',
          image_url: {
            url: 'data:image/jpeg;base64,${base64Image}',
            detail: 'high'  // Options: low, high, auto
          }
        }
      ]
    }
  ]
};
```

### Multiple Images
```javascript
const multiImageMessage = {
  model: 'gpt-5',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Compare these images'
        },
        {
          type: 'image_url',
          image_url: { url: 'data:image/jpeg;base64,${image1}' }
        },
        {
          type: 'image_url',
          image_url: { url: 'data:image/jpeg;base64,${image2}' }
        }
      ]
    }
  ]
};
```

## Function Calling / Tools

### Tool Definition
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
            enum: ['celsius', 'fahrenheit']
          }
        },
        required: ['location']
      }
    }
  }
];
```

### Using Tools in Request
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
      { role: 'user', content: 'What\'s the weather in San Francisco?' }
    ],
    tools: tools,
    tool_choice: 'auto'  // Options: auto, none, required, or specific tool
  })
});

const result = await response.json();
const message = result.choices[0].message;

// Check if tool was called
if (message.tool_calls) {
  for (const toolCall of message.tool_calls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    // Execute the function
    const functionResult = await executeFunction(functionName, args);
    
    // Send result back to GPT
    const followUp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { /* same headers */ },
      body: JSON.stringify({
        model: 'gpt-5',
        messages: [
          { role: 'user', content: 'What\'s the weather in San Francisco?' },
          message, // Previous GPT response with tool_calls
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          }
        ]
      })
    });
  }
}
```

### Parallel Tool Calling
```javascript
// GPT-5 can call multiple tools in parallel
const tools = [
  { type: 'function', function: { name: 'get_weather', /* ... */ } },
  { type: 'function', function: { name: 'get_news', /* ... */ } },
  { type: 'function', function: { name: 'get_stock_price', /* ... */ } }
];

// GPT may return multiple tool_calls to execute simultaneously
```

### Custom Tools (GPT-5 Specific)
```javascript
// GPT-5 supports custom tools with plaintext instead of JSON
const customTool = {
  type: 'custom',
  name: 'analyze_debate',
  description: 'Analyze debate arguments',
  grammar: 'CFG_GRAMMAR_DEFINITION',  // Context-free grammar constraint
  plaintext: true  // Use plaintext instead of JSON
};
```

## Image Generation (DALL-E 3)

### Generate Image
```javascript
const imageGeneration = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: 'A serene landscape with mountains and a lake at sunset',
    n: 1,  // Number of images (DALL-E 3 only supports n=1)
    size: '1024x1024',  // Options: 1024x1024, 1024x1792, 1792x1024
    quality: 'standard',  // Options: standard, hd
    style: 'vivid'  // Options: vivid, natural
  })
});

const result = await imageGeneration.json();
const imageUrl = result.data[0].url;
```

### Image Generation in Responses API
```javascript
// GPT-image-1 supports real-time streaming previews
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [
      { role: 'user', content: 'Create an image of a futuristic city' }
    ],
    tools: [
      { type: 'image_generation' }
    ],
    stream: true  // Stream image generation progress
  })
});
```

## Assistants API

### Create an Assistant
```javascript
const assistant = await fetch('https://api.openai.com/v1/assistants', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  },
  body: JSON.stringify({
    name: 'Debate Moderator',
    instructions: 'You are a fair and knowledgeable debate moderator.',
    model: 'gpt-5',
    tools: [
      { type: 'code_interpreter' },
      { type: 'file_search' }
    ]
  })
});

const assistantData = await assistant.json();
```

### Create Thread and Run
```javascript
// Create a thread
const thread = await fetch('https://api.openai.com/v1/threads', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'assistants=v2'
  },
  body: JSON.stringify({})
});

const threadData = await thread.json();

// Add message to thread
await fetch(`https://api.openai.com/v1/threads/${threadData.id}/messages`, {
  method: 'POST',
  headers: { /* same headers */ },
  body: JSON.stringify({
    role: 'user',
    content: 'Start a debate about renewable energy'
  })
});

// Run the assistant
const run = await fetch(`https://api.openai.com/v1/threads/${threadData.id}/runs`, {
  method: 'POST',
  headers: { /* same headers */ },
  body: JSON.stringify({
    assistant_id: assistantData.id
  })
});
```

### Code Interpreter
```javascript
// Assistant with code interpreter can execute Python code
const assistant = {
  model: 'gpt-5',
  tools: [
    {
      type: 'code_interpreter'
    }
  ],
  file_ids: ['file-abc123']  // Files for code interpreter to access
};

// Code interpreter features:
// - Runs Python in sandboxed environment
// - Process various data formats
// - Generate graphs and visualizations
// - 1 hour active session, 30 min idle timeout
```

### File Search / Retrieval
```javascript
// Upload file for assistant
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('purpose', 'assistants');

const file = await fetch('https://api.openai.com/v1/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: formData
});

const fileData = await file.json();

// Create assistant with file search
const assistant = {
  model: 'gpt-5',
  tools: [
    {
      type: 'file_search'
    }
  ],
  file_ids: [fileData.id]  // Up to 20 files
};
```

## Structured Outputs

### JSON Mode
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
        content: 'You output only valid JSON.'
      },
      {
        role: 'user',
        content: 'List 3 debate topics'
      }
    ],
    response_format: { type: 'json_object' }
  })
});
```

### JSON Schema (Structured Outputs)
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [ /* ... */ ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'debate_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            winner: { type: 'string' },
            scores: {
              type: 'object',
              properties: {
                team1: { type: 'number' },
                team2: { type: 'number' }
              },
              required: ['team1', 'team2']
            },
            summary: { type: 'string' }
          },
          required: ['winner', 'scores', 'summary']
        }
      }
    }
  })
});
```

## Prompt Caching

### Enable Caching for Cost Savings
```javascript
// 90% discount on cached input tokens
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
        content: 'You are a debate moderator. [Long system prompt...]',
        // This system message will be cached automatically
      },
      {
        role: 'user',
        content: 'Start the debate'
      }
    ]
  })
});

// Subsequent requests with same system prompt get 90% discount
```

## Batch API

### Submit Batch for 50% Cost Savings
```javascript
// Create batch file (JSONL format)
const batchRequests = [
  {
    custom_id: 'req-1',
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'Question 1' }]
    }
  },
  {
    custom_id: 'req-2',
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'gpt-5',
      messages: [{ role: 'user', content: 'Question 2' }]
    }
  }
];

// Upload batch file
const formData = new FormData();
formData.append('file', new Blob([
  batchRequests.map(r => JSON.stringify(r)).join('\n')
], { type: 'application/jsonl' }));
formData.append('purpose', 'batch');

const file = await fetch('https://api.openai.com/v1/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
  },
  body: formData
});

const fileData = await file.json();

// Create batch
const batch = await fetch('https://api.openai.com/v1/batches', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input_file_id: fileData.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h'
  })
});

// Check batch status
const batchData = await batch.json();
// Poll batchData.id for completion
```

## Real-Time API (Audio)

### WebSocket Connection for Voice
```javascript
// Real-time voice conversations (similar to Advanced Voice Mode)
const ws = new WebSocket('wss://api.openai.com/v1/realtime', {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1'
  }
});

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'session.create',
    session: {
      model: 'gpt-4o-realtime',
      voice: 'alloy',
      instructions: 'You are a helpful assistant.',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16'
    }
  }));
});

// Pricing: 
// Text: $5/1M input, $20/1M output tokens
// Audio: $100/1M input ($0.06/min), $200/1M output ($0.24/min)
```

## Performance Optimizations

### 1. Use Appropriate Detail Level for Images
```javascript
// Low detail for quick analysis
image_url: {
  url: imageUrl,
  detail: 'low'  // Faster, cheaper
}

// High detail for precise analysis
image_url: {
  url: imageUrl,
  detail: 'high'  // More accurate, more expensive
}
```

### 2. Optimize Context with Reasoning Effort
```javascript
// For simple tasks
{
  model: 'gpt-5',
  reasoning_effort: 'minimal',  // Faster responses
  messages: [...]
}

// For complex reasoning
{
  model: 'gpt-5',
  reasoning_effort: 'high',  // Better quality
  messages: [...]
}
```

### 3. Stream Tool Results
```javascript
// Stream tool execution for better UX
{
  model: 'gpt-5',
  stream: true,
  tools: [...],
  parallel_tool_calls: true  // Execute tools in parallel
}
```

## Integration Tips for Debates

1. **Use Assistants for Persistent Moderators**: Create debate moderator assistants with consistent personalities
2. **Leverage Code Interpreter**: For scoring and statistical analysis of debates
3. **File Search**: Upload debate rules and reference materials
4. **Parallel Tools**: Call multiple fact-checking tools simultaneously
5. **Structured Outputs**: Get consistent debate scoring formats
6. **Image Generation**: Create visual summaries of debate outcomes
7. **Caching**: Cache debate rules and system prompts for cost savings

## Model Selection Strategy

```javascript
function selectModel(task) {
  if (task.requiresImages) {
    return 'gpt-5';  // Full multimodal support
  }
  
  if (task.complexity === 'high' || task.type === 'coding') {
    return 'gpt-5';  // Best for complex reasoning
  }
  
  if (task.volume === 'high' && task.complexity === 'low') {
    return 'gpt-5-nano';  // $0.05/$0.40 per 1M tokens
  }
  
  return 'gpt-5-mini';  // Balanced option at $0.25/$2
}
```