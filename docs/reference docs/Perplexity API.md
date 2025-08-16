# Chat Completions

> Generates a model's response for the given chat conversation.

## OpenAPI

```yaml post /chat/completions
paths:
  path: /chat/completions
  method: post
  servers:
    - url: https://api.perplexity.ai
  request:
    security:
      - title: HTTPBearer
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
          cookie: {}
    parameters:
      path: {}
      query: {}
      header: {}
      cookie: {}
    body:
      application/json:
        schemaArray:
          - type: object
            properties:
              model:
                allOf:
                  - title: Model
                    type: string
                    enum:
                      - sonar
                      - sonar-pro
                      - sonar-deep-research
                      - sonar-reasoning
                      - sonar-reasoning-pro
                    description: >-
                      The name of the model that will complete your prompt.
                      Choose from our available Sonar models: sonar (lightweight
                      search), sonar-pro (advanced search), sonar-deep-research
                      (exhaustive research), sonar-reasoning (fast reasoning),
                      or sonar-reasoning-pro (premier reasoning).
                    example: sonar
                    x-openai-compatible: true
              messages:
                allOf:
                  - title: Messages
                    type: array
                    description: A list of messages comprising the conversation so far.
                    x-openai-compatible: true
                    items:
                      $ref: "#/components/schemas/ChatCompletionsMessage"
                    example:
                      - role: system
                        content: Be precise and concise.
                      - role: user
                        content: How many stars are there in our galaxy?
              search_mode:
                allOf:
                  - title: Search Mode
                    type: string
                    enum:
                      - academic
                      - web
                    default: web
                    description: >-
                      Controls the search mode used for the request. When set to
                      'academic', results will prioritize scholarly sources like
                      peer-reviewed papers and academic journals. More
                      information about this
                      [here](https://docs.perplexity.ai/guides/academic-filter-guide).
                    x-openai-compatible: false
              reasoning_effort:
                allOf:
                  - title: Reasoning Effort
                    type: string
                    enum:
                      - low
                      - medium
                      - high
                    description: >-
                      **Perplexity-Specific**: Controls how much computational
                      effort the AI dedicates to each query for deep research
                      models. 'low' provides faster, simpler answers with
                      reduced token usage, 'medium' offers a balanced approach,
                      and 'high' delivers deeper, more thorough responses with
                      increased token usage. This parameter directly impacts the
                      amount of reasoning tokens consumed. **WARNING: This
                      parameter is ONLY applicable for sonar-deep-research.**
                      Defaults to 'medium' when used with sonar-deep-research.
              max_tokens:
                allOf:
                  - title: Max Tokens
                    type: integer
                    description: >-
                      **OpenAI Compatible**: The maximum number of completion
                      tokens returned by the API. Controls the length of the
                      model's response. If the response would exceed this limit,
                      it will be truncated. Higher values allow for longer
                      responses but may increase processing time and costs.
              temperature:
                allOf:
                  - title: Temperature
                    type: number
                    default: 0.2
                    description: >-
                      The amount of randomness in the response, valued between 0
                      and 2. Lower values (e.g., 0.1) make the output more
                      focused, deterministic, and less creative. Higher values
                      (e.g., 1.5) make the output more random and creative. Use
                      lower values for factual/information retrieval tasks and
                      higher values for creative applications.
                    minimum: 0
                    maximum: 2
                    exclusiveMaximum: true
                    x-openai-compatible: true
              top_p:
                allOf:
                  - title: Top P
                    type: number
                    default: 0.9
                    description: >-
                      **OpenAI Compatible**: The nucleus sampling threshold,
                      valued between 0 and 1. Controls the diversity of
                      generated text by considering only the tokens whose
                      cumulative probability exceeds the top_p value. Lower
                      values (e.g., 0.5) make the output more focused and
                      deterministic, while higher values (e.g., 0.95) allow for
                      more diverse outputs. Often used as an alternative to
                      temperature.
              search_domain_filter:
                allOf:
                  - title: Search Domain Filter
                    type: array
                    description: >-
                      A list of domains to limit search results to. Currently
                      limited to 10 domains for Allowlisting and Denylisting.
                      For Denylisting, add a `-` at the beginning of the domain
                      string. More information about this
                      [here](https://docs.perplexity.ai/guides/search-domain-filters).
                    x-openai-compatible: false
              return_images:
                allOf:
                  - title: Return Images
                    type: boolean
                    default: false
                    description: >-
                      **Perplexity-Specific**: Determines whether search results
                      should include images.
              return_related_questions:
                allOf:
                  - title: Return Related Questions
                    type: boolean
                    default: false
                    description: >-
                      **Perplexity-Specific**: Determines whether related
                      questions should be returned.
              search_recency_filter:
                allOf:
                  - title: Recency Filter
                    type: string
                    description: >-
                      **Perplexity-Specific**: Filters search results based on
                      time (e.g., 'week', 'day').
              search_after_date_filter:
                allOf:
                  - title: Search After Date Filter
                    type: string
                    description: >-
                      **Perplexity-Specific**: Filters search results to only
                      include content published after this date. Format should
                      be %m/%d/%Y (e.g. 3/1/2025)
              search_before_date_filter:
                allOf:
                  - title: Search Before Date Filter
                    type: string
                    description: >-
                      **Perplexity-Specific**: Filters search results to only
                      include content published before this date. Format should
                      be %m/%d/%Y (e.g. 3/1/2025)
              last_updated_after_filter:
                allOf:
                  - title: Last Updated After Filter
                    type: string
                    description: >-
                      **Perplexity-Specific**: Filters search results to only
                      include content last updated after this date. Format
                      should be %m/%d/%Y (e.g. 3/1/2025)
              last_updated_before_filter:
                allOf:
                  - title: Last Updated Before Filter
                    type: string
                    description: >-
                      **Perplexity-Specific**: Filters search results to only
                      include content last updated before this date. Format
                      should be %m/%d/%Y (e.g. 3/1/2025)
              top_k:
                allOf:
                  - title: Top K
                    type: number
                    default: 0
                    description: >-
                      **OpenAI Compatible**: The number of tokens to keep for
                      top-k filtering. Limits the model to consider only the k
                      most likely next tokens at each step. Lower values (e.g.,
                      10) make the output more focused and deterministic, while
                      higher values allow for more diverse outputs. A value of 0
                      disables this filter. Often used in conjunction with top_p
                      to control output randomness.
              stream:
                allOf:
                  - title: Streaming
                    type: boolean
                    default: false
                    description: >-
                      **OpenAI Compatible**: Determines whether to stream the
                      response incrementally.
              presence_penalty:
                allOf:
                  - title: Presence Penalty
                    type: number
                    default: 0
                    description: >-
                      **OpenAI Compatible**: Positive values increase the
                      likelihood of discussing new topics. Applies a penalty to
                      tokens that have already appeared in the text, encouraging
                      the model to talk about new concepts. Values typically
                      range from 0 (no penalty) to 2.0 (strong penalty). Higher
                      values reduce repetition but may lead to more off-topic
                      text.
              frequency_penalty:
                allOf:
                  - title: Frequency Penalty
                    type: number
                    default: 0
                    description: >-
                      **OpenAI Compatible**: Decreases likelihood of repetition
                      based on prior frequency. Applies a penalty to tokens
                      based on how frequently they've appeared in the text so
                      far. Values typically range from 0 (no penalty) to 2.0
                      (strong penalty). Higher values (e.g., 1.5) reduce
                      repetition of the same words and phrases. Useful for
                      preventing the model from getting stuck in loops.
              response_format:
                allOf:
                  - title: Response Format
                    type: object
                    description: Enables structured JSON output formatting.
                    x-openai-compatible: true
              disable_search:
                allOf:
                  - title: Disable Search
                    type: boolean
                    default: false
                    description: >-
                      **Perplexity-Specific**: When set to true, disables web
                      search completely and the model will only use its training
                      data to respond. This is useful when you want
                      deterministic responses without external information. More
                      information about this
                      [here](https://docs.perplexity.ai/guides/search-control-guide#disabling-search-completely).
                    x-openai-compatible: false
              enable_search_classifier:
                allOf:
                  - title: Enable Search Classifier
                    type: boolean
                    default: false
                    description: >-
                      **Perplexity-Specific**: Enables a classifier that decides
                      if web search is needed based on your query. See more
                      [here](https://docs.perplexity.ai/guides/search-control-guide#search-classifier).
                    x-openai-compatible: false
              web_search_options:
                allOf:
                  - title: Web Search Options
                    type: object
                    description: >-
                      **Perplexity-Specific**: Configuration for using web
                      search in model responses.
                    properties:
                      search_context_size:
                        title: Search Context Size
                        type: string
                        default: low
                        enum:
                          - low
                          - medium
                          - high
                        description: >-
                          Determines how much search context is retrieved for
                          the model. Options are: `low` (minimizes context for
                          cost savings but less comprehensive answers), `medium`
                          (balanced approach suitable for most queries), and
                          `high` (maximizes context for comprehensive answers
                          but at higher cost).
                      user_location:
                        title: Location of the user.
                        type: object
                        description: >-
                          To refine search results based on geography, you can
                          specify an approximate user location.
                        properties:
                          latitude:
                            title: Latitude
                            type: number
                            description: The latitude of the user's location.
                          longitude:
                            title: Longitude
                            type: number
                            description: The longitude of the user's location.
                          country:
                            title: Country
                            type: string
                            description: >-
                              The two letter ISO country code of the user's
                              location.
                    example:
                      search_context_size: high
            required: true
            title: ChatCompletionsRequest
            refIdentifier: "#/components/schemas/ChatCompletionsRequest"
            requiredProperties:
              - model
              - messages
        examples:
          example:
            value:
              model: sonar
              messages:
                - role: system
                  content: Be precise and concise.
                - role: user
                  content: How many stars are there in our galaxy?
              search_mode: web
              reasoning_effort: low
              max_tokens: 123
              temperature: 0.2
              top_p: 0.9
              search_domain_filter:
                - <any>
              return_images: false
              return_related_questions: false
              search_recency_filter: <string>
              search_after_date_filter: <string>
              search_before_date_filter: <string>
              last_updated_after_filter: <string>
              last_updated_before_filter: <string>
              top_k: 0
              stream: false
              presence_penalty: 0
              frequency_penalty: 0
              response_format: {}
              disable_search: false
              enable_search_classifier: false
              web_search_options:
                search_context_size: high
  response:
    "200":
      application/json:
        schemaArray:
          - type: object
            properties:
              id:
                allOf:
                  - title: ID
                    type: string
                    description: A unique identifier for the chat completion.
              model:
                allOf:
                  - title: Model
                    type: string
                    description: The model that generated the response.
              created:
                allOf:
                  - title: Created Timestamp
                    type: integer
                    description: >-
                      The Unix timestamp (in seconds) of when the chat
                      completion was created.
              usage:
                allOf:
                  - $ref: "#/components/schemas/UsageInfo"
              object:
                allOf:
                  - title: Object Type
                    type: string
                    default: chat.completion
                    description: The type of object, which is always `chat.completion`.
              choices:
                allOf:
                  - title: Choices
                    type: array
                    items:
                      $ref: "#/components/schemas/ChatCompletionsChoice"
                    description: >-
                      A list of chat completion choices. Can be more than one if
                      `n` is greater than 1.
              search_results:
                allOf:
                  - title: Search Results
                    type: array
                    items:
                      $ref: "#/components/schemas/ApiPublicSearchResult"
                    nullable: true
                    description: A list of search results related to the response.
            title: ChatCompletionsResponseJson
            refIdentifier: "#/components/schemas/ChatCompletionsResponseJson"
            requiredProperties:
              - id
              - model
              - created
              - usage
              - object
              - choices
        examples:
          example:
            value:
              id: <string>
              model: <string>
              created: 123
              usage:
                prompt_tokens: 123
                completion_tokens: 123
                total_tokens: 123
                search_context_size: <string>
                citation_tokens: 123
                num_search_queries: 123
                reasoning_tokens: 123
              object: chat.completion
              choices:
                - index: 123
                  finish_reason: stop
                  message:
                    content: <string>
                    role: system
              search_results:
                - title: <string>
                  url: <string>
                  date: "2023-12-25"
        description: OK
      text/event-stream:
        schemaArray:
          - type: object
            properties:
              id:
                allOf:
                  - title: ID
                    type: string
                    description: A unique identifier for the chat completion chunk.
              model:
                allOf:
                  - title: Model
                    type: string
                    description: The model that generated the response.
              created:
                allOf:
                  - title: Created Timestamp
                    type: integer
                    description: >-
                      The Unix timestamp (in seconds) of when the chat
                      completion chunk was created.
              object:
                allOf:
                  - title: Object Type
                    type: string
                    default: chat.completion.chunk
                    description: >-
                      The type of object, which is always
                      `chat.completion.chunk`.
              choices:
                allOf:
                  - title: Choices
                    type: array
                    items:
                      $ref: "#/components/schemas/ChatCompletionsChunkChoice"
                    description: >-
                      A list of chat completion choices. Can be more than one if
                      `n` is greater than 1.
            title: ChatCompletionsResponseEventStream
            refIdentifier: "#/components/schemas/ChatCompletionsResponseEventStream"
            requiredProperties:
              - id
              - model
              - created
              - object
              - choices
        examples:
          example:
            value:
              id: <string>
              model: <string>
              created: 123
              object: chat.completion.chunk
              choices:
                - index: 123
                  finish_reason: stop
                  delta:
                    content: <string>
                    role: system
        description: OK
  deprecated: false
  type: path
components:
  schemas:
    ChatCompletionsMessage:
      title: Message
      type: object
      required:
        - content
        - role
      properties:
        content:
          title: Message Content
          oneOf:
            - type: string
              description: The text contents of the message.
            - type: array
              items:
                $ref: "#/components/schemas/ChatCompletionsMessageContentChunk"
              description: An array of content parts for multimodal messages.
          description: >-
            The contents of the message in this turn of conversation. Can be a
            string or an array of content parts.
        role:
          title: Role
          type: string
          enum:
            - system
            - user
            - assistant
          description: The role of the speaker in this conversation.
    ChatCompletionsMessageContentChunk:
      title: ChatCompletionsMessageContentChunk
      type: object
      properties:
        type:
          title: Content Part Type
          type: string
          enum:
            - text
            - image_url
          description: The type of the content part.
        text:
          title: Text Content
          type: string
          description: The text content of the part.
        image_url:
          title: Image URL Content
          type: object
          properties:
            url:
              title: Image URL
              type: string
              format: uri
              description: URL for the image (base64 encoded data URI or HTTPS).
          required:
            - url
          description: An object containing the URL of the image.
      required:
        - type
      description: Represents a part of a multimodal message content.
    UsageInfo:
      title: UsageInfo
      type: object
      properties:
        prompt_tokens:
          title: Prompt Tokens
          type: integer
        completion_tokens:
          title: Completion Tokens
          type: integer
        total_tokens:
          title: Total Tokens
          type: integer
        search_context_size:
          title: Search Context Size
          type: string
          nullable: true
        citation_tokens:
          title: Citation Tokens
          type: integer
          nullable: true
        num_search_queries:
          title: Number of Search Queries
          type: integer
          nullable: true
        reasoning_tokens:
          title: Reasoning Tokens
          type: integer
          nullable: true
      required:
        - prompt_tokens
        - completion_tokens
        - total_tokens
    ChatCompletionsChoice:
      title: ChatCompletionsChoice
      type: object
      properties:
        index:
          title: Index
          type: integer
        finish_reason:
          title: Finish Reason
          type: string
          enum:
            - stop
            - length
          nullable: true
        message:
          $ref: "#/components/schemas/ChatCompletionsMessage"
      required:
        - index
        - message
    ChatCompletionsChunkChoice:
      title: ChatCompletionsChunkChoice
      type: object
      properties:
        index:
          title: Index
          type: integer
        finish_reason:
          title: Finish Reason
          type: string
          enum:
            - stop
            - length
          nullable: true
        delta:
          $ref: "#/components/schemas/ChatCompletionsMessage"
      required:
        - index
        - delta
    ApiPublicSearchResult:
      title: ApiPublicSearchResult
      type: object
      properties:
        title:
          title: Title
          type: string
        url:
          title: URL
          type: string
          format: uri
        date:
          title: Date
          type: string
          format: date
          nullable: true
      required:
        - title
        - url
```

# Create Async Chat Completion

> Creates an asynchronous chat completion job.

## OpenAPI

```yaml post /async/chat/completions
paths:
  path: /async/chat/completions
  method: post
  servers:
    - url: https://api.perplexity.ai
  request:
    security:
      - title: HTTPBearer
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
          cookie: {}
    parameters:
      path: {}
      query: {}
      header: {}
      cookie: {}
    body:
      application/json:
        schemaArray:
          - type: object
            properties:
              request:
                allOf:
                  - $ref: "#/components/schemas/ChatCompletionsRequest"
            required: true
            title: AsyncApiChatCompletionsRequest
            refIdentifier: "#/components/schemas/AsyncApiChatCompletionsRequest"
            requiredProperties:
              - request
        examples:
          example:
            value:
              request:
                model: sonar
                messages:
                  - role: system
                    content: Be precise and concise.
                  - role: user
                    content: How many stars are there in our galaxy?
                search_mode: web
                reasoning_effort: low
                max_tokens: 123
                temperature: 0.2
                top_p: 0.9
                search_domain_filter:
                  - <any>
                return_images: false
                return_related_questions: false
                search_recency_filter: <string>
                search_after_date_filter: <string>
                search_before_date_filter: <string>
                last_updated_after_filter: <string>
                last_updated_before_filter: <string>
                top_k: 0
                stream: false
                presence_penalty: 0
                frequency_penalty: 0
                response_format: {}
                disable_search: false
                enable_search_classifier: false
                web_search_options:
                  search_context_size: high
  response:
    "200":
      application/json:
        schemaArray:
          - type: object
            properties:
              id:
                allOf:
                  - title: ID
                    type: string
                    description: Unique identifier for the asynchronous job.
              model:
                allOf:
                  - title: Model
                    type: string
                    description: The model used for the request.
              created_at:
                allOf:
                  - title: Created At
                    type: integer
                    format: int64
                    description: Unix timestamp of when the job was created.
              started_at:
                allOf:
                  - title: Started At
                    type: integer
                    format: int64
                    nullable: true
                    description: Unix timestamp of when processing started.
              completed_at:
                allOf:
                  - title: Completed At
                    type: integer
                    format: int64
                    nullable: true
                    description: Unix timestamp of when processing completed.
              response:
                allOf:
                  - $ref: "#/components/schemas/ChatCompletionsResponseJson"
                    nullable: true
                    description: >-
                      The actual chat completion response, available when status
                      is COMPLETED.
              failed_at:
                allOf:
                  - title: Failed At
                    type: integer
                    format: int64
                    nullable: true
                    description: Unix timestamp of when processing failed.
              error_message:
                allOf:
                  - title: Error Message
                    type: string
                    nullable: true
                    description: Error message if the job failed.
              status:
                allOf:
                  - $ref: "#/components/schemas/AsyncProcessingStatus"
            title: AsyncApiChatCompletionsResponse
            refIdentifier: "#/components/schemas/AsyncApiChatCompletionsResponse"
            requiredProperties:
              - id
              - model
              - created_at
              - status
        examples:
          example:
            value:
              id: <string>
              model: <string>
              created_at: 123
              started_at: 123
              completed_at: 123
              response:
                id: <string>
                model: <string>
                created: 123
                usage:
                  prompt_tokens: 123
                  completion_tokens: 123
                  total_tokens: 123
                  search_context_size: <string>
                  citation_tokens: 123
                  num_search_queries: 123
                  reasoning_tokens: 123
                object: chat.completion
                choices:
                  - index: 123
                    finish_reason: stop
                    message:
                      content: <string>
                      role: system
                search_results:
                  - title: <string>
                    url: <string>
                    date: "2023-12-25"
              failed_at: 123
              error_message: <string>
              status: CREATED
        description: Successfully created async chat completion job.
  deprecated: false
  type: path
components:
  schemas:
    ChatCompletionsRequest:
      title: ChatCompletionsRequest
      required:
        - model
        - messages
      type: object
      properties:
        model:
          title: Model
          type: string
          enum:
            - sonar
            - sonar-pro
            - sonar-deep-research
            - sonar-reasoning
            - sonar-reasoning-pro
          description: >-
            The name of the model that will complete your prompt. Choose from
            our available Sonar models: sonar (lightweight search), sonar-pro
            (advanced search), sonar-deep-research (exhaustive research),
            sonar-reasoning (fast reasoning), or sonar-reasoning-pro (premier
            reasoning).
          example: sonar
          x-openai-compatible: true
        messages:
          title: Messages
          type: array
          description: A list of messages comprising the conversation so far.
          x-openai-compatible: true
          items:
            $ref: "#/components/schemas/ChatCompletionsMessage"
          example:
            - role: system
              content: Be precise and concise.
            - role: user
              content: How many stars are there in our galaxy?
        search_mode:
          title: Search Mode
          type: string
          enum:
            - academic
            - web
          default: web
          description: >-
            Controls the search mode used for the request. When set to
            'academic', results will prioritize scholarly sources like
            peer-reviewed papers and academic journals. More information about
            this
            [here](https://docs.perplexity.ai/guides/academic-filter-guide).
          x-openai-compatible: false
        reasoning_effort:
          title: Reasoning Effort
          type: string
          enum:
            - low
            - medium
            - high
          description: >-
            **Perplexity-Specific**: Controls how much computational effort the
            AI dedicates to each query for deep research models. 'low' provides
            faster, simpler answers with reduced token usage, 'medium' offers a
            balanced approach, and 'high' delivers deeper, more thorough
            responses with increased token usage. This parameter directly
            impacts the amount of reasoning tokens consumed. **WARNING: This
            parameter is ONLY applicable for sonar-deep-research.** Defaults to
            'medium' when used with sonar-deep-research.
        max_tokens:
          title: Max Tokens
          type: integer
          description: >-
            **OpenAI Compatible**: The maximum number of completion tokens
            returned by the API. Controls the length of the model's response. If
            the response would exceed this limit, it will be truncated. Higher
            values allow for longer responses but may increase processing time
            and costs.
        temperature:
          title: Temperature
          type: number
          default: 0.2
          description: >-
            The amount of randomness in the response, valued between 0 and 2.
            Lower values (e.g., 0.1) make the output more focused,
            deterministic, and less creative. Higher values (e.g., 1.5) make the
            output more random and creative. Use lower values for
            factual/information retrieval tasks and higher values for creative
            applications.
          minimum: 0
          maximum: 2
          exclusiveMaximum: true
          x-openai-compatible: true
        top_p:
          title: Top P
          type: number
          default: 0.9
          description: >-
            **OpenAI Compatible**: The nucleus sampling threshold, valued
            between 0 and 1. Controls the diversity of generated text by
            considering only the tokens whose cumulative probability exceeds the
            top_p value. Lower values (e.g., 0.5) make the output more focused
            and deterministic, while higher values (e.g., 0.95) allow for more
            diverse outputs. Often used as an alternative to temperature.
        search_domain_filter:
          title: Search Domain Filter
          type: array
          description: >-
            A list of domains to limit search results to. Currently limited to
            10 domains for Allowlisting and Denylisting. For Denylisting, add a
            `-` at the beginning of the domain string. More information about
            this
            [here](https://docs.perplexity.ai/guides/search-domain-filters).
          x-openai-compatible: false
        return_images:
          title: Return Images
          type: boolean
          default: false
          description: >-
            **Perplexity-Specific**: Determines whether search results should
            include images.
        return_related_questions:
          title: Return Related Questions
          type: boolean
          default: false
          description: >-
            **Perplexity-Specific**: Determines whether related questions should
            be returned.
        search_recency_filter:
          title: Recency Filter
          type: string
          description: >-
            **Perplexity-Specific**: Filters search results based on time (e.g.,
            'week', 'day').
        search_after_date_filter:
          title: Search After Date Filter
          type: string
          description: >-
            **Perplexity-Specific**: Filters search results to only include
            content published after this date. Format should be %m/%d/%Y (e.g.
            3/1/2025)
        search_before_date_filter:
          title: Search Before Date Filter
          type: string
          description: >-
            **Perplexity-Specific**: Filters search results to only include
            content published before this date. Format should be %m/%d/%Y (e.g.
            3/1/2025)
        last_updated_after_filter:
          title: Last Updated After Filter
          type: string
          description: >-
            **Perplexity-Specific**: Filters search results to only include
            content last updated after this date. Format should be %m/%d/%Y
            (e.g. 3/1/2025)
        last_updated_before_filter:
          title: Last Updated Before Filter
          type: string
          description: >-
            **Perplexity-Specific**: Filters search results to only include
            content last updated before this date. Format should be %m/%d/%Y
            (e.g. 3/1/2025)
        top_k:
          title: Top K
          type: number
          default: 0
          description: >-
            **OpenAI Compatible**: The number of tokens to keep for top-k
            filtering. Limits the model to consider only the k most likely next
            tokens at each step. Lower values (e.g., 10) make the output more
            focused and deterministic, while higher values allow for more
            diverse outputs. A value of 0 disables this filter. Often used in
            conjunction with top_p to control output randomness.
        stream:
          title: Streaming
          type: boolean
          default: false
          description: >-
            **OpenAI Compatible**: Determines whether to stream the response
            incrementally.
        presence_penalty:
          title: Presence Penalty
          type: number
          default: 0
          description: >-
            **OpenAI Compatible**: Positive values increase the likelihood of
            discussing new topics. Applies a penalty to tokens that have already
            appeared in the text, encouraging the model to talk about new
            concepts. Values typically range from 0 (no penalty) to 2.0 (strong
            penalty). Higher values reduce repetition but may lead to more
            off-topic text.
        frequency_penalty:
          title: Frequency Penalty
          type: number
          default: 0
          description: >-
            **OpenAI Compatible**: Decreases likelihood of repetition based on
            prior frequency. Applies a penalty to tokens based on how frequently
            they've appeared in the text so far. Values typically range from 0
            (no penalty) to 2.0 (strong penalty). Higher values (e.g., 1.5)
            reduce repetition of the same words and phrases. Useful for
            preventing the model from getting stuck in loops.
        response_format:
          title: Response Format
          type: object
          description: Enables structured JSON output formatting.
          x-openai-compatible: true
        disable_search:
          title: Disable Search
          type: boolean
          default: false
          description: >-
            **Perplexity-Specific**: When set to true, disables web search
            completely and the model will only use its training data to respond.
            This is useful when you want deterministic responses without
            external information. More information about this
            [here](https://docs.perplexity.ai/guides/search-control-guide#disabling-search-completely).
          x-openai-compatible: false
        enable_search_classifier:
          title: Enable Search Classifier
          type: boolean
          default: false
          description: >-
            **Perplexity-Specific**: Enables a classifier that decides if web
            search is needed based on your query. See more
            [here](https://docs.perplexity.ai/guides/search-control-guide#search-classifier).
          x-openai-compatible: false
        web_search_options:
          title: Web Search Options
          type: object
          description: >-
            **Perplexity-Specific**: Configuration for using web search in model
            responses.
          properties:
            search_context_size:
              title: Search Context Size
              type: string
              default: low
              enum:
                - low
                - medium
                - high
              description: >-
                Determines how much search context is retrieved for the model.
                Options are: `low` (minimizes context for cost savings but less
                comprehensive answers), `medium` (balanced approach suitable for
                most queries), and `high` (maximizes context for comprehensive
                answers but at higher cost).
            user_location:
              title: Location of the user.
              type: object
              description: >-
                To refine search results based on geography, you can specify an
                approximate user location.
              properties:
                latitude:
                  title: Latitude
                  type: number
                  description: The latitude of the user's location.
                longitude:
                  title: Longitude
                  type: number
                  description: The longitude of the user's location.
                country:
                  title: Country
                  type: string
                  description: The two letter ISO country code of the user's location.
          example:
            search_context_size: high
    ChatCompletionsMessage:
      title: Message
      type: object
      required:
        - content
        - role
      properties:
        content:
          title: Message Content
          oneOf:
            - type: string
              description: The text contents of the message.
            - type: array
              items:
                $ref: "#/components/schemas/ChatCompletionsMessageContentChunk"
              description: An array of content parts for multimodal messages.
          description: >-
            The contents of the message in this turn of conversation. Can be a
            string or an array of content parts.
        role:
          title: Role
          type: string
          enum:
            - system
            - user
            - assistant
          description: The role of the speaker in this conversation.
    ChatCompletionsMessageContentChunk:
      title: ChatCompletionsMessageContentChunk
      type: object
      properties:
        type:
          title: Content Part Type
          type: string
          enum:
            - text
            - image_url
          description: The type of the content part.
        text:
          title: Text Content
          type: string
          description: The text content of the part.
        image_url:
          title: Image URL Content
          type: object
          properties:
            url:
              title: Image URL
              type: string
              format: uri
              description: URL for the image (base64 encoded data URI or HTTPS).
          required:
            - url
          description: An object containing the URL of the image.
      required:
        - type
      description: Represents a part of a multimodal message content.
    ChatCompletionsResponseJson:
      title: ChatCompletionsResponseJson
      type: object
      properties:
        id:
          title: ID
          type: string
          description: A unique identifier for the chat completion.
        model:
          title: Model
          type: string
          description: The model that generated the response.
        created:
          title: Created Timestamp
          type: integer
          description: >-
            The Unix timestamp (in seconds) of when the chat completion was
            created.
        usage:
          $ref: "#/components/schemas/UsageInfo"
        object:
          title: Object Type
          type: string
          default: chat.completion
          description: The type of object, which is always `chat.completion`.
        choices:
          title: Choices
          type: array
          items:
            $ref: "#/components/schemas/ChatCompletionsChoice"
          description: >-
            A list of chat completion choices. Can be more than one if `n` is
            greater than 1.
        search_results:
          title: Search Results
          type: array
          items:
            $ref: "#/components/schemas/ApiPublicSearchResult"
          nullable: true
          description: A list of search results related to the response.
      required:
        - id
        - model
        - created
        - usage
        - object
        - choices
    UsageInfo:
      title: UsageInfo
      type: object
      properties:
        prompt_tokens:
          title: Prompt Tokens
          type: integer
        completion_tokens:
          title: Completion Tokens
          type: integer
        total_tokens:
          title: Total Tokens
          type: integer
        search_context_size:
          title: Search Context Size
          type: string
          nullable: true
        citation_tokens:
          title: Citation Tokens
          type: integer
          nullable: true
        num_search_queries:
          title: Number of Search Queries
          type: integer
          nullable: true
        reasoning_tokens:
          title: Reasoning Tokens
          type: integer
          nullable: true
      required:
        - prompt_tokens
        - completion_tokens
        - total_tokens
    ChatCompletionsChoice:
      title: ChatCompletionsChoice
      type: object
      properties:
        index:
          title: Index
          type: integer
        finish_reason:
          title: Finish Reason
          type: string
          enum:
            - stop
            - length
          nullable: true
        message:
          $ref: "#/components/schemas/ChatCompletionsMessage"
      required:
        - index
        - message
    ApiPublicSearchResult:
      title: ApiPublicSearchResult
      type: object
      properties:
        title:
          title: Title
          type: string
        url:
          title: URL
          type: string
          format: uri
        date:
          title: Date
          type: string
          format: date
          nullable: true
      required:
        - title
        - url
    AsyncProcessingStatus:
      title: AsyncProcessingStatus
      type: string
      enum:
        - CREATED
        - IN_PROGRESS
        - COMPLETED
        - FAILED
      description: The status of an asynchronous processing job.
```

# List Async Chat Completions

> Lists all asynchronous chat completion requests for the authenticated user.

## OpenAPI

```yaml get /async/chat/completions
paths:
  path: /async/chat/completions
  method: get
  servers:
    - url: https://api.perplexity.ai
  request:
    security:
      - title: HTTPBearer
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
          cookie: {}
    parameters:
      path: {}
      query:
        limit:
          schema:
            - type: integer
              required: false
              description: Maximum number of requests to return.
              default: 20
        next_token:
          schema:
            - type: string
              required: false
              description: >-
                Token for fetching the next page of results. Ensure this token
                is URL-encoded when passed as a query parameter.
      header: {}
      cookie: {}
    body: {}
  response:
    "200":
      application/json:
        schemaArray:
          - type: object
            properties:
              next_token:
                allOf:
                  - title: Next Token
                    type: string
                    nullable: true
                    description: Token for fetching the next page of results.
              requests:
                allOf:
                  - title: Requests
                    type: array
                    items:
                      $ref: >-
                        #/components/schemas/AsyncApiChatCompletionsResponseSummary
            title: ListAsyncApiChatCompletionsResponse
            refIdentifier: "#/components/schemas/ListAsyncApiChatCompletionsResponse"
            requiredProperties:
              - requests
        examples:
          example:
            value:
              next_token: <string>
              requests:
                - id: <string>
                  created_at: 123
                  started_at: 123
                  completed_at: 123
                  failed_at: 123
                  model: <string>
                  status: CREATED
        description: Successfully retrieved list of async chat completion requests.
  deprecated: false
  type: path
components:
  schemas:
    AsyncProcessingStatus:
      title: AsyncProcessingStatus
      type: string
      enum:
        - CREATED
        - IN_PROGRESS
        - COMPLETED
        - FAILED
      description: The status of an asynchronous processing job.
    AsyncApiChatCompletionsResponseSummary:
      title: AsyncApiChatCompletionsResponseSummary
      type: object
      properties:
        id:
          title: ID
          type: string
        created_at:
          title: Created At
          type: integer
          format: int64
          description: Unix timestamp of when the request was created.
        started_at:
          title: Started At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing started.
        completed_at:
          title: Completed At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing completed.
        failed_at:
          title: Failed At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing failed.
        model:
          title: Model
          type: string
        status:
          $ref: "#/components/schemas/AsyncProcessingStatus"
      required:
        - id
        - created_at
        - model
        - status
```

# List Async Chat Completions

> Lists all asynchronous chat completion requests for the authenticated user.

## OpenAPI

```yaml get /async/chat/completions
paths:
  path: /async/chat/completions
  method: get
  servers:
    - url: https://api.perplexity.ai
  request:
    security:
      - title: HTTPBearer
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
          cookie: {}
    parameters:
      path: {}
      query:
        limit:
          schema:
            - type: integer
              required: false
              description: Maximum number of requests to return.
              default: 20
        next_token:
          schema:
            - type: string
              required: false
              description: >-
                Token for fetching the next page of results. Ensure this token
                is URL-encoded when passed as a query parameter.
      header: {}
      cookie: {}
    body: {}
  response:
    "200":
      application/json:
        schemaArray:
          - type: object
            properties:
              next_token:
                allOf:
                  - title: Next Token
                    type: string
                    nullable: true
                    description: Token for fetching the next page of results.
              requests:
                allOf:
                  - title: Requests
                    type: array
                    items:
                      $ref: >-
                        #/components/schemas/AsyncApiChatCompletionsResponseSummary
            title: ListAsyncApiChatCompletionsResponse
            refIdentifier: "#/components/schemas/ListAsyncApiChatCompletionsResponse"
            requiredProperties:
              - requests
        examples:
          example:
            value:
              next_token: <string>
              requests:
                - id: <string>
                  created_at: 123
                  started_at: 123
                  completed_at: 123
                  failed_at: 123
                  model: <string>
                  status: CREATED
        description: Successfully retrieved list of async chat completion requests.
  deprecated: false
  type: path
components:
  schemas:
    AsyncProcessingStatus:
      title: AsyncProcessingStatus
      type: string
      enum:
        - CREATED
        - IN_PROGRESS
        - COMPLETED
        - FAILED
      description: The status of an asynchronous processing job.
    AsyncApiChatCompletionsResponseSummary:
      title: AsyncApiChatCompletionsResponseSummary
      type: object
      properties:
        id:
          title: ID
          type: string
        created_at:
          title: Created At
          type: integer
          format: int64
          description: Unix timestamp of when the request was created.
        started_at:
          title: Started At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing started.
        completed_at:
          title: Completed At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing completed.
        failed_at:
          title: Failed At
          type: integer
          format: int64
          nullable: true
          description: Unix timestamp of when processing failed.
        model:
          title: Model
          type: string
        status:
          $ref: "#/components/schemas/AsyncProcessingStatus"
      required:
        - id
        - created_at
        - model
        - status
```
