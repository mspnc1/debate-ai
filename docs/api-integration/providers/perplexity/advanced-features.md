# Perplexity API Advanced Features

## Real-Time Web Search

### Built-in Search Capabilities
Every Perplexity API call automatically performs real-time web searches:

```javascript
// All models include web search by default
const searchRequest = {
  model: 'sonar',
  messages: [
    {
      role: 'user',
      content: 'What happened in tech news today?'
    }
  ],
  // Search happens automatically
};
```

### Search Domain Filtering
```javascript
// Limit searches to specific trusted domains
const domainFilteredRequest = {
  model: 'sonar-pro',
  messages: [
    {
      role: 'user',
      content: 'Latest research on climate change'
    }
  ],
  search_domain_filter: [
    'nature.com',
    'science.org',
    'arxiv.org',
    'nasa.gov',
    'noaa.gov'
  ]
};

// Response will only include results from specified domains
```

### Search Recency Filtering
```javascript
const recencyRequest = {
  model: 'sonar',
  messages: [
    {
      role: 'user',
      content: 'Breaking news about AI regulations'
    }
  ],
  search_recency_filter: 'day'  // Options: day, week, month, year
};
```

## Citation Management

### Search Results Field (Post April 18, 2025)
```javascript
// New citation format using search_results
const response = {
  choices: [
    {
      message: {
        content: 'According to recent studies [1], quantum computing...'
      }
    }
  ],
  search_results: [
    {
      title: 'Quantum Computing Breakthrough',
      url: 'https://example.com/quantum',
      snippet: 'Researchers have achieved...',
      publication_date: '2025-01-15',
      domain: 'example.com'
    },
    {
      title: 'IBM Quantum Update',
      url: 'https://ibm.com/quantum',
      snippet: 'IBM announces new quantum...',
      publication_date: '2025-01-14',
      domain: 'ibm.com'
    }
  ]
};
```

### Citation Extraction
```javascript
class CitationExtractor {
  extractCitations(response) {
    const citations = [];
    const content = response.choices[0].message.content;
    const searchResults = response.search_results || [];
    
    // Extract citation markers from content [1], [2], etc.
    const citationPattern = /\[(\d+)\]/g;
    const matches = content.matchAll(citationPattern);
    
    for (const match of matches) {
      const index = parseInt(match[1]) - 1;
      if (searchResults[index]) {
        citations.push({
          number: match[1],
          source: searchResults[index],
          context: this.getContext(content, match.index)
        });
      }
    }
    
    return citations;
  }
  
  getContext(content, position, windowSize = 100) {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(content.length, position + windowSize);
    return content.substring(start, end);
  }
}
```

## Sonar Deep Research (Async API)

### Complex Query Processing
```javascript
// For queries requiring extensive research
async function deepResearch(query) {
  // Submit deep research request
  const submitResponse = await fetch('https://api.perplexity.ai/deep-research', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-deep-research',
      query: query,
      max_search_depth: 3,  // How many levels deep to search
      max_sources: 20        // Maximum number of sources to analyze
    })
  });
  
  const { request_id } = await submitResponse.json();
  
  // Poll for completion (async processing)
  return await pollDeepResearch(request_id);
}

async function pollDeepResearch(requestId) {
  const maxAttempts = 60;  // 5 minutes max
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.perplexity.ai/deep-research/${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.status === 'completed') {
      return data.result;
    }
    
    if (data.status === 'failed') {
      throw new Error(`Deep research failed: ${data.error}`);
    }
    
    // Wait 5 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Deep research timeout');
}
```

## JSON Mode

### Structured Output
```javascript
const jsonModeRequest = {
  model: 'sonar',
  messages: [
    {
      role: 'system',
      content: 'Return your response as valid JSON'
    },
    {
      role: 'user',
      content: 'List the top 3 AI companies with their valuations'
    }
  ],
  response_format: { type: 'json_object' },
  // Optional: provide schema
  json_schema: {
    type: 'object',
    properties: {
      companies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            valuation: { type: 'string' },
            founded: { type: 'number' },
            headquarters: { type: 'string' }
          },
          required: ['name', 'valuation']
        }
      }
    },
    required: ['companies']
  }
};
```

## Multi-Turn Conversations with Search Context

### Maintaining Search Context
```javascript
class PerplexityConversation {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.messages = [];
    this.searchContext = [];
  }
  
  async addMessage(role, content) {
    this.messages.push({ role, content });
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: this.messages,
        return_citations: true
      })
    });
    
    const data = await response.json();
    
    // Store assistant response
    this.messages.push({
      role: 'assistant',
      content: data.choices[0].message.content
    });
    
    // Accumulate search context
    if (data.search_results) {
      this.searchContext.push(...data.search_results);
    }
    
    return {
      content: data.choices[0].message.content,
      sources: data.search_results
    };
  }
  
  getUniqueSourced() {
    // Deduplicate sources across conversation
    const uniqueSources = new Map();
    
    for (const source of this.searchContext) {
      if (!uniqueSources.has(source.url)) {
        uniqueSources.set(source.url, source);
      }
    }
    
    return Array.from(uniqueSources.values());
  }
}
```

## Cost Optimization Features

### Token Usage Tracking
```javascript
class PerplexityCostTracker {
  constructor() {
    this.usage = {
      searches: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0
    };
  }
  
  trackUsage(response) {
    const usage = response.usage;
    
    // Track token usage
    this.usage.inputTokens += usage.prompt_tokens;
    this.usage.outputTokens += usage.completion_tokens;
    
    // Track costs (included in response)
    this.usage.totalCost += usage.total_cost;
    
    // Track search count
    this.usage.searches++;
    
    return {
      requestCost: usage.total_cost,
      totalCost: this.usage.totalCost,
      searchCount: this.usage.searches
    };
  }
  
  getCostBreakdown(model = 'sonar') {
    const pricing = {
      'sonar': {
        search: 0.005,  // $5 per 1000 searches
        input: 0.00000133,  // $1 per 750K words
        output: 0.00000133   // $1 per 750K words
      },
      'sonar-pro': {
        search: 0.005,
        input: 0.000004,   // $3 per 750K words
        output: 0.00002    // $15 per 750K words
      }
    };
    
    const modelPricing = pricing[model];
    
    return {
      searchCost: this.usage.searches * modelPricing.search,
      inputCost: this.usage.inputTokens * modelPricing.input,
      outputCost: this.usage.outputTokens * modelPricing.output,
      totalCost: this.usage.totalCost
    };
  }
}
```

## Streaming with Citations

### Handle Streaming + Citations
```javascript
class PerplexityStreamHandler {
  async streamWithCitations(request, onToken, onCitation) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
    let searchResults = null;
    
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
            // Final processing
            if (searchResults && onCitation) {
              onCitation(searchResults);
            }
            return { content: fullContent, sources: searchResults };
          }
          
          try {
            const parsed = JSON.parse(data);
            
            // Handle content chunks
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onToken(content);
            }
            
            // Handle search results (usually in final chunk)
            if (parsed.search_results) {
              searchResults = parsed.search_results;
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

## Fallback Strategies

### Handle Rate Limits with Fallback
```javascript
class PerplexityWithFallback {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestQueue = [];
    this.processing = false;
  }
  
  async queueRequest(request) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  async processQueue() {
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift();
      
      try {
        // Process with rate limit consideration (50 req/min)
        const response = await this.makeRequest(item.request);
        item.resolve(response);
        
        // Wait 1.2 seconds between requests (50 req/min = 1 req/1.2s)
        if (this.requestQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
      } catch (error) {
        if (error.status === 429) {
          // Put back in queue for retry
          this.requestQueue.unshift(item);
          // Wait longer on rate limit
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          item.reject(error);
        }
      }
    }
    
    this.processing = false;
  }
  
  async makeRequest(request) {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw { status: response.status, message: await response.text() };
    }
    
    return await response.json();
  }
}
```

## Integration Tips for Debates

### 1. Real-Time Fact Checking
```javascript
async function factCheckDebate(claim) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',  // Use Pro for better accuracy
      messages: [
        {
          role: 'system',
          content: 'You are a fact-checker. Verify claims with sources.'
        },
        {
          role: 'user',
          content: `Fact check this claim: "${claim}"`
        }
      ],
      search_recency_filter: 'month',  // Recent sources
      search_domain_filter: [
        'reuters.com',
        'apnews.com',
        'factcheck.org',
        'snopes.com',
        'bbc.com',
        'nature.com',
        'science.org'
      ]
    })
  });
  
  return await response.json();
}
```

### 2. Source-Based Debate Arguments
```javascript
async function generateSourcedArgument(position, topic) {
  return await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: `You are debating ${position} on ${topic}. Use citations.`
        },
        {
          role: 'user',
          content: 'Provide your opening argument with sources.'
        }
      ],
      return_citations: true,
      max_tokens: 500
    })
  });
}
```

### 3. Research Summary for Debates
```javascript
async function researchDebateTopic(topic) {
  // Use Deep Research for comprehensive background
  const deepResearch = await submitDeepResearch(topic);
  
  // Summarize for debate context
  const summary = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'Summarize key debate points from research.'
        },
        {
          role: 'user',
          content: deepResearch.comprehensive_summary
        }
      ],
      response_format: { type: 'json_object' }
    })
  });
  
  return await summary.json();
}
```

## Unique Perplexity Features

1. **Always-On Web Search**: Every query includes real-time search
2. **Citation Accuracy**: F-score of 0.858 for Sonar Pro
3. **Domain Filtering**: Limit to trusted sources
4. **Recency Control**: Filter by time period
5. **Deep Research**: Async API for complex queries
6. **Cost Transparency**: Usage costs in every response
7. **OpenAI Compatibility**: Works with OpenAI SDK
8. **No Model Training**: Focus purely on search + generation