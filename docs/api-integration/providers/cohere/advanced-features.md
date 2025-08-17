# Cohere API Advanced Features

## Retrieval-Augmented Generation (RAG)

### Built-in RAG with Citations
Cohere's Command models have native RAG capabilities with automatic citation generation:

```javascript
const ragRequest = {
  model: 'command-r-plus',
  messages: [
    {
      role: 'user',
      content: 'What are the key features of our product?'
    }
  ],
  documents: [
    {
      id: 'doc1',
      title: 'Product Overview',
      text: 'Our product offers real-time analytics, AI-powered insights, and seamless integration.',
      url: 'https://docs.example.com/overview'
    },
    {
      id: 'doc2',
      title: 'Feature List',
      text: 'Key features include: dashboard customization, automated reporting, and predictive analytics.',
      url: 'https://docs.example.com/features'
    }
  ],
  citation_options: {
    mode: 'accurate',  // Options: 'fast', 'accurate', 'off'
    chunk_size: 512    // Size of text chunks for citation
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

// Response includes inline citations
const data = await response.json();
// data.message.citations contains precise text spans and source references
```

### Advanced Document Processing
```javascript
class CohereRAGProcessor {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async processWithGrounding(query, documents) {
    // Format documents for Cohere's RAG
    const formattedDocs = documents.map((doc, index) => ({
      id: `doc_${index}`,
      title: doc.title || `Document ${index + 1}`,
      text: doc.content,
      url: doc.url,
      metadata: doc.metadata || {}
    }));

    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Always cite your sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        documents: formattedDocs,
        citation_options: {
          mode: 'accurate'
        },
        temperature: 0.3  // Lower for factual accuracy
      })
    });

    const data = await response.json();
    
    // Extract citations with source mapping
    const citationsWithSources = this.mapCitationsToSources(
      data.message.citations,
      formattedDocs
    );
    
    return {
      answer: data.message.content[0].text,
      citations: citationsWithSources,
      usage: data.usage
    };
  }

  mapCitationsToSources(citations, documents) {
    return citations.map(citation => ({
      text: citation.text,
      start: citation.start,
      end: citation.end,
      sources: citation.sources.map(source => {
        const doc = documents.find(d => d.id === source.id);
        return {
          title: doc?.title,
          url: doc?.url,
          snippet: source.text
        };
      })
    }));
  }
}
```

## Connectors Framework

### Build-Your-Own-Connector
```javascript
class CohereConnector {
  constructor(apiKey, dataSource) {
    this.apiKey = apiKey;
    this.dataSource = dataSource;  // Your external data source
  }

  async search(query) {
    // Search your data source
    const results = await this.dataSource.search(query, {
      limit: 10,
      fields: ['title', 'content', 'url']
    });

    // Format for Cohere
    return results.map(result => ({
      id: result.id,
      title: result.title,
      text: result.content,  // Main content in 'text' field
      url: result.url,
      metadata: {
        created_at: result.created_at,
        author: result.author,
        category: result.category
      }
    }));
  }

  async queryWithConnector(userQuery) {
    // Step 1: Search for relevant documents
    const documents = await this.search(userQuery);

    // Step 2: Send to Cohere with documents
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus',
        messages: [
          {
            role: 'user',
            content: userQuery
          }
        ],
        documents: documents,
        citation_options: {
          mode: 'accurate'
        }
      })
    });

    return await response.json();
  }
}

// Example: Connect to a vector database
class VectorDBConnector extends CohereConnector {
  constructor(apiKey, vectorDB) {
    super(apiKey, vectorDB);
  }

  async search(query) {
    // Get embeddings for query
    const embedding = await this.getEmbedding(query);
    
    // Search vector DB
    const results = await this.dataSource.similaritySearch(embedding, {
      topK: 10,
      threshold: 0.7
    });

    return results.map(this.formatForCohere);
  }

  async getEmbedding(text) {
    const response = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        texts: [text],
        input_type: 'search_query'
      })
    });

    const data = await response.json();
    return data.embeddings[0];
  }
}
```

## Tool Use (Function Calling)

### Multi-Step Tool Usage
```javascript
const multiStepToolRequest = {
  model: 'command-r-plus',
  messages: [
    {
      role: 'user',
      content: 'Book a flight from NYC to Paris next week and find a hotel'
    }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'search_flights',
        description: 'Search for available flights',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            date: { type: 'string' }
          },
          required: ['from', 'to']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_hotels',
        description: 'Search for hotels in a city',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            checkin: { type: 'string' },
            checkout: { type: 'string' }
          },
          required: ['city']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_flight',
        description: 'Book a specific flight',
        parameters: {
          type: 'object',
          properties: {
            flight_id: { type: 'string' },
            passenger_name: { type: 'string' }
          },
          required: ['flight_id']
        }
      }
    }
  ],
  force_single_step: false  // Allow multi-step execution
};

// Handle multi-step tool calls
async function handleMultiStepTools(request) {
  let messages = [...request.messages];
  let toolCallsComplete = false;

  while (!toolCallsComplete) {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        messages
      })
    });

    const data = await response.json();
    
    if (data.message.tool_calls) {
      // Execute tool calls
      for (const toolCall of data.message.tool_calls) {
        const result = await executeToolCall(toolCall);
        
        // Add tool response to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      // Add assistant's message
      messages.push(data.message);
    } else {
      // No more tool calls, conversation complete
      toolCallsComplete = true;
      return data;
    }
  }
}
```

## Command A Vision

### Multimodal Understanding
```javascript
const visionRequest = {
  model: 'command-vision',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What information can you extract from this document?'
        },
        {
          type: 'image',
          image: {
            base64: 'base64_encoded_image_data',
            media_type: 'image/png'
          }
        }
      ]
    }
  ],
  temperature: 0.3
};

// Process documents with OCR and understanding
async function processDocument(imageBase64) {
  const response = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'command-vision',
      messages: [
        {
          role: 'system',
          content: 'Extract all text and structured data from the document.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract and structure the information from this document'
            },
            {
              type: 'image',
              image: {
                base64: imageBase64,
                media_type: 'image/png'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  return await response.json();
}
```

## Advanced Embeddings

### Semantic Search with Embed v3
```javascript
class CohereSemanticSearch {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.embeddingCache = new Map();
  }

  async createEmbeddings(texts, inputType = 'search_document') {
    const response = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        texts: texts,
        input_type: inputType,  // 'search_document' or 'search_query'
        embedding_types: ['float'],
        truncate: 'END'  // How to handle long texts
      })
    });

    const data = await response.json();
    return data.embeddings;
  }

  async semanticSearch(query, documents) {
    // Get query embedding
    const [queryEmbedding] = await this.createEmbeddings(
      [query],
      'search_query'
    );

    // Get document embeddings (with caching)
    const docEmbeddings = await this.getDocumentEmbeddings(documents);

    // Calculate similarities
    const similarities = docEmbeddings.map((docEmb, idx) => ({
      document: documents[idx],
      similarity: this.cosineSimilarity(queryEmbedding, docEmb)
    }));

    // Sort by similarity
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);
  }

  async getDocumentEmbeddings(documents) {
    const uncached = [];
    const embeddings = [];

    for (let i = 0; i < documents.length; i++) {
      const cached = this.embeddingCache.get(documents[i].id);
      if (cached) {
        embeddings[i] = cached;
      } else {
        uncached.push({ idx: i, text: documents[i].text });
      }
    }

    if (uncached.length > 0) {
      const newEmbeddings = await this.createEmbeddings(
        uncached.map(u => u.text),
        'search_document'
      );

      uncached.forEach((item, idx) => {
        embeddings[item.idx] = newEmbeddings[idx];
        this.embeddingCache.set(
          documents[item.idx].id,
          newEmbeddings[idx]
        );
      });
    }

    return embeddings;
  }

  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }
}
```

## Rerank 3.5 Advanced Usage

### Multi-Stage Retrieval Pipeline
```javascript
class MultiStageRetrieval {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async retrieve(query, documents, stages = 2) {
    // Stage 1: Initial retrieval (e.g., BM25 or vector search)
    let candidates = await this.initialRetrieval(query, documents);

    // Stage 2: Rerank with Cohere
    if (stages >= 2) {
      candidates = await this.rerank(query, candidates, 20);
    }

    // Stage 3: Deep rerank with more context
    if (stages >= 3) {
      candidates = await this.deepRerank(query, candidates.slice(0, 20), 5);
    }

    return candidates;
  }

  async rerank(query, documents, topN = 10) {
    const response = await fetch('https://api.cohere.com/v2/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'rerank-3',
        query: query,
        documents: documents.map(doc => ({
          text: doc.text,
          id: doc.id
        })),
        top_n: topN,
        return_documents: true,
        max_chunks_per_doc: 10  // For long documents
      })
    });

    const data = await response.json();
    return data.results.map(r => ({
      ...documents.find(d => d.id === r.document.id),
      relevance_score: r.relevance_score
    }));
  }

  async deepRerank(query, documents, topN = 5) {
    // Add more context for better reranking
    const enrichedDocs = documents.map(doc => ({
      text: `Title: ${doc.title}\nContent: ${doc.text}\nMetadata: ${JSON.stringify(doc.metadata)}`,
      id: doc.id
    }));

    return await this.rerank(query, enrichedDocs, topN);
  }
}
```

## Streaming with Tool Use

### Stream + Tools + Citations
```javascript
class CohereStreamHandler {
  async streamWithTools(request, onChunk, onToolCall, onCitation) {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
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
    let currentToolCall = null;
    let citations = [];

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
            if (citations.length > 0 && onCitation) {
              onCitation(citations);
            }
            return;
          }

          try {
            const parsed = JSON.parse(data);
            
            // Handle different event types
            switch (parsed.type) {
              case 'content-delta':
                if (parsed.delta?.message?.content?.text) {
                  onChunk(parsed.delta.message.content.text);
                }
                break;
                
              case 'tool-call-start':
                currentToolCall = parsed.delta.message.tool_calls[0];
                break;
                
              case 'tool-call-delta':
                if (currentToolCall) {
                  currentToolCall.function.arguments += 
                    parsed.delta.message.tool_calls[0].function.arguments;
                }
                break;
                
              case 'tool-call-end':
                if (currentToolCall && onToolCall) {
                  onToolCall(currentToolCall);
                  currentToolCall = null;
                }
                break;
                
              case 'citation-generation-start':
                citations = [];
                break;
                
              case 'citation-generation-end':
                if (parsed.citations) {
                  citations = parsed.citations;
                }
                break;
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

## Aya Models for Multilingual Support

### Multilingual Generation
```javascript
async function multilingualGeneration(text, targetLanguage) {
  const response = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'aya-expanse',  // Supports 23 languages
      messages: [
        {
          role: 'system',
          content: `Respond in ${targetLanguage}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7
    })
  });

  return await response.json();
}

// Aya Vision for multilingual + multimodal
async function multilingualVision(imageBase64, question, language) {
  const response = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'aya-vision',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: question
            },
            {
              type: 'image',
              image: {
                base64: imageBase64,
                media_type: 'image/png'
              }
            }
          ]
        }
      ],
      language: language  // Specify target language
    })
  });

  return await response.json();
}
```

## Safety Modes (Command R 08-2024+)

### Configurable Safety Settings
```javascript
const safetyRequest = {
  model: 'command-r',
  messages: [
    {
      role: 'user',
      content: 'Analyze this controversial topic...'
    }
  ],
  safety_mode: 'CONTEXTUAL',  // Options: 'CONTEXTUAL', 'STRICT', 'NONE'
  safety_categories: {
    hate: true,
    violence: true,
    self_harm: true,
    sexual: true
  }
};
```

## Integration Tips for Debates

### 1. Grounded Debate Arguments
```javascript
async function generateGroundedArgument(position, topic, sources) {
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
          content: `You are debating ${position} on ${topic}. Use provided sources.`
        },
        {
          role: 'user',
          content: 'Present your argument with citations.'
        }
      ],
      documents: sources,
      citation_options: {
        mode: 'accurate'
      },
      temperature: 0.7
    })
  });

  return await response.json();
}
```

### 2. Multi-Source Fact Checking
```javascript
async function factCheckWithMultipleSources(claim, sources) {
  // First, rerank sources by relevance
  const rerankResponse = await fetch('https://api.cohere.com/v2/rerank', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'rerank-3',
      query: claim,
      documents: sources,
      top_n: 5
    })
  });

  const rankedSources = await rerankResponse.json();

  // Then verify with top sources
  const verifyResponse = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'command-r-plus',
      messages: [
        {
          role: 'user',
          content: `Fact check: "${claim}"`
        }
      ],
      documents: rankedSources.results,
      citation_options: {
        mode: 'accurate'
      }
    })
  });

  return await verifyResponse.json();
}
```

## Unique Cohere Features

1. **Native RAG**: Built-in document grounding with automatic citations
2. **Weekly Model Updates**: Command models retrained weekly
3. **Accurate Citations**: Fine-grained citation generation
4. **Build-Your-Own-Connector**: Flexible framework for data integration
5. **Rerank 3.5**: Advanced reranking in 100+ languages
6. **Command Vision**: Multimodal understanding for documents
7. **Aya Models**: Multilingual support for 23+ languages
8. **Safety Modes**: Configurable content safety settings
9. **Enterprise Focus**: Private deployments and customization