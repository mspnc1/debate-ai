# DeepSeek API Advanced Features

## Deep Reasoning with DeepSeek-R1

### Chain-of-Thought Reasoning
DeepSeek-R1 uses extensive Chain-of-Thought (CoT) reasoning, averaging 23,000 tokens per complex problem:

```javascript
async function deepReasoning(problem) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content: 'Think step by step. Show all your reasoning.'
        },
        {
          role: 'user',
          content: problem
        }
      ],
      temperature: 0.1,  // Lower for consistent reasoning
      max_tokens: 30000  // R1 can use extensive tokens for thinking
    })
  });

  const data = await response.json();
  
  // Parse reasoning and answer
  const content = data.choices[0].message.content;
  const thoughtMatch = content.match(/<Thought>([\s\S]*?)<\/Thought>/);
  const reasoning = thoughtMatch ? thoughtMatch[1] : '';
  const answer = content.replace(/<Thought>[\s\S]*?<\/Thought>/, '').trim();
  
  return {
    reasoning,
    answer,
    totalTokens: data.usage.completion_tokens
  };
}
```

### Math and Code Reasoning
```javascript
class DeepSeekReasoner {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async solveMath(problem) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'user',
            content: `Solve this mathematical problem step by step: ${problem}`
          }
        ],
        temperature: 0.1,
        max_tokens: 25000
      })
    });

    const data = await response.json();
    return this.parseReasoningResponse(data);
  }

  async analyzeCode(code, question) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Think through the code step by step.'
          },
          {
            role: 'user',
            content: `Code:\n\`\`\`\n${code}\n\`\`\`\n\nQuestion: ${question}`
          }
        ],
        temperature: 0.1,
        max_tokens: 20000
      })
    });

    const data = await response.json();
    return this.parseReasoningResponse(data);
  }

  parseReasoningResponse(response) {
    const content = response.choices[0].message.content;
    
    // Extract different parts of reasoning
    const sections = {
      thought: '',
      steps: [],
      conclusion: '',
      answer: ''
    };

    // Parse thought process
    const thoughtMatch = content.match(/<Thought>([\s\S]*?)<\/Thought>/);
    if (thoughtMatch) {
      sections.thought = thoughtMatch[1];
      
      // Extract step-by-step reasoning
      const steps = sections.thought.match(/Step \d+:.*?(?=Step \d+:|$)/gs);
      if (steps) {
        sections.steps = steps.map(step => step.trim());
      }
    }

    // Get final answer (everything after thought block)
    sections.answer = content.replace(/<Thought>[\s\S]*?<\/Thought>/, '').trim();

    return {
      ...sections,
      usage: response.usage
    };
  }
}
```

## Function Calling and Tool Use

### Advanced Function Calling (R1-0528+)
```javascript
class DeepSeekToolHandler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.tools = this.defineTools();
  }

  defineTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'calculate',
          description: 'Perform mathematical calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'Mathematical expression to evaluate'
              },
              precision: {
                type: 'integer',
                description: 'Decimal places for result',
                default: 2
              }
            },
            required: ['expression']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_knowledge',
          description: 'Search internal knowledge base',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              category: {
                type: 'string',
                enum: ['science', 'history', 'technology', 'general']
              },
              limit: {
                type: 'integer',
                default: 5
              }
            },
            required: ['query']
          }
        }
      }
    ];
  }

  async executeWithTools(userQuery) {
    let messages = [{ role: 'user', content: userQuery }];
    let toolCallsComplete = false;
    const maxIterations = 5;
    let iteration = 0;

    while (!toolCallsComplete && iteration < maxIterations) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-reasoner',
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
        return {
          finalAnswer: assistantMessage.content,
          toolCalls: this.extractToolCalls(messages),
          totalTokens: data.usage.total_tokens
        };
      }
      
      iteration++;
    }
  }

  async executeToolCall(toolCall) {
    const funcName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    
    switch (funcName) {
      case 'calculate':
        return this.calculate(args.expression, args.precision);
      case 'search_knowledge':
        return this.searchKnowledge(args.query, args.category, args.limit);
      default:
        return { error: 'Unknown function' };
    }
  }

  calculate(expression, precision = 2) {
    try {
      // In production, use a safe math evaluator
      const result = eval(expression);
      return { 
        result: parseFloat(result.toFixed(precision)),
        expression 
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  searchKnowledge(query, category, limit) {
    // Simulate knowledge base search
    return {
      results: [
        { title: 'Result 1', snippet: 'Relevant information...', score: 0.95 },
        { title: 'Result 2', snippet: 'More information...', score: 0.87 }
      ],
      query,
      category
    };
  }

  extractToolCalls(messages) {
    return messages
      .filter(m => m.tool_calls)
      .flatMap(m => m.tool_calls);
  }
}
```

## JSON Mode and Structured Output

### Structured Output with Schema Validation
```javascript
async function structuredOutput(prompt, schema) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content: `You must respond with valid JSON that matches this schema: ${JSON.stringify(schema)}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  const jsonOutput = JSON.parse(data.choices[0].message.content);
  
  // Validate against schema
  if (validateSchema(jsonOutput, schema)) {
    return jsonOutput;
  } else {
    throw new Error('Output does not match schema');
  }
}

// Example usage with complex schema
const analysisSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    key_points: {
      type: 'array',
      items: { type: 'string' }
    },
    sentiment: {
      type: 'string',
      enum: ['positive', 'negative', 'neutral']
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          relevance: { type: 'number' }
        },
        required: ['name', 'type']
      }
    }
  },
  required: ['summary', 'key_points', 'sentiment']
};
```

## Context Caching Optimization

### Advanced Context Cache Management
```javascript
class ContextCacheManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.contextCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      savings: 0
    };
  }

  generateContextHash(systemPrompt) {
    // Generate hash for context identification
    let hash = 0;
    for (let i = 0; i < systemPrompt.length; i++) {
      const char = systemPrompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  async queryWithCache(systemPrompt, userQuery, model = 'deepseek-chat') {
    const contextHash = this.generateContextHash(systemPrompt);
    
    // Check if context is already cached
    if (this.contextCache.has(contextHash)) {
      this.cacheStats.hits++;
      console.log('Using cached context - 75% cost reduction');
    } else {
      this.cacheStats.misses++;
      this.contextCache.set(contextHash, {
        prompt: systemPrompt,
        timestamp: Date.now()
      });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    // Calculate savings from cache hits
    if (data.usage.prompt_cache_hit_tokens > 0) {
      const cachedTokens = data.usage.prompt_cache_hit_tokens;
      const normalCost = (cachedTokens / 1000000) * 0.27;  // V3 input price
      const cacheCost = (cachedTokens / 1000000) * 0.07;   // Cache hit price
      this.cacheStats.savings += (normalCost - cacheCost);
    }

    return {
      response: data.choices[0].message.content,
      usage: data.usage,
      cacheStats: this.cacheStats
    };
  }

  async batchQueriesWithSharedContext(context, queries) {
    // Process multiple queries with the same context for maximum cache benefit
    const results = [];
    
    for (let i = 0; i < queries.length; i++) {
      const result = await this.queryWithCache(context, queries[i]);
      results.push(result);
      
      // After first query, all subsequent ones get cache discount
      if (i === 0) {
        console.log('Context cached for subsequent queries');
      }
    }

    return {
      results,
      totalSavings: this.cacheStats.savings,
      cacheHitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
    };
  }
}
```

## Streaming with Keep-Alive Handling

### Enhanced Streaming with Connection Management
```javascript
class DeepSeekStreamHandler {
  async streamWithKeepAlive(request, onChunk, onKeepAlive) {
    const startTime = Date.now();
    let lastActivityTime = Date.now();
    const keepAliveInterval = 30000; // 30 seconds
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const now = Date.now();
        
        // Handle keep-alive signals
        if (line.includes(': keep-alive')) {
          lastActivityTime = now;
          if (onKeepAlive) {
            onKeepAlive({
              elapsed: now - startTime,
              message: 'Server processing, connection alive'
            });
          }
          continue;
        }

        if (line.startsWith('data: ')) {
          lastActivityTime = now;
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return {
              content: fullContent,
              totalTokens: tokenCount,
              duration: now - startTime
            };
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullContent += content;
              tokenCount++;
              if (onChunk) onChunk(content);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }

        // Check for timeout
        if (now - lastActivityTime > keepAliveInterval * 2) {
          console.warn('No activity for extended period, connection may be stale');
        }
      }
    }
  }
}
```

## Off-Peak Optimization

### Time-Based Request Scheduling
```javascript
class OffPeakScheduler {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.queue = [];
    this.processing = false;
  }

  isOffPeak() {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const currentTime = utcHours * 100 + utcMinutes;
    
    // Off-peak: 16:30-00:30 UTC (50% discount)
    return currentTime >= 1630 || currentTime <= 30;
  }

  getTimeUntilOffPeak() {
    if (this.isOffPeak()) return 0;
    
    const now = new Date();
    const offPeakStart = new Date(now);
    offPeakStart.setUTCHours(16, 30, 0, 0);
    
    if (now > offPeakStart) {
      // Next day's off-peak
      offPeakStart.setDate(offPeakStart.getDate() + 1);
    }
    
    return offPeakStart - now;
  }

  async scheduleRequest(request, options = {}) {
    if (options.immediate || this.isOffPeak()) {
      // Execute immediately
      return await this.executeRequest(request);
    }

    if (options.waitForOffPeak) {
      // Add to queue for off-peak processing
      return new Promise((resolve, reject) => {
        this.queue.push({ request, resolve, reject });
        if (!this.processing) {
          this.processQueueAtOffPeak();
        }
      });
    }

    // Inform about potential savings
    const timeUntilOffPeak = this.getTimeUntilOffPeak();
    console.log(`Note: Waiting ${Math.round(timeUntilOffPeak / 60000)} minutes for off-peak would save 50%`);
    
    return await this.executeRequest(request);
  }

  async processQueueAtOffPeak() {
    this.processing = true;
    
    // Wait for off-peak if needed
    const waitTime = this.getTimeUntilOffPeak();
    if (waitTime > 0) {
      console.log(`Waiting ${Math.round(waitTime / 60000)} minutes for off-peak rates...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Process all queued requests at 50% discount
    console.log('Off-peak period started - processing queued requests at 50% discount');
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10); // Process in batches
      
      await Promise.all(batch.map(async ({ request, resolve, reject }) => {
        try {
          const result = await this.executeRequest(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }));
    }

    this.processing = false;
  }

  async executeRequest(request) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    return await response.json();
  }
}
```

## V3 vs R1 Model Selection

### Intelligent Model Routing
```javascript
class ModelSelector {
  analyzeComplexity(prompt) {
    const complexityIndicators = {
      math: /solve|calculate|equation|integral|derivative|proof/i,
      reasoning: /explain why|analyze|compare|evaluate|deduce/i,
      stepByStep: /step by step|show your work|explain each/i,
      code: /debug|optimize|refactor|implement algorithm/i,
      simple: /what is|define|list|name|when was/i
    };

    let score = 0;
    
    if (complexityIndicators.math.test(prompt)) score += 3;
    if (complexityIndicators.reasoning.test(prompt)) score += 3;
    if (complexityIndicators.stepByStep.test(prompt)) score += 2;
    if (complexityIndicators.code.test(prompt)) score += 2;
    if (complexityIndicators.simple.test(prompt)) score -= 2;

    // Length indicator
    if (prompt.length > 500) score += 1;
    if (prompt.split('\n').length > 10) score += 1;

    return score;
  }

  selectModel(prompt, options = {}) {
    const complexity = this.analyzeComplexity(prompt);
    
    if (options.forceReasoning || complexity >= 5) {
      return {
        model: 'deepseek-reasoner',
        reason: 'Complex reasoning required',
        estimatedTokens: 23000
      };
    }

    if (complexity <= 0) {
      return {
        model: 'deepseek-chat',
        reason: 'Simple query - V3 is sufficient',
        estimatedTokens: 100
      };
    }

    // Medium complexity - consider cost vs quality
    if (options.costSensitive) {
      return {
        model: 'deepseek-chat',
        reason: 'Medium complexity but cost-sensitive',
        estimatedTokens: 500
      };
    }

    return {
      model: 'deepseek-reasoner',
      reason: 'Medium-high complexity benefits from reasoning',
      estimatedTokens: 5000
    };
  }

  async routeRequest(prompt, options = {}) {
    const selection = this.selectModel(prompt, options);
    console.log(`Selected: ${selection.model} (${selection.reason})`);

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selection.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: selection.model === 'deepseek-reasoner' ? 0.1 : 0.7,
        max_tokens: Math.min(selection.estimatedTokens * 1.5, 30000)
      })
    });

    return await response.json();
  }
}
```

## Integration Tips for Debates

### 1. Reasoning-Enhanced Debates
```javascript
async function reasoningDebate(topic, position) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'system',
          content: `You are debating ${position} on ${topic}. Think through your arguments step by step.`
        },
        {
          role: 'user',
          content: 'Present your opening argument with detailed reasoning.'
        }
      ],
      temperature: 0.3,
      max_tokens: 25000
    })
  });

  const data = await response.json();
  
  // Extract reasoning and argument
  const content = data.choices[0].message.content;
  return {
    fullResponse: content,
    reasoningTokens: content.match(/<Thought>/g)?.length || 0,
    cost: (data.usage.completion_tokens / 1000000) * 2.19
  };
}
```

### 2. Cost-Optimized Debate Rounds
```javascript
async function economicalDebate(rounds) {
  const scheduler = new OffPeakScheduler(process.env.DEEPSEEK_API_KEY);
  const results = [];

  for (const round of rounds) {
    const result = await scheduler.scheduleRequest({
      model: round.complex ? 'deepseek-reasoner' : 'deepseek-chat',
      messages: round.messages,
      temperature: 0.7,
      max_tokens: round.complex ? 10000 : 1000
    }, {
      waitForOffPeak: !round.urgent  // Wait for 50% discount if not urgent
    });

    results.push(result);
  }

  return results;
}
```

### 3. Multi-Model Verification
```javascript
async function verifyWithReasoning(claim) {
  // First get quick response from V3
  const quickResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: `True or false: ${claim}` }
      ],
      temperature: 0.1,
      max_tokens: 100
    })
  });

  const quick = await quickResponse.json();

  // If uncertain, use reasoning model
  if (quick.choices[0].message.content.includes('unclear') || 
      quick.choices[0].message.content.includes('depends')) {
    
    const reasoningResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-reasoner',
        messages: [
          { role: 'user', content: `Analyze this claim thoroughly: ${claim}` }
        ],
        temperature: 0.1,
        max_tokens: 15000
      })
    });

    return await reasoningResponse.json();
  }

  return quick;
}
```

## Unique DeepSeek Features

1. **No Rate Limits**: Unlimited requests with graceful degradation
2. **Deep Reasoning**: R1 averages 23K tokens for complex problems
3. **Context Caching**: 75% discount on repeated contexts
4. **Off-Peak Pricing**: 50% discount during 16:30-00:30 UTC
5. **OpenAI Compatible**: Drop-in replacement for OpenAI API
6. **Improved R1-0528**: 87.5% on AIME 2025, better function calling
7. **V3 Performance**: Enhanced with R1 training techniques
8. **Keep-Alive Signals**: Maintains connections during heavy processing
9. **Commercial Ready**: Designed for production use