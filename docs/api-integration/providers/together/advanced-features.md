# Together AI API Advanced Features

## Function Calling and Tool Use

### OpenAI-Compatible Function Calling
Together supports function calling on select models (Mixtral, Mistral, CodeLlama):

```javascript
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_database',
      description: 'Search company database for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          filters: {
            type: 'object',
            properties: {
              department: { type: 'string' },
              date_range: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date' },
                  end: { type: 'string', format: 'date' }
                }
              }
            }
          },
          limit: {
            type: 'integer',
            default: 10
          }
        },
        required: ['query']
      },
      strict: true  // Enforce exact schema compliance
    }
  }
];

const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    messages: [
      {
        role: 'user',
        content: 'Find all sales reports from Q4 2024'
      }
    ],
    tools: tools,
    tool_choice: 'auto'  // or 'none', or specific function name
  })
});

// Handle function calls
const result = await response.json();
if (result.choices[0].message.tool_calls) {
  for (const toolCall of result.choices[0].message.tool_calls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    // Execute the function
    const functionResult = await executeFunction(functionName, args);
    
    // Send result back to model
    const followUp = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { /* same headers */ },
      body: JSON.stringify({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        messages: [
          { role: 'user', content: 'Find all sales reports from Q4 2024' },
          result.choices[0].message,
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

### Multi-Step Tool Usage
```javascript
class MultiStepToolHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.tools = this.defineTools();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'analyze_data',
          description: 'Analyze dataset with specified metrics',
          parameters: {
            type: 'object',
            properties: {
              data_id: { type: 'string' },
              metrics: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['data_id', 'metrics']
          },
          strict: true
        }
      },
      {
        type: 'function',
        function: {
          name: 'generate_report',
          description: 'Generate report from analysis',
          parameters: {
            type: 'object',
            properties: {
              analysis_id: { type: 'string' },
              format: {
                type: 'string',
                enum: ['pdf', 'html', 'json']
              }
            },
            required: ['analysis_id']
          },
          strict: true
        }
      }
    ];
  }

  async executeWithTools(userQuery, model = 'mistralai/Mixtral-8x7B-Instruct-v0.1') {
    let messages = [{ role: 'user', content: userQuery }];
    let toolCallsComplete = false;
    const maxIterations = 5;
    let iteration = 0;

    while (!toolCallsComplete && iteration < maxIterations) {
      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          tools: this.tools,
          tool_choice: 'auto'
        })
      });

      const data = await response.json();
      const assistantMessage = data.choices[0].message;
      messages.push(assistantMessage);

      if (assistantMessage.tool_calls) {
        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const result = await this.executeToolCall(toolCall);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
      } else {
        // No more tool calls needed
        toolCallsComplete = true;
        return assistantMessage.content;
      }
      
      iteration++;
    }
  }

  async executeToolCall(toolCall) {
    const funcName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    // Simulate tool execution
    switch (funcName) {
      case 'analyze_data':
        return { analysis_id: 'analysis_123', results: 'Data analyzed successfully' };
      case 'generate_report':
        return { report_url: 'https://example.com/report.pdf', status: 'completed' };
      default:
        return { error: 'Unknown function' };
    }
  }
}
```

## JSON Mode with Schema Validation

### Structured Output Generation
```javascript
// Define schema using Pydantic-style model (for reference)
const calendarEventSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    date: { type: 'string', format: 'date' },
    time: { type: 'string', format: 'time' },
    participants: {
      type: 'array',
      items: { type: 'string' }
    },
    location: {
      type: 'object',
      properties: {
        venue: { type: 'string' },
        address: { type: 'string' },
        room: { type: 'string', nullable: true }
      },
      required: ['venue', 'address']
    }
  },
  required: ['name', 'date', 'participants'],
  additionalProperties: false
};

const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
    messages: [
      {
        role: 'system',
        content: 'Extract event information and format as JSON'
      },
      {
        role: 'user',
        content: 'Alice and Bob are meeting at the Hilton Hotel, 123 Main St, Conference Room A on March 15th at 2:30 PM'
      }
    ],
    response_format: {
      type: 'json_schema',
      schema: calendarEventSchema
    },
    temperature: 0.1  // Lower temperature for structured output
  })
});

const data = await response.json();
const event = JSON.parse(data.choices[0].message.content);
// Guaranteed to match schema
```

## Batch Inference (50% Discount)

### Batch Processing Implementation
```javascript
class BatchProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.batchEndpoint = 'https://api.together.xyz/v1/batch';
  }

  async submitBatch(requests, model = 'meta-llama/Llama-3.1-8B-Instruct-Turbo') {
    // Format requests for batch processing
    const batchRequests = requests.map((req, idx) => ({
      custom_id: `request-${idx}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model,
        messages: req.messages,
        temperature: req.temperature || 0.7,
        max_tokens: req.max_tokens || 1000
      }
    }));

    // Submit batch job
    const response = await fetch(this.batchEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: batchRequests,
        completion_window: '24h'  // Time window for completion
      })
    });

    const batch = await response.json();
    return batch.id;  // Batch job ID
  }

  async checkBatchStatus(batchId) {
    const response = await fetch(`${this.batchEndpoint}/${batchId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return await response.json();
  }

  async retrieveBatchResults(batchId) {
    let status;
    
    // Poll for completion
    do {
      status = await this.checkBatchStatus(batchId);
      
      if (status.status === 'failed') {
        throw new Error(`Batch failed: ${status.error}`);
      }
      
      if (status.status !== 'completed') {
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    } while (status.status !== 'completed');

    // Retrieve results
    const response = await fetch(status.output_file_url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const results = await response.text();
    return results.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
}

// Usage example
const batchProcessor = new BatchProcessor(process.env.TOGETHER_API_KEY);

const requests = [
  { messages: [{ role: 'user', content: 'Summarize quantum computing' }] },
  { messages: [{ role: 'user', content: 'Explain machine learning' }] },
  { messages: [{ role: 'user', content: 'Describe blockchain technology' }] }
];

const batchId = await batchProcessor.submitBatch(requests);
console.log(`Batch submitted with ID: ${batchId}`);

// Later, retrieve results (50% cost savings!)
const results = await batchProcessor.retrieveBatchResults(batchId);
```

## Vision Models (Llama 3.2 Vision)

### Multimodal Processing
```javascript
class VisionProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async analyzeImage(imageBase64, prompt, model = 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo') {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    return await response.json();
  }

  async analyzeMultipleImages(images, prompt) {
    const content = [
      { type: 'text', text: prompt },
      ...images.map(img => ({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${img}` }
      }))
    ];

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
        messages: [{ role: 'user', content }],
        max_tokens: 2000
      })
    });

    return await response.json();
  }

  async documentOCR(documentImage) {
    return await this.analyzeImage(
      documentImage,
      'Extract all text from this document. Format the output to maintain the original structure.',
      'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo'
    );
  }
}
```

## Dedicated Endpoints

### Custom Deployment Configuration
```javascript
class DedicatedEndpoint {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.managementAPI = 'https://api.together.xyz/v1/endpoints';
  }

  async createEndpoint(config) {
    const response = await fetch(this.managementAPI, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: config.name,
        model: config.model,
        instance_type: config.instanceType || 'nvidia-a100-80gb',
        min_instances: config.minInstances || 1,
        max_instances: config.maxInstances || 1,
        scaling_config: {
          metric: 'concurrency',
          target: config.targetConcurrency || 10,
          scale_down_delay: 300  // seconds
        }
      })
    });

    const endpoint = await response.json();
    return endpoint;
  }

  async queryDedicatedEndpoint(endpointUrl, messages) {
    // Query your dedicated endpoint directly
    const response = await fetch(`${endpointUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        // No model specification needed - endpoint is model-specific
      })
    });

    return await response.json();
  }

  async monitorEndpoint(endpointId) {
    const response = await fetch(`${this.managementAPI}/${endpointId}/metrics`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return await response.json();
  }
}
```

## Streaming with Enhanced Control

### Advanced Streaming Handler
```javascript
class StreamHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async streamWithMetrics(request, onChunk, onMetrics) {
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let fullResponse = '';

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: true,
        stream_options: {
          include_usage: true  // Include token usage in stream
        }
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
            // Calculate final metrics
            const endTime = Date.now();
            const metrics = {
              totalTime: endTime - startTime,
              timeToFirstToken: firstTokenTime ? firstTokenTime - startTime : 0,
              totalTokens: tokenCount,
              tokensPerSecond: tokenCount / ((endTime - startTime) / 1000),
              response: fullResponse
            };
            
            if (onMetrics) onMetrics(metrics);
            return metrics;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              if (!firstTokenTime) {
                firstTokenTime = Date.now();
              }
              
              tokenCount++;
              fullResponse += content;
              
              if (onChunk) onChunk(content);
            }

            // Handle usage information
            if (parsed.usage) {
              if (onMetrics) {
                onMetrics({
                  usage: parsed.usage,
                  timestamp: Date.now() - startTime
                });
              }
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

## Embeddings with Multiple Models

### Advanced Embedding Operations
```javascript
class EmbeddingService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.models = {
      'bge-large': 'BAAI/bge-large-en-v1.5',
      'bge-base': 'BAAI/bge-base-en-v1.5',
      'e5-large': 'intfloat/e5-large-v2',
      'gte-large': 'thenlper/gte-large'
    };
  }

  async createEmbeddings(texts, model = 'bge-large') {
    const modelName = this.models[model] || model;
    
    const response = await fetch('https://api.together.xyz/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        input: texts
      })
    });

    const data = await response.json();
    return data.data.map(item => item.embedding);
  }

  async semanticSearch(query, documents, topK = 10) {
    // Get embeddings for query and documents
    const [queryEmbedding] = await this.createEmbeddings([query]);
    const docEmbeddings = await this.createEmbeddings(
      documents.map(d => d.text)
    );

    // Calculate cosine similarities
    const similarities = docEmbeddings.map((docEmb, idx) => ({
      document: documents[idx],
      similarity: this.cosineSimilarity(queryEmbedding, docEmb)
    }));

    // Sort and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }
}
```

## Fine-Tuning Integration

### Using Fine-Tuned Models
```javascript
class FineTunedModel {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async query(modelPath, messages, options = {}) {
    // Use your fine-tuned model
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelPath,  // e.g., 'username/model-name'
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: options.topP || 0.9,
        repetition_penalty: options.repetitionPenalty || 1.0
      })
    });

    return await response.json();
  }
}
```

## Integration Tips for Debates

### 1. Multi-Model Debate
```javascript
async function conductDebate(topic, position1, position2) {
  const models = [
    'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    'mistralai/Mixtral-8x7B-Instruct-v0.1',
    'Qwen/Qwen2.5-72B-Instruct'
  ];

  const debates = await Promise.all(models.map(async (model) => {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are debating ${position1} on the topic: ${topic}`
          },
          {
            role: 'user',
            content: 'Present your opening argument'
          }
        ],
        temperature: 0.8,
        max_tokens: 500
      })
    });

    const data = await response.json();
    return {
      model,
      argument: data.choices[0].message.content
    };
  }));

  return debates;
}
```

### 2. Reasoning-Enhanced Debates (DeepSeek R1)
```javascript
async function reasoningDebate(topic, question) {
  // Use DeepSeek R1 for reasoning
  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-R1',
      messages: [
        {
          role: 'system',
          content: 'You are a reasoning expert. Break down arguments step by step.'
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nQuestion: ${question}\nProvide detailed reasoning.`
        }
      ],
      temperature: 0.3,  // Lower for reasoning
      max_tokens: 2000
    })
  });

  return await response.json();
}
```

### 3. Cost-Optimized Batch Debates
```javascript
async function batchDebateRounds(rounds) {
  // Prepare all debate rounds for batch processing
  const batchRequests = rounds.map(round => ({
    custom_id: `round-${round.id}`,
    method: 'POST',
    url: '/v1/chat/completions',
    body: {
      model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      messages: round.messages,
      temperature: 0.7,
      max_tokens: 500
    }
  }));

  // Submit as batch for 50% discount
  const batchId = await submitBatch(batchRequests);
  
  // Process results when ready
  const results = await retrieveBatchResults(batchId);
  return results;
}
```

## Unique Together AI Features

1. **200+ Open Models**: Largest collection of open-source models
2. **OpenAI Compatibility**: Drop-in replacement for OpenAI API
3. **Batch Processing**: 50% discount on batch inference
4. **Together Inference Stack**: 4x faster than vLLM
5. **Flexible Deployment**: Serverless, dedicated, VPC, on-premise
6. **Model Agnostic**: Easy switching between models
7. **Pay-per-Token**: No subscriptions, only pay for usage
8. **Fast Scaling**: Automatic scaling for variable workloads
9. **Full Model Ownership**: Migrate models freely