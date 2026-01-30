### POST /text/{prompt}

Source: https://enter.pollinations.ai/api/docs/index

Generates text based on a given text prompt using various AI models. Supports authentication via header or query parameter.

```APIDOC
## POST /text/{prompt}

### Description
Generates text from text prompts using specified AI models. Authentication is required.

### Method
POST

### Endpoint
/text/{prompt}

### Parameters
#### Path Parameters
- **prompt** (string) - Required - The text prompt for generation. Example: "Write a haiku about coding"

#### Query Parameters
- **model** (string, enum) - Optional - The text model to use for generation. Defaults to "openai". Allowed values: "openai", "openai-fast", "openai-large", "qwen-coder", "mistral", and more.
- **seed** (integer) - Optional - A random seed for reproducible results. Use -1 for random. Min: -1, Max: 9007199254740991, Default: 0.
- **system** (string) - Optional - A system prompt to set context or behavior for the model.
- **json** (boolean) - Optional - If true, returns the response in JSON format. Defaults to false.
- **temperature** (number) - Optional - Controls creativity, ranging from 0.0 (strict) to 2.0 (creative).
- **stream** (boolean) - Optional - If true, streams the response in real-time chunks. Defaults to false.

#### Authentication
Include your API key either:
* In the `Authorization` header as a Bearer token: `Authorization: Bearer YOUR_API_KEY`
* As a query parameter: `?key=YOUR_API_KEY`
API keys can be created from your dashboard at enter.pollinations.ai.

### Request Example
```shell
curl -X POST "https://gen.pollinations.ai/text/Write a haiku about coding?model=openai&seed=0&system=&json=false&temperature=1&stream=false" \
  --header "Authorization: Bearer YOUR_SECRET_TOKEN"
```

### Response
#### Success Response (200)
- **Generated text response** (string or object) - The generated text or a JSON object if `json` is true.

#### Response Example
```json
"Haiku text generation example"
```

#### Error Responses
- **400 Bad Request**: Something was wrong with the input data.
- **401 Unauthorized**: Authentication is required.
- **500 Internal Server Error**: An error occurred on the server.
```

--------------------------------

### User Authentication and API Usage with JavaScript

Source: https://enter.pollinations.ai/api/docs/index

This JavaScript code snippet illustrates the 'Bring Your Own Pollen' (BYOP) flow. It first redirects the user to the Pollinations AI authorization URL. After the user grants access, their API key is captured from the redirect URL fragment. Finally, it shows how to use this API key to make a request to the API for chat completions.

```javascript
// 1. Send user to auth
window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${encodeURIComponent(location.href)}`;

// 2. Grab key from URL after redirect
const apiKey = new URLSearchParams(location.hash.slice(1)).get('api_key');

// 3. Use their pollen
fetch('https://gen.pollinations.ai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: 'yo' }] })
});

```

--------------------------------

### POST /v1/chat/completions

Source: https://enter.pollinations.ai/api/docs/index

OpenAI-compatible chat completions endpoint for generating text-based responses. It supports various parameters for controlling model behavior, content generation, and output format.

```APIDOC
## POST /v1/chat/completions

### Description
This endpoint provides OpenAI-compatible chat completions. You can use it to generate text-based responses by providing a conversation history and various parameters to control the AI's output.

### Method
POST

### Endpoint
/v1/chat/completions

### Parameters
#### Query Parameters
None

#### Headers
- **Authorization** (string) - Required - Bearer token for authentication. Example: `Bearer YOUR_API_KEY`
- **Content-Type** (string) - Required - `application/json`

#### Request Body
- **messages** (array[object]) - Required - An array of message objects representing the conversation history.
  - **role** (string) - Required - The role of the message sender ('system', 'user', or 'assistant').
  - **content** (string) - Required - The content of the message.
  - **name** (string) - Optional - The name of the author of the message.
  - **cache_control** (object) - Optional - Cache control settings for the message.
    - **type** (string) - Required - Type of cache control (e.g., 'ephemeral').
- **audio** (object) - Optional - Audio-related parameters if audio output is desired.
  - **voice** (string) - Optional - The voice to use for audio generation.
  - **format** (string) - Optional - The format of the audio output.
- **frequency_penalty** (number) - Optional - Controls the frequency penalty. Range: -2 to 2. Default: 0.
- **function_call** (string) - Optional - Specifies how function calls should be handled. Enum: 'none', 'auto'.
- **functions** (array[object]) - Optional - An array of function definitions that the model may call.
- **logit_bias** (object) - Optional - A map specifying bias to be applied to the logits of particular token choices. Nullable.
- **logprobs** (boolean) - Optional - Whether to return log probabilities of the output tokens. Default: false. Nullable.
- **max_tokens** (integer) - Optional - The maximum number of tokens to generate in the completion. Minimum: 0. Nullable.
- **modalities** (array[string]) - Optional - Specifies the modalities to be used (e.g., 'text', 'audio').
- **model** (string) - Optional - The AI model to use for text generation. Default: 'openai'. See /v1/models for a full list.
- **parallel_tool_calls** (boolean) - Optional - Whether to allow parallel tool calls. Default: true.
- **presence_penalty** (number) - Optional - Controls the presence penalty. Range: -2 to 2. Default: 0. Nullable.

### Request Example
```json
{
  "messages": [
    {
      "content": "",
      "role": "system",
      "name": "",
      "cache_control": {
        "type": "ephemeral"
      }
    }
  ],
  "model": "openai",
  "modalities": [
    "text"
  ],
  "audio": {
    "voice": "alloy",
    "format": "wav"
  },
  "frequency_penalty": 0,
  "repetition_penalty": 0,
  "logit_bias": null,
  "logprobs": false,
  "top_logprobs": 0,
  "max_tokens": 0,
  "presence_penalty": 0,
  "response_format": {
    "type": "text"
  },
  "seed": -1,
  "stop": "",
  "stream": false,
  "stream_options": {
    "include_usage": true
  },
  "thinking": {
    "type": "disabled",
    "budget_tokens": 1
  },
  "reasoning_effort": "none",
  "thinking_budget": 0,
  "temperature": 1,
  "top_p": 1,
  "tools": [
    {
      "type": "function",
      "function": {
        "description": "",
        "name": "",
        "parameters": {
          "propertyName*": "anything"
        },
        "strict": false
      }
    }
  ],
  "tool_choice": "none",
  "parallel_tool_calls": true,
  "user": "",
  "function_call": "none",
  "functions": [
    {
      "description": "",
      "name": "",
      "parameters": {
        "propertyName*": "anything"
      }
    }
  ]
}
```

### Response
#### Success Response (200)
- **id** (string) - Unique identifier for the completion.
- **choices** (array[object]) - An array of completion choices.
  - **finish_reason** (string) - The reason the model stopped generating tokens (e.g., 'stop', 'length').
  - **index** (integer) - The index of the choice in the array.
  - **message** (object) - The message object representing the AI's response.
    - **content** (string) - The text content of the message.
    - **tool_calls** (array[object]) - An array of tool calls made by the model.
    - **role** (string) - The role of the message sender ('assistant').
    - **function_call** (object) - Information about a function call made by the model.
    - **content_blocks** (array[object]) - Blocks of content, potentially including text and other types.
    - **audio** (object) - Audio data if audio was generated.
    - **reasoning_content** (string) - Content related to the model's reasoning process.
  - **logprobs** (object) - Log probabilities of the generated tokens (if requested).

#### Error Responses
- **400**: Bad Request - Something was wrong with the input data.
- **401**: Unauthorized - Authentication is required.
- **500**: Internal Server Error - An error occurred on the server.
```

--------------------------------

### Bring Your Own Pollen (BYOP) Authentication Flow

Source: https://enter.pollinations.ai/api/docs/index

Implement a client-side authentication flow where users connect with Pollinations.ai to generate a temporary API key, allowing your application to use their own usage credits without backend infrastructure.

```APIDOC
## Bring Your Own Pollen (BYOP) Authentication Flow

### Description
Implement a client-side authentication flow where users connect with Pollinations.ai to generate a temporary API key, allowing your application to use their own usage credits without backend infrastructure.

### URLs
Assume your app is hosted at `https://myapp.com`.

**Auth Link**: Redirect users to this URL to initiate the connection:
```
https://enter.pollinations.ai/authorize?redirect_url=https://myapp.com
```

**Redirect Back**: After authorization, users will be redirected back to your `redirect_url` with the API key in the URL fragment:
```
https://myapp.com#api_key=sk_abc123xyz
```

### Code Example (JavaScript)
1. **Send user to auth**: 
   ```javascript
   window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${encodeURIComponent(location.href)}`;
   ```

2. **Grab key from URL after redirect**: 
   ```javascript
   const apiKey = new URLSearchParams(window.location.hash.slice(1)).get('api_key');
   ```

3. **Use their pollen (example with chat completions API)**: 
   ```javascript
   fetch('https://gen.pollinations.ai/v1/chat/completions', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
     body: JSON.stringify({ model: 'openai', messages: [{ role: 'user', content: 'yo' }] })
   });
   ```

### Notes
- API keys generated through this flow expire in 30 days.
- Users can revoke their keys from their dashboard at any time.
- This flow requires no backend infrastructure on your part.
```

--------------------------------

### Send Chat Completion Request using cURL

Source: https://enter.pollinations.ai/api/docs/index

This snippet demonstrates how to send a POST request to the /v1/chat/completions endpoint using cURL. It includes setting the Content-Type and Authorization headers, and providing a JSON payload with messages, model, and other parameters. Ensure you replace 'YOUR_SECRET_TOKEN' with your actual API key.

```Shell
curl https://gen.pollinations.ai/v1/chat/completions \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "messages": [
    {
      "content": "",
      "role": "system",
      "name": "",
      "cache_control": {
        "type": "ephemeral"
      }
    }
  ],
  "model": "openai",
  "modalities": [
    "text"
  ],
  "audio": {
    "voice": "alloy",
    "format": "wav"
  },
  "frequency_penalty": 0,
  "repetition_penalty": 0,
  "logit_bias": null,
  "logprobs": false,
  "top_logprobs": 0,
  "max_tokens": 0,
  "presence_penalty": 0,
  "response_format": {
    "type": "text"
  },
  "seed": -1,
  "stop": "",
  "stream": false,
  "stream_options": {
    "include_usage": true
  },
  "thinking": {
    "type": "disabled",
    "budget_tokens": 1
  },
  "reasoning_effort": "none",
  "thinking_budget": 0,
  "temperature": 1,
  "top_p": 1,
  "tools": [
    {
      "type": "function",
      "function": {
        "description": "",
        "name": "",
        "parameters": {
          "propertyName*": "anything"
        },
        "strict": false
      }
    }
  ],
  "tool_choice": "none",
  "parallel_tool_calls": true,
  "user": "",
  "function_call": "none",
  "functions": [
    {
      "description": "",
      "name": "",
      "parameters": {
        "propertyName*": "anything"
      }
    }
  ]
}'
```

--------------------------------

### Text Generation / Chat Completions

Source: https://enter.pollinations.ai/api/docs/index

Engage in conversational AI for text generation, including support for vision input and streaming responses.

```APIDOC
## POST /v1/chat/completions

### Description
Provides access to chat-based AI models for text generation. Supports multi-modal inputs (text and images) and streaming responses.

### Method
POST

### Endpoint
`/v1/chat/completions`

### Parameters
#### Request Body
- **model** (string) - Required - The AI model to use (e.g., `openai`, `gemini`).
- **messages** (array) - Required - An array of message objects representing the conversation history. Each object should have a `role` (`user` or `assistant`) and `content`.
  - **content** (string | array) - The message content. Can be a string for text or an array for multi-modal input.
    - **type** (string) - Required if content is an array - Type of content (`text` or `image_url`).
    - **text** (string) - Required if type is `text` - The text content.
    - **image_url** (object) - Required if type is `image_url` - Object containing the image URL.
      - **url** (string) - Required - The URL of the image.
- **stream** (boolean) - Optional - If true, the response will be streamed.

### Request Example (Text)
```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Hello"}]}'
```

### Request Example (Vision)
```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": [{"type": "text", "text": "Describe this image"}, {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}]}]}'
```

### Request Example (Streaming)
```bash
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Write a poem"}], "stream": true}' \
  --no-buffer
```

### Response
#### Success Response (200)
- **id** (string) - The ID of the response.
- **object** (string) - The type of object returned.
- **created** (integer) - Timestamp of creation.
- **model** (string) - The model used for the response.
- **choices** (array) - An array of response choices.
  - **index** (integer) - The index of the choice.
  - **message** (object) - The message content.
    - **role** (string) - The role of the message sender.
    - **content** (string) - The message content.
  - **finish_reason** (string) - The reason for finishing the response.
- **usage** (object) - Usage statistics.
  - **prompt_tokens** (integer) - Number of tokens in the prompt.
  - **completion_tokens** (integer) - Number of tokens in the completion.
  - **total_tokens** (integer) - Total tokens used.

*Note: If `stream` is true, the response will be a stream of Server-Sent Events.* 

#### Response Example (Non-streaming)
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "openai",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "Hello there! How can I help you today?"},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
}
```
```

--------------------------------

### Image Generation

Source: https://enter.pollinations.ai/api/docs/index

Generate an image based on a text prompt using specified models.

```APIDOC
## POST /image/{prompt}

### Description
Generates an image based on a text prompt. You can specify the model to use.

### Method
GET

### Endpoint
`/image/{prompt}`

### Parameters
#### Path Parameters
- **prompt** (string) - Required - The text description of the image to generate.

#### Query Parameters
- **model** (string) - Optional - The AI model to use for image generation (e.g., `flux`).

### Request Example
```bash
curl 'https://gen.pollinations.ai/image/a%20cat?model=flux' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Response
#### Success Response (200)
- **image_url** (string) - The URL of the generated image.

#### Response Example
```json
{
  "image_url": "https://gen.pollinations.ai/image/a%20cat?model=flux"
}
```
```

=== COMPLETE CONTENT === This response contains all available snippets from this library. No additional content exists. Do not make further requests.

--------------------------------

Part 2/2