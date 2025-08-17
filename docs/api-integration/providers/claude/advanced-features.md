# Claude API Advanced Features

## Vision / Image Input

### Supported Formats
- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif) - Non-animated only
- **WebP** (.webp)

### Image Limits
- Maximum 20 images per request
- Maximum 3.75 MB per image
- Maximum 8,000 x 8,000 pixels
- Images are automatically resized if > 1568px on long edge

### Base64 Image Input
```javascript
const imageMessage = {
  role: 'user',
  content: [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64ImageData  // Without data:image/jpeg;base64, prefix
      }
    },
    {
      type: 'text',
      text: 'What is shown in this image?'
    }
  ]
};

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
    messages: [imageMessage]
  })
});
```

### Multiple Images
```javascript
const multiImageMessage = {
  role: 'user',
  content: [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: image1Base64
      }
    },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: image2Base64
      }
    },
    {
      type: 'text',
      text: 'Compare these two images'
    }
  ]
};
```

### Files API (Beta) - Persistent Upload
```javascript
// Upload file once
const formData = new FormData();
formData.append('file', imageFile);
formData.append('purpose', 'vision');

const uploadResponse = await fetch('https://api.anthropic.com/v1/files', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY
  },
  body: formData
});

const { file_id } = await uploadResponse.json();

// Use file_id in messages
const messageWithFile = {
  role: 'user',
  content: [
    {
      type: 'file',
      file_id: file_id
    },
    {
      type: 'text',
      text: 'Analyze this document'
    }
  ]
};
```

## Function Calling / Tool Use

### Tool Definition
```javascript
const tools = [
  {
    name: 'get_weather',
    description: 'Get the current weather in a location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City and state, e.g. San Francisco, CA'
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
];
```

### Using Tools in Request
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
    tools: tools,
    messages: [
      {
        role: 'user',
        content: 'What\'s the weather in San Francisco?'
      }
    ]
  })
});

// Response will include tool_use content block
const result = await response.json();
if (result.stop_reason === 'tool_use') {
  const toolCall = result.content.find(c => c.type === 'tool_use');
  
  // Execute the function with provided parameters
  const weatherData = await getWeather(toolCall.input);
  
  // Send result back to Claude
  const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { /* same headers */ },
    body: JSON.stringify({
      model: 'claude-4-sonnet-20250514',
      max_tokens: 1024,
      tools: tools,
      messages: [
        { role: 'user', content: 'What\'s the weather in San Francisco?' },
        result, // Previous Claude response
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify(weatherData)
            }
          ]
        }
      ]
    })
  });
}
```

### Fine-Grained Tool Streaming (Claude 4)
```javascript
// Add header for streaming tool parameters
headers: {
  'x-api-key': process.env.CLAUDE_API_KEY,
  'anthropic-version': '2024-10-01',
  'content-type': 'application/json',
  'fine-grained-tool-streaming-2025-05-14': 'true'  // Enable fine-grained streaming
}
```

## Extended Context (1M Tokens)

### Enable 1M Context Window (Claude 4 Sonnet)
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2024-10-01',
    'content-type': 'application/json',
    'anthropic-beta': 'context-1m-2025-08-07'  // Enable 1M context
  },
  body: JSON.stringify({
    model: 'claude-4-sonnet-20250514',
    max_tokens: 8192,
    messages: [/* your messages */]
  })
});
```

## Extended Output (128K Tokens)

### Enable 128K Output (Claude Sonnet 3.7+)
```javascript
headers: {
  'x-api-key': process.env.CLAUDE_API_KEY,
  'anthropic-version': '2024-10-01',
  'content-type': 'application/json',
  'anthropic-beta': 'output-128k-2025-02-19'  // Enable 128K output
}
```

## Prompt Caching

### Cache System Prompts for Cost Savings
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2024-10-01',
    'content-type': 'application/json',
    'anthropic-beta': 'prompt-caching-2024-07-31'
  },
  body: JSON.stringify({
    model: 'claude-4-sonnet-20250514',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: 'You are a helpful AI assistant with extensive knowledge...',
        cache_control: { type: 'ephemeral' }  // Cache this prompt
      }
    ],
    messages: [/* your messages */]
  })
});
```

## Batch Processing

### 50% Cost Savings for Non-Urgent Requests
```javascript
// Create batch request
const batchRequest = {
  requests: [
    {
      custom_id: 'req_1',
      params: {
        model: 'claude-4-sonnet-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Question 1' }]
      }
    },
    {
      custom_id: 'req_2',
      params: {
        model: 'claude-4-sonnet-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Question 2' }]
      }
    }
  ]
};

// Submit batch (processes within 24 hours)
const response = await fetch('https://api.anthropic.com/v1/batches', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.CLAUDE_API_KEY,
    'anthropic-version': '2024-10-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify(batchRequest)
});
```

## Advanced Streaming Features

### Parse SSE Events
```javascript
function parseSSE(data) {
  const lines = data.split('\n');
  const events = [];
  
  for (const line of lines) {
    if (line.startsWith('event:')) {
      const eventType = line.slice(6).trim();
      events.push({ type: eventType });
    } else if (line.startsWith('data:')) {
      const data = JSON.parse(line.slice(5));
      events[events.length - 1].data = data;
    }
  }
  
  return events;
}

// Handle different event types
for (const event of parseSSE(chunk)) {
  switch (event.type) {
    case 'content_block_start':
      console.log('Starting new content block');
      break;
    case 'content_block_delta':
      console.log('Received text:', event.data.delta.text);
      break;
    case 'content_block_stop':
      console.log('Content block complete');
      break;
    case 'message_stop':
      console.log('Message complete');
      break;
  }
}
```

## Performance Optimizations

### 1. Image Preprocessing
```javascript
// Resize images before sending to avoid automatic resizing
async function preprocessImage(base64Image) {
  // If image > 1568px on long edge, resize it
  // This avoids Claude's automatic resizing which adds latency
  return resizedBase64;
}
```

### 2. Parallel Tool Calls
```javascript
// Claude can call multiple tools in parallel
const tools = [
  { name: 'get_weather', /* ... */ },
  { name: 'get_news', /* ... */ },
  { name: 'get_stock_price', /* ... */ }
];

// Claude may return multiple tool_use blocks to execute in parallel
```

### 3. Token Optimization
```javascript
// Use shorter model names for common models
const modelAliases = {
  'opus': 'claude-4-opus-20250514',
  'sonnet': 'claude-4-sonnet-20250514',
  'haiku': 'claude-3-5-haiku-20250514'
};
```

## Unique Claude Features

### 1. Artifacts (Not via API - Claude.ai only)
Artifacts are interactive content windows for code, documents, and designs created during conversations.

### 2. Extended Thinking (Claude 4)
Claude 4 models offer two modes:
- **Standard**: Near-instant responses
- **Extended**: Deeper reasoning for complex tasks

### 3. Superior Vision Capabilities
- Best at chart/graph interpretation
- Accurate text extraction from imperfect images
- Strong visual reasoning performance

## Integration Tips for Debates

1. **Use Streaming**: Essential for real-time debate responses
2. **Leverage Vision**: Allow debates about images/charts
3. **Function Calling**: Structure debate scoring and analysis
4. **Model Selection**:
   - Opus for judge/moderator role (complex reasoning)
   - Sonnet for debate participants (balanced)
   - Haiku for quick fact-checks (fast)
5. **Context Management**: Use prompt caching for debate rules/context

## Error Handling for Advanced Features

```javascript
try {
  const response = await fetch(/* ... */);
  
  if (response.status === 400) {
    const error = await response.json();
    if (error.error?.type === 'invalid_request_error') {
      // Handle invalid tool schema, bad image format, etc.
      console.error('Invalid request:', error.error.message);
    }
  }
} catch (error) {
  // Network errors, parsing errors
  console.error('Request failed:', error);
}
```