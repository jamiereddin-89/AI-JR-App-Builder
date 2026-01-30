\### Get Available Image Models with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of retrieving a list of available image generation models from the pollinations.ai API using cURL. This endpoint requires an authorization header with a secret token.



```shell

curl https://gen.pollinations.ai/image/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'



```



--------------------------------



\### Get Available Text Models with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of retrieving a list of available text generation models from the pollinations.ai API using cURL. This endpoint requires an authorization header with a secret token.



```shell

curl https://gen.pollinations.ai/v1/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'



```



--------------------------------



\### Generate Image with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of generating an image using the pollinations.ai API via cURL. Requires an API key and specifies the prompt and model.



```shell

curl 'https://gen.pollinations.ai/image/a%20cat?model=flux' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY'\\



```



--------------------------------



\### Generate Image/Video from Text Prompt using cURL



Source: https://enter.pollinations.ai/api/docs/index



This example demonstrates how to generate an image or video using the Pollinations AI API via a cURL command. It includes various parameters for customization such as model, dimensions, seed, and negative prompts. Authentication is handled via an Authorization header.



```shell

curl 'https://gen.pollinations.ai/image/a beautiful sunset over mountains?model=zimage\&width=1024\&height=1024\&seed=0\&enhance=false\&negative\_prompt=worst%20quality%2C%20blurry\&safe=false\&quality=medium\&image=\&transparent=false\&duration=1\&aspectRatio=\&audio=false' \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



--------------------------------



\### Generate Text with API Key (Shell)



Source: https://enter.pollinations.ai/api/docs/index



Example of generating text using the Pollinations AI API via a shell command. It demonstrates how to include the API key in the Authorization header and pass various parameters like the prompt, model, seed, and temperature. Ensure you replace 'YOUR\_SECRET\_TOKEN' with your actual API key.



```shell

curl 'https://gen.pollinations.ai/text/Write a haiku about coding?model=openai\&seed=0\&system=\&json=false\&temperature=1\&stream=false' \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



--------------------------------



\### Simple Text Endpoint with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of accessing a simple text endpoint on the pollinations.ai API using cURL. This method uses a query parameter for the API key.



```shell

curl 'https://gen.pollinations.ai/text/hello?key=YOUR\_API\_KEY'



```



--------------------------------



\### Generate Text with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of generating text using the chat completions endpoint of the pollinations.ai API via cURL. Requires an API key, specifies the model, and provides the user's message.



```shell

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": "Hello"}]}'



```



--------------------------------



\### Simple Text Endpoint



Source: https://enter.pollinations.ai/api/docs/index



A simple endpoint to get a "hello" response, useful for quick checks.



```APIDOC

\## GET /text/hello



\### Description

This is a simple endpoint that returns a "hello" message. It's useful for basic connectivity tests.



\### Method

GET



\### Endpoint

`/text/hello`



\### Parameters

\#### Query Parameters

\- \*\*key\*\* (string) - Required - Your API key.



\### Request Example

```bash

curl 'https://gen.pollinations.ai/text/hello?key=YOUR\_API\_KEY'

```



\### Response

\#### Success Response (200)

\- \*\*message\*\* (string) - A greeting message.



\#### Response Example

```json

{

&nbsp; "message": "Hello from Pollinations.ai!"

}

```

```



--------------------------------



\### GET /text/models



Source: https://enter.pollinations.ai/api/docs/index



Retrieves a list of available text generation models. If an API key with model restrictions is provided, only the allowed models will be returned.



```APIDOC

\## GET /text/models



\### Description

Get a list of available text generation models with pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.



\### Method

GET



\### Endpoint

/text/models



\### Parameters

\#### Query Parameters

\- \*\*api\_key\*\* (string) - Optional - Your API key for authentication and model restriction.



\### Request Example

```shell

curl https://gen.pollinations.ai/text/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



\### Response

\#### Success Response (200)

\- \*\*name\*\* (string) - The name of the model.

\- \*\*aliases\*\* (array\[string]) - A list of alternative names for the model.

\- \*\*pricing\*\* (object) - Pricing information for the model.

&nbsp; - \*\*propertyName\*\*\* (number) - The cost per unit.

&nbsp; - \*\*currency\*\* (string) - The currency used for pricing (e.g., "pollen").

\- \*\*description\*\* (string) - A brief description of the model's capabilities.

\- \*\*input\_modalities\*\* (array\[string]) - The types of input the model accepts.

\- \*\*output\_modalities\*\* (array\[string]) - The types of output the model produces.

\- \*\*tools\*\* (boolean) - Indicates if the model supports tools.

\- \*\*reasoning\*\* (boolean) - Indicates if the model has reasoning capabilities.

\- \*\*context\_window\*\* (number) - The maximum context window size for the model.

\- \*\*voices\*\* (array\[string]) - A list of supported voices for the model (if applicable).

\- \*\*is\_specialized\*\* (boolean) - Indicates if the model is specialized.



\#### Response Example

```json

\[

&nbsp; {

&nbsp;   "name": "string",

&nbsp;   "aliases": \[

&nbsp;     "string"

&nbsp;   ],

&nbsp;   "pricing": {

&nbsp;     "propertyName\*": 1,

&nbsp;     "currency": "pollen"

&nbsp;   },

&nbsp;   "description": "string",

&nbsp;   "input\_modalities": \[

&nbsp;     "string"

&nbsp;   ],

&nbsp;   "output\_modalities": \[

&nbsp;     "string"

&nbsp;   ],

&nbsp;   "tools": true,

&nbsp;   "reasoning": true,

&nbsp;   "context\_window": 1,

&nbsp;   "voices": \[

&nbsp;     "string"

&nbsp;   ],

&nbsp;   "is\_specialized": true

&nbsp; }

]

```



\#### Error Response (500)

\- \*\*message\*\* (string) - An error message indicating a server-side issue.

```



--------------------------------



\### Vision (Image Input) with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of using the vision capabilities of the pollinations.ai API via cURL. This allows for image input along with text prompts for analysis. Requires an API key and specifies the model and message content including image URL.



```shell

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": \[{"type": "text", "text": "Describe this image"}, {"type": "image\_url", "image\_url": {"url": "https://example.com/image.jpg"}}]}]}'



```



--------------------------------



\### Get Text Models List (Shell cURL)



Source: https://enter.pollinations.ai/api/docs/index



This snippet demonstrates how to retrieve a list of available text generation models using cURL. It requires an API key for authentication. The response is in JSON format and includes details about each model's pricing, capabilities, and metadata.



```shell

curl https://gen.pollinations.ai/text/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



--------------------------------



\### Streaming Response with cURL



Source: https://enter.pollinations.ai/api/docs/index



Example of enabling streaming responses from the chat completions endpoint of the pollinations.ai API using cURL. This is useful for real-time generation. Requires an API key and sets the 'stream' parameter to true.



```shell

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": "Write a poem"}], "stream": true}' \\

&nbsp; --no-buffer



```



--------------------------------



\### POST /image/{prompt}



Source: https://enter.pollinations.ai/api/docs/index



Generate an image or video from a text prompt. Supports various models for both image and video generation, with options for customization like size, seed, and negative prompts. Authentication can be done via Authorization header or a query parameter.



```APIDOC

\## POST /image/{prompt}



\### Description

Generate an image or video from a text prompt. Supports various models for both image and video generation, with options for customization like size, seed, and negative prompts. Authentication can be done via Authorization header or a query parameter.



\### Method

POST



\### Endpoint

`/image/{prompt}`



\### Parameters

\#### Path Parameters

\- \*\*prompt\*\* (string) - Required - Text description of the image or video to generate. Example: `a beautiful sunset over mountains`



\#### Query Parameters

\- \*\*model\*\* (string, enum) - Optional - AI model to use. Image models: `flux` (default), `turbo`, `gptimage`, `kontext`, `seedream`, `nanobanana`, `nanobanana-pro`. Video models: `veo`, `seedance`. Example: `zimage`

\- \*\*width\*\* (integer) - Optional - Image width in pixels. Default: `1024`

\- \*\*height\*\* (integer) - Optional - Image height in pixels. Default: `1024`

\- \*\*seed\*\* (integer) - Optional - Random seed for reproducible results. Use -1 for random. Default: `0`

\- \*\*enhance\*\* (boolean) - Optional - Let AI improve your prompt for better results. Default: `false`

\- \*\*negative\_prompt\*\* (string) - Optional - What to avoid in the generated image. Default: `worst quality, blurry`

\- \*\*safe\*\* (boolean) - Optional - Enable safety content filters. Default: `false`

\- \*\*quality\*\* (string, enum) - Optional - Image quality level (gptimage only). Options: `low`, `medium`, `high`, `hd`. Default: `medium`

\- \*\*image\*\* (string) - Optional - Reference image URL(s). Comma/pipe separated for multiple. For veo: `image\[0]=first frame, image\[1]=last frame` (interpolation).

\- \*\*transparent\*\* (boolean) - Optional - Generate with transparent background (gptimage only). Default: `false`

\- \*\*duration\*\* (integer) - Optional - Video duration in seconds (video models only). `veo`: 4, 6, or 8. `seedance`: 2-10. Default is not specified.

\- \*\*aspectRatio\*\* (string) - Optional - Video aspect ratio: `16:9` or `9:16` (veo, seedance).

\- \*\*audio\*\* (boolean) - Optional - Enable audio generation for video (veo only). Default: `false`

\- \*\*key\*\* (string) - Optional - Your API key. Alternatively, use the `Authorization` header.



\### Request Example

```bash

curl 'https://gen.pollinations.ai/image/a%20beautiful%20sunset%20over%20mountains?model=zimage\&width=1024\&height=1024\&seed=0\&enhance=false\&negative\_prompt=worst%20quality%2C%20blurry\&safe=false\&quality=medium\&image=\&transparent=false\&duration=1\&aspectRatio=\&audio=false' \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



\### Response

\#### Success Response (200)

\- \*\*Image/Video Data\*\* (binary) - The generated image or video content.



\#### Response Example

(Binary data representing the image or video)



\#### Error Responses

\- \*\*400 Bad Request\*\*: Something was wrong with the input data.

\- \*\*401 Unauthorized\*\*: Authentication failed. Provide a valid API key.

\- \*\*500 Internal Server Error\*\*: An error occurred on the server.

```



--------------------------------



\### Model Discovery API



Source: https://enter.pollinations.ai/api/docs/index



Retrieve lists of available text and image generation models.



```APIDOC

\## Model Discovery Endpoints



\### GET /v1/models



\#### Description

Get a list of available text generation models (OpenAI-compatible). If an API key with model restrictions is provided, only allowed models are returned.



\#### Method

GET



\#### Endpoint

`/v1/models`



\#### Parameters

No parameters for this endpoint.



\#### Request Example

```bash

curl https://gen.pollinations.ai/v1/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



\#### Response

\##### Success Response (200)

\- \*\*object\*\* (string) - The type of object returned ('list').

\- \*\*data\*\* (array) - An array of model objects.

&nbsp; - \*\*id\*\* (string) - The model's unique identifier.

&nbsp; - \*\*object\*\* (string) - The type of object ('model').

&nbsp; - \*\*created\*\* (integer) - Timestamp of model creation.



\##### Response Example

```json

{

&nbsp; "object": "list",

&nbsp; "data": \[

&nbsp;   {

&nbsp;     "id": "gpt-3.5-turbo",

&nbsp;     "object": "model",

&nbsp;     "created": 1677610602

&nbsp;   }

&nbsp; ]

}

```



\### GET /image/models



\#### Description

Get a list of available image generation models with their pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.



\#### Method

GET



\#### Endpoint

`/image/models`



\#### Parameters

No parameters for this endpoint.



\#### Request Example

```bash

curl https://gen.pollinations.ai/image/models \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN'

```



\#### Response

\##### Success Response (200)

\- This endpoint returns an array of image model objects.

&nbsp; - \*\*name\*\* (string) - The model's name.

&nbsp; - \*\*aliases\*\* (array) - List of alternative names for the model.

&nbsp; - \*\*pricing\*\* (object) - Pricing details for the model.

&nbsp;   - \*\*propertyName\*\*\* (number) - Cost per unit (e.g., per image).

&nbsp;   - \*\*currency\*\* (string) - The currency used for pricing ('pollen').

&nbsp; - \*\*description\*\* (string) - A description of the model's capabilities.

&nbsp; - \*\*input\_modalities\*\* (array) - List of input types the model accepts.

&nbsp; - \*\*output\_modalities\*\* (array) - List of output types the model produces.

&nbsp; - \*\*tools\*\* (boolean) - Indicates if the model supports tools.

&nbsp; - \*\*reasoning\*\* (boolean) - Indicates if the model supports reasoning.

&nbsp; - \*\*context\_window\*\* (integer) - The model's context window size.

&nbsp; - \*\*voices\*\* (array) - List of available voices (if applicable).

&nbsp; - \*\*is\_specialized\*\* (boolean) - Indicates if the model is specialized.



\##### Response Example

```json

\[

&nbsp; {

&nbsp;   "name": "dall-e-3",

&nbsp;   "aliases": \["dalle3"],

&nbsp;   "pricing": {"image": 100, "currency": "pollen"},

&nbsp;   "description": "Generates highly detailed images from text descriptions.",

&nbsp;   "input\_modalities": \["text"],

&nbsp;   "output\_modalities": \["image"],

&nbsp;   "tools": false,

&nbsp;   "reasoning": false,

&nbsp;   "context\_window": 4096,

&nbsp;   "voices": \[],

&nbsp;   "is\_specialized": false

&nbsp; }

]

```

```



--------------------------------



\### POST /text/{prompt}



Source: https://enter.pollinations.ai/api/docs/index



Generates text based on a given text prompt using various AI models. Supports authentication via header or query parameter.



```APIDOC

\## POST /text/{prompt}



\### Description

Generates text from text prompts using specified AI models. Authentication is required.



\### Method

POST



\### Endpoint

/text/{prompt}



\### Parameters

\#### Path Parameters

\- \*\*prompt\*\* (string) - Required - The text prompt for generation. Example: "Write a haiku about coding"



\#### Query Parameters

\- \*\*model\*\* (string, enum) - Optional - The text model to use for generation. Defaults to "openai". Allowed values: "openai", "openai-fast", "openai-large", "qwen-coder", "mistral", and more.

\- \*\*seed\*\* (integer) - Optional - A random seed for reproducible results. Use -1 for random. Min: -1, Max: 9007199254740991, Default: 0.

\- \*\*system\*\* (string) - Optional - A system prompt to set context or behavior for the model.

\- \*\*json\*\* (boolean) - Optional - If true, returns the response in JSON format. Defaults to false.

\- \*\*temperature\*\* (number) - Optional - Controls creativity, ranging from 0.0 (strict) to 2.0 (creative).

\- \*\*stream\*\* (boolean) - Optional - If true, streams the response in real-time chunks. Defaults to false.



\#### Authentication

Include your API key either:

\* In the `Authorization` header as a Bearer token: `Authorization: Bearer YOUR\_API\_KEY`

\* As a query parameter: `?key=YOUR\_API\_KEY`

API keys can be created from your dashboard at enter.pollinations.ai.



\### Request Example

```shell

curl -X POST "https://gen.pollinations.ai/text/Write a haiku about coding?model=openai\&seed=0\&system=\&json=false\&temperature=1\&stream=false" \\

&nbsp; --header "Authorization: Bearer YOUR\_SECRET\_TOKEN"

```



\### Response

\#### Success Response (200)

\- \*\*Generated text response\*\* (string or object) - The generated text or a JSON object if `json` is true.



\#### Response Example

```json

"Haiku text generation example"

```



\#### Error Responses

\- \*\*400 Bad Request\*\*: Something was wrong with the input data.

\- \*\*401 Unauthorized\*\*: Authentication is required.

\- \*\*500 Internal Server Error\*\*: An error occurred on the server.

```



--------------------------------



\### User Authentication and API Usage with JavaScript



Source: https://enter.pollinations.ai/api/docs/index



This JavaScript code snippet illustrates the 'Bring Your Own Pollen' (BYOP) flow. It first redirects the user to the Pollinations AI authorization URL. After the user grants access, their API key is captured from the redirect URL fragment. Finally, it shows how to use this API key to make a request to the API for chat completions.



```javascript

// 1. Send user to auth

window.location.href = `https://enter.pollinations.ai/authorize?redirect\_url=${encodeURIComponent(location.href)}`;



// 2. Grab key from URL after redirect

const apiKey = new URLSearchParams(location.hash.slice(1)).get('api\_key');



// 3. Use their pollen

fetch('https://gen.pollinations.ai/v1/chat/completions', {

&nbsp; method: 'POST',

&nbsp; headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },

&nbsp; body: JSON.stringify({ model: 'openai', messages: \[{ role: 'user', content: 'yo' }] })

});



```



--------------------------------



\### POST /v1/chat/completions



Source: https://enter.pollinations.ai/api/docs/index



OpenAI-compatible chat completions endpoint for generating text-based responses. It supports various parameters for controlling model behavior, content generation, and output format.



```APIDOC

\## POST /v1/chat/completions



\### Description

This endpoint provides OpenAI-compatible chat completions. You can use it to generate text-based responses by providing a conversation history and various parameters to control the AI's output.



\### Method

POST



\### Endpoint

/v1/chat/completions



\### Parameters

\#### Query Parameters

None



\#### Headers

\- \*\*Authorization\*\* (string) - Required - Bearer token for authentication. Example: `Bearer YOUR\_API\_KEY`

\- \*\*Content-Type\*\* (string) - Required - `application/json`



\#### Request Body

\- \*\*messages\*\* (array\[object]) - Required - An array of message objects representing the conversation history.

&nbsp; - \*\*role\*\* (string) - Required - The role of the message sender ('system', 'user', or 'assistant').

&nbsp; - \*\*content\*\* (string) - Required - The content of the message.

&nbsp; - \*\*name\*\* (string) - Optional - The name of the author of the message.

&nbsp; - \*\*cache\_control\*\* (object) - Optional - Cache control settings for the message.

&nbsp;   - \*\*type\*\* (string) - Required - Type of cache control (e.g., 'ephemeral').

\- \*\*audio\*\* (object) - Optional - Audio-related parameters if audio output is desired.

&nbsp; - \*\*voice\*\* (string) - Optional - The voice to use for audio generation.

&nbsp; - \*\*format\*\* (string) - Optional - The format of the audio output.

\- \*\*frequency\_penalty\*\* (number) - Optional - Controls the frequency penalty. Range: -2 to 2. Default: 0.

\- \*\*function\_call\*\* (string) - Optional - Specifies how function calls should be handled. Enum: 'none', 'auto'.

\- \*\*functions\*\* (array\[object]) - Optional - An array of function definitions that the model may call.

\- \*\*logit\_bias\*\* (object) - Optional - A map specifying bias to be applied to the logits of particular token choices. Nullable.

\- \*\*logprobs\*\* (boolean) - Optional - Whether to return log probabilities of the output tokens. Default: false. Nullable.

\- \*\*max\_tokens\*\* (integer) - Optional - The maximum number of tokens to generate in the completion. Minimum: 0. Nullable.

\- \*\*modalities\*\* (array\[string]) - Optional - Specifies the modalities to be used (e.g., 'text', 'audio').

\- \*\*model\*\* (string) - Optional - The AI model to use for text generation. Default: 'openai'. See /v1/models for a full list.

\- \*\*parallel\_tool\_calls\*\* (boolean) - Optional - Whether to allow parallel tool calls. Default: true.

\- \*\*presence\_penalty\*\* (number) - Optional - Controls the presence penalty. Range: -2 to 2. Default: 0. Nullable.



\### Request Example

```json

{

&nbsp; "messages": \[

&nbsp;   {

&nbsp;     "content": "",

&nbsp;     "role": "system",

&nbsp;     "name": "",

&nbsp;     "cache\_control": {

&nbsp;       "type": "ephemeral"

&nbsp;     }

&nbsp;   }

&nbsp; ],

&nbsp; "model": "openai",

&nbsp; "modalities": \[

&nbsp;   "text"

&nbsp; ],

&nbsp; "audio": {

&nbsp;   "voice": "alloy",

&nbsp;   "format": "wav"

&nbsp; },

&nbsp; "frequency\_penalty": 0,

&nbsp; "repetition\_penalty": 0,

&nbsp; "logit\_bias": null,

&nbsp; "logprobs": false,

&nbsp; "top\_logprobs": 0,

&nbsp; "max\_tokens": 0,

&nbsp; "presence\_penalty": 0,

&nbsp; "response\_format": {

&nbsp;   "type": "text"

&nbsp; },

&nbsp; "seed": -1,

&nbsp; "stop": "",

&nbsp; "stream": false,

&nbsp; "stream\_options": {

&nbsp;   "include\_usage": true

&nbsp; },

&nbsp; "thinking": {

&nbsp;   "type": "disabled",

&nbsp;   "budget\_tokens": 1

&nbsp; },

&nbsp; "reasoning\_effort": "none",

&nbsp; "thinking\_budget": 0,

&nbsp; "temperature": 1,

&nbsp; "top\_p": 1,

&nbsp; "tools": \[

&nbsp;   {

&nbsp;     "type": "function",

&nbsp;     "function": {

&nbsp;       "description": "",

&nbsp;       "name": "",

&nbsp;       "parameters": {

&nbsp;         "propertyName\*": "anything"

&nbsp;       },

&nbsp;       "strict": false

&nbsp;     }

&nbsp;   }

&nbsp; ],

&nbsp; "tool\_choice": "none",

&nbsp; "parallel\_tool\_calls": true,

&nbsp; "user": "",

&nbsp; "function\_call": "none",

&nbsp; "functions": \[

&nbsp;   {

&nbsp;     "description": "",

&nbsp;     "name": "",

&nbsp;     "parameters": {

&nbsp;       "propertyName\*": "anything"

&nbsp;     }

&nbsp;   }

&nbsp; ]

}

```



\### Response

\#### Success Response (200)

\- \*\*id\*\* (string) - Unique identifier for the completion.

\- \*\*choices\*\* (array\[object]) - An array of completion choices.

&nbsp; - \*\*finish\_reason\*\* (string) - The reason the model stopped generating tokens (e.g., 'stop', 'length').

&nbsp; - \*\*index\*\* (integer) - The index of the choice in the array.

&nbsp; - \*\*message\*\* (object) - The message object representing the AI's response.

&nbsp;   - \*\*content\*\* (string) - The text content of the message.

&nbsp;   - \*\*tool\_calls\*\* (array\[object]) - An array of tool calls made by the model.

&nbsp;   - \*\*role\*\* (string) - The role of the message sender ('assistant').

&nbsp;   - \*\*function\_call\*\* (object) - Information about a function call made by the model.

&nbsp;   - \*\*content\_blocks\*\* (array\[object]) - Blocks of content, potentially including text and other types.

&nbsp;   - \*\*audio\*\* (object) - Audio data if audio was generated.

&nbsp;   - \*\*reasoning\_content\*\* (string) - Content related to the model's reasoning process.

&nbsp; - \*\*logprobs\*\* (object) - Log probabilities of the generated tokens (if requested).



\#### Error Responses

\- \*\*400\*\*: Bad Request - Something was wrong with the input data.

\- \*\*401\*\*: Unauthorized - Authentication is required.

\- \*\*500\*\*: Internal Server Error - An error occurred on the server.

```



--------------------------------



\### Bring Your Own Pollen (BYOP) Authentication Flow



Source: https://enter.pollinations.ai/api/docs/index



Implement a client-side authentication flow where users connect with Pollinations.ai to generate a temporary API key, allowing your application to use their own usage credits without backend infrastructure.



```APIDOC

\## Bring Your Own Pollen (BYOP) Authentication Flow



\### Description

Implement a client-side authentication flow where users connect with Pollinations.ai to generate a temporary API key, allowing your application to use their own usage credits without backend infrastructure.



\### URLs

Assume your app is hosted at `https://myapp.com`.



\*\*Auth Link\*\*: Redirect users to this URL to initiate the connection:

```

https://enter.pollinations.ai/authorize?redirect\_url=https://myapp.com

```



\*\*Redirect Back\*\*: After authorization, users will be redirected back to your `redirect\_url` with the API key in the URL fragment:

```

https://myapp.com#api\_key=sk\_abc123xyz

```



\### Code Example (JavaScript)

1\. \*\*Send user to auth\*\*: 

&nbsp;  ```javascript

&nbsp;  window.location.href = `https://enter.pollinations.ai/authorize?redirect\_url=${encodeURIComponent(location.href)}`;

&nbsp;  ```



2\. \*\*Grab key from URL after redirect\*\*: 

&nbsp;  ```javascript

&nbsp;  const apiKey = new URLSearchParams(window.location.hash.slice(1)).get('api\_key');

&nbsp;  ```



3\. \*\*Use their pollen (example with chat completions API)\*\*: 

&nbsp;  ```javascript

&nbsp;  fetch('https://gen.pollinations.ai/v1/chat/completions', {

&nbsp;    method: 'POST',

&nbsp;    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },

&nbsp;    body: JSON.stringify({ model: 'openai', messages: \[{ role: 'user', content: 'yo' }] })

&nbsp;  });

&nbsp;  ```



\### Notes

\- API keys generated through this flow expire in 30 days.

\- Users can revoke their keys from their dashboard at any time.

\- This flow requires no backend infrastructure on your part.

```



--------------------------------



\### Send Chat Completion Request using cURL



Source: https://enter.pollinations.ai/api/docs/index



This snippet demonstrates how to send a POST request to the /v1/chat/completions endpoint using cURL. It includes setting the Content-Type and Authorization headers, and providing a JSON payload with messages, model, and other parameters. Ensure you replace 'YOUR\_SECRET\_TOKEN' with your actual API key.



```Shell

curl https://gen.pollinations.ai/v1/chat/completions \\

&nbsp; --request POST \\

&nbsp; --header 'Content-Type: application/json' \\

&nbsp; --header 'Authorization: Bearer YOUR\_SECRET\_TOKEN' \\

&nbsp; --data '{

&nbsp; "messages": \[

&nbsp;   {

&nbsp;     "content": "",

&nbsp;     "role": "system",

&nbsp;     "name": "",

&nbsp;     "cache\_control": {

&nbsp;       "type": "ephemeral"

&nbsp;     }

&nbsp;   }

&nbsp; ],

&nbsp; "model": "openai",

&nbsp; "modalities": \[

&nbsp;   "text"

&nbsp; ],

&nbsp; "audio": {

&nbsp;   "voice": "alloy",

&nbsp;   "format": "wav"

&nbsp; },

&nbsp; "frequency\_penalty": 0,

&nbsp; "repetition\_penalty": 0,

&nbsp; "logit\_bias": null,

&nbsp; "logprobs": false,

&nbsp; "top\_logprobs": 0,

&nbsp; "max\_tokens": 0,

&nbsp; "presence\_penalty": 0,

&nbsp; "response\_format": {

&nbsp;   "type": "text"

&nbsp; },

&nbsp; "seed": -1,

&nbsp; "stop": "",

&nbsp; "stream": false,

&nbsp; "stream\_options": {

&nbsp;   "include\_usage": true

&nbsp; },

&nbsp; "thinking": {

&nbsp;   "type": "disabled",

&nbsp;   "budget\_tokens": 1

&nbsp; },

&nbsp; "reasoning\_effort": "none",

&nbsp; "thinking\_budget": 0,

&nbsp; "temperature": 1,

&nbsp; "top\_p": 1,

&nbsp; "tools": \[

&nbsp;   {

&nbsp;     "type": "function",

&nbsp;     "function": {

&nbsp;       "description": "",

&nbsp;       "name": "",

&nbsp;       "parameters": {

&nbsp;         "propertyName\*": "anything"

&nbsp;       },

&nbsp;       "strict": false

&nbsp;     }

&nbsp;   }

&nbsp; ],

&nbsp; "tool\_choice": "none",

&nbsp; "parallel\_tool\_calls": true,

&nbsp; "user": "",

&nbsp; "function\_call": "none",

&nbsp; "functions": \[

&nbsp;   {

&nbsp;     "description": "",

&nbsp;     "name": "",

&nbsp;     "parameters": {

&nbsp;       "propertyName\*": "anything"

&nbsp;     }

&nbsp;   }

&nbsp; ]

}'

```



--------------------------------



\### Text Generation / Chat Completions



Source: https://enter.pollinations.ai/api/docs/index



Engage in conversational AI for text generation, including support for vision input and streaming responses.



```APIDOC

\## POST /v1/chat/completions



\### Description

Provides access to chat-based AI models for text generation. Supports multi-modal inputs (text and images) and streaming responses.



\### Method

POST



\### Endpoint

`/v1/chat/completions`



\### Parameters

\#### Request Body

\- \*\*model\*\* (string) - Required - The AI model to use (e.g., `openai`, `gemini`).

\- \*\*messages\*\* (array) - Required - An array of message objects representing the conversation history. Each object should have a `role` (`user` or `assistant`) and `content`.

&nbsp; - \*\*content\*\* (string | array) - The message content. Can be a string for text or an array for multi-modal input.

&nbsp;   - \*\*type\*\* (string) - Required if content is an array - Type of content (`text` or `image\_url`).

&nbsp;   - \*\*text\*\* (string) - Required if type is `text` - The text content.

&nbsp;   - \*\*image\_url\*\* (object) - Required if type is `image\_url` - Object containing the image URL.

&nbsp;     - \*\*url\*\* (string) - Required - The URL of the image.

\- \*\*stream\*\* (boolean) - Optional - If true, the response will be streamed.



\### Request Example (Text)

```bash

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": "Hello"}]}'

```



\### Request Example (Vision)

```bash

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": \[{"type": "text", "text": "Describe this image"}, {"type": "image\_url", "image\_url": {"url": "https://example.com/image.jpg"}}]}]}'

```



\### Request Example (Streaming)

```bash

curl 'https://gen.pollinations.ai/v1/chat/completions' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY' \\

&nbsp; -H 'Content-Type: application/json' \\

&nbsp; -d '{"model": "openai", "messages": \[{"role": "user", "content": "Write a poem"}], "stream": true}' \\

&nbsp; --no-buffer

```



\### Response

\#### Success Response (200)

\- \*\*id\*\* (string) - The ID of the response.

\- \*\*object\*\* (string) - The type of object returned.

\- \*\*created\*\* (integer) - Timestamp of creation.

\- \*\*model\*\* (string) - The model used for the response.

\- \*\*choices\*\* (array) - An array of response choices.

&nbsp; - \*\*index\*\* (integer) - The index of the choice.

&nbsp; - \*\*message\*\* (object) - The message content.

&nbsp;   - \*\*role\*\* (string) - The role of the message sender.

&nbsp;   - \*\*content\*\* (string) - The message content.

&nbsp; - \*\*finish\_reason\*\* (string) - The reason for finishing the response.

\- \*\*usage\*\* (object) - Usage statistics.

&nbsp; - \*\*prompt\_tokens\*\* (integer) - Number of tokens in the prompt.

&nbsp; - \*\*completion\_tokens\*\* (integer) - Number of tokens in the completion.

&nbsp; - \*\*total\_tokens\*\* (integer) - Total tokens used.



\*Note: If `stream` is true, the response will be a stream of Server-Sent Events.\* 



\#### Response Example (Non-streaming)

```json

{

&nbsp; "id": "chatcmpl-123",

&nbsp; "object": "chat.completion",

&nbsp; "created": 1677652288,

&nbsp; "model": "openai",

&nbsp; "choices": \[

&nbsp;   {

&nbsp;     "index": 0,

&nbsp;     "message": {"role": "assistant", "content": "Hello there! How can I help you today?"},

&nbsp;     "finish\_reason": "stop"

&nbsp;   }

&nbsp; ],

&nbsp; "usage": {"prompt\_tokens": 10, "completion\_tokens": 20, "total\_tokens": 30}

}

```

```



--------------------------------



\### Image Generation



Source: https://enter.pollinations.ai/api/docs/index



Generate an image based on a text prompt using specified models.



```APIDOC

\## POST /image/{prompt}



\### Description

Generates an image based on a text prompt. You can specify the model to use.



\### Method

GET



\### Endpoint

`/image/{prompt}`



\### Parameters

\#### Path Parameters

\- \*\*prompt\*\* (string) - Required - The text description of the image to generate.



\#### Query Parameters

\- \*\*model\*\* (string) - Optional - The AI model to use for image generation (e.g., `flux`).



\### Request Example

```bash

curl 'https://gen.pollinations.ai/image/a%20cat?model=flux' \\

&nbsp; -H 'Authorization: Bearer YOUR\_API\_KEY'

```



\### Response

\#### Success Response (200)

\- \*\*image\_url\*\* (string) - The URL of the generated image.



\#### Response Example

```json

{

&nbsp; "image\_url": "https://gen.pollinations.ai/image/a%20cat?model=flux"

}

```

```



=== COMPLETE CONTENT === This response contains all available snippets from this library. No additional content exists. Do not make further requests.



