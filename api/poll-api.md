### Get Available Image Models with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of retrieving a list of available image generation models from the pollinations.ai API using cURL. This endpoint requires an authorization header with a secret token.

```shell
curl https://gen.pollinations.ai/image/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

```

--------------------------------

### Get Available Text Models with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of retrieving a list of available text generation models from the pollinations.ai API using cURL. This endpoint requires an authorization header with a secret token.

```shell
curl https://gen.pollinations.ai/v1/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'

```

--------------------------------

### Generate Image with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of generating an image using the pollinations.ai API via cURL. Requires an API key and specifies the prompt and model.

```shell
curl 'https://gen.pollinations.ai/image/a%20cat?model=flux' \
  -H 'Authorization: Bearer YOUR_API_KEY'\

```

--------------------------------

### Generate Image/Video from Text Prompt using cURL

Source: https://enter.pollinations.ai/api/docs/index

This example demonstrates how to generate an image or video using the Pollinations AI API via a cURL command. It includes various parameters for customization such as model, dimensions, seed, and negative prompts. Authentication is handled via an Authorization header.

```shell
curl 'https://gen.pollinations.ai/image/a beautiful sunset over mountains?model=zimage&width=1024&height=1024&seed=0&enhance=false&negative_prompt=worst%20quality%2C%20blurry&safe=false&quality=medium&image=&transparent=false&duration=1&aspectRatio=&audio=false' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

--------------------------------

### Generate Text with API Key (Shell)

Source: https://enter.pollinations.ai/api/docs/index

Example of generating text using the Pollinations AI API via a shell command. It demonstrates how to include the API key in the Authorization header and pass various parameters like the prompt, model, seed, and temperature. Ensure you replace 'YOUR_SECRET_TOKEN' with your actual API key.

```shell
curl 'https://gen.pollinations.ai/text/Write a haiku about coding?model=openai&seed=0&system=&json=false&temperature=1&stream=false' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

--------------------------------

### Simple Text Endpoint with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of accessing a simple text endpoint on the pollinations.ai API using cURL. This method uses a query parameter for the API key.

```shell
curl 'https://gen.pollinations.ai/text/hello?key=YOUR_API_KEY'

```

--------------------------------

### Generate Text with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of generating text using the chat completions endpoint of the pollinations.ai API via cURL. Requires an API key, specifies the model, and provides the user's message.

```shell
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Hello"}]}'

```

--------------------------------

### Simple Text Endpoint

Source: https://enter.pollinations.ai/api/docs/index

A simple endpoint to get a "hello" response, useful for quick checks.

```APIDOC
## GET /text/hello

### Description
This is a simple endpoint that returns a "hello" message. It's useful for basic connectivity tests.

### Method
GET

### Endpoint
`/text/hello`

### Parameters
#### Query Parameters
- **key** (string) - Required - Your API key.

### Request Example
```bash
curl 'https://gen.pollinations.ai/text/hello?key=YOUR_API_KEY'
```

### Response
#### Success Response (200)
- **message** (string) - A greeting message.

#### Response Example
```json
{
  "message": "Hello from Pollinations.ai!"
}
```
```

--------------------------------

### GET /text/models

Source: https://enter.pollinations.ai/api/docs/index

Retrieves a list of available text generation models. If an API key with model restrictions is provided, only the allowed models will be returned.

```APIDOC
## GET /text/models

### Description
Get a list of available text generation models with pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.

### Method
GET

### Endpoint
/text/models

### Parameters
#### Query Parameters
- **api_key** (string) - Optional - Your API key for authentication and model restriction.

### Request Example
```shell
curl https://gen.pollinations.ai/text/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

### Response
#### Success Response (200)
- **name** (string) - The name of the model.
- **aliases** (array[string]) - A list of alternative names for the model.
- **pricing** (object) - Pricing information for the model.
  - **propertyName*** (number) - The cost per unit.
  - **currency** (string) - The currency used for pricing (e.g., "pollen").
- **description** (string) - A brief description of the model's capabilities.
- **input_modalities** (array[string]) - The types of input the model accepts.
- **output_modalities** (array[string]) - The types of output the model produces.
- **tools** (boolean) - Indicates if the model supports tools.
- **reasoning** (boolean) - Indicates if the model has reasoning capabilities.
- **context_window** (number) - The maximum context window size for the model.
- **voices** (array[string]) - A list of supported voices for the model (if applicable).
- **is_specialized** (boolean) - Indicates if the model is specialized.

#### Response Example
```json
[
  {
    "name": "string",
    "aliases": [
      "string"
    ],
    "pricing": {
      "propertyName*": 1,
      "currency": "pollen"
    },
    "description": "string",
    "input_modalities": [
      "string"
    ],
    "output_modalities": [
      "string"
    ],
    "tools": true,
    "reasoning": true,
    "context_window": 1,
    "voices": [
      "string"
    ],
    "is_specialized": true
  }
]
```

#### Error Response (500)
- **message** (string) - An error message indicating a server-side issue.
```

--------------------------------

### Vision (Image Input) with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of using the vision capabilities of the pollinations.ai API via cURL. This allows for image input along with text prompts for analysis. Requires an API key and specifies the model and message content including image URL.

```shell
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": [{"type": "text", "text": "Describe this image"}, {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}]}]}'

```

--------------------------------

### Get Text Models List (Shell cURL)

Source: https://enter.pollinations.ai/api/docs/index

This snippet demonstrates how to retrieve a list of available text generation models using cURL. It requires an API key for authentication. The response is in JSON format and includes details about each model's pricing, capabilities, and metadata.

```shell
curl https://gen.pollinations.ai/text/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

--------------------------------

### Streaming Response with cURL

Source: https://enter.pollinations.ai/api/docs/index

Example of enabling streaming responses from the chat completions endpoint of the pollinations.ai API using cURL. This is useful for real-time generation. Requires an API key and sets the 'stream' parameter to true.

```shell
curl 'https://gen.pollinations.ai/v1/chat/completions' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model": "openai", "messages": [{"role": "user", "content": "Write a poem"}], "stream": true}' \
  --no-buffer

```

--------------------------------

### POST /image/{prompt}

Source: https://enter.pollinations.ai/api/docs/index

Generate an image or video from a text prompt. Supports various models for both image and video generation, with options for customization like size, seed, and negative prompts. Authentication can be done via Authorization header or a query parameter.

```APIDOC
## POST /image/{prompt}

### Description
Generate an image or video from a text prompt. Supports various models for both image and video generation, with options for customization like size, seed, and negative prompts. Authentication can be done via Authorization header or a query parameter.

### Method
POST

### Endpoint
`/image/{prompt}`

### Parameters
#### Path Parameters
- **prompt** (string) - Required - Text description of the image or video to generate. Example: `a beautiful sunset over mountains`

#### Query Parameters
- **model** (string, enum) - Optional - AI model to use. Image models: `flux` (default), `turbo`, `gptimage`, `kontext`, `seedream`, `nanobanana`, `nanobanana-pro`. Video models: `veo`, `seedance`. Example: `zimage`
- **width** (integer) - Optional - Image width in pixels. Default: `1024`
- **height** (integer) - Optional - Image height in pixels. Default: `1024`
- **seed** (integer) - Optional - Random seed for reproducible results. Use -1 for random. Default: `0`
- **enhance** (boolean) - Optional - Let AI improve your prompt for better results. Default: `false`
- **negative_prompt** (string) - Optional - What to avoid in the generated image. Default: `worst quality, blurry`
- **safe** (boolean) - Optional - Enable safety content filters. Default: `false`
- **quality** (string, enum) - Optional - Image quality level (gptimage only). Options: `low`, `medium`, `high`, `hd`. Default: `medium`
- **image** (string) - Optional - Reference image URL(s). Comma/pipe separated for multiple. For veo: `image[0]=first frame, image[1]=last frame` (interpolation).
- **transparent** (boolean) - Optional - Generate with transparent background (gptimage only). Default: `false`
- **duration** (integer) - Optional - Video duration in seconds (video models only). `veo`: 4, 6, or 8. `seedance`: 2-10. Default is not specified.
- **aspectRatio** (string) - Optional - Video aspect ratio: `16:9` or `9:16` (veo, seedance).
- **audio** (boolean) - Optional - Enable audio generation for video (veo only). Default: `false`
- **key** (string) - Optional - Your API key. Alternatively, use the `Authorization` header.

### Request Example
```bash
curl 'https://gen.pollinations.ai/image/a%20beautiful%20sunset%20over%20mountains?model=zimage&width=1024&height=1024&seed=0&enhance=false&negative_prompt=worst%20quality%2C%20blurry&safe=false&quality=medium&image=&transparent=false&duration=1&aspectRatio=&audio=false' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

### Response
#### Success Response (200)
- **Image/Video Data** (binary) - The generated image or video content.

#### Response Example
(Binary data representing the image or video)

#### Error Responses
- **400 Bad Request**: Something was wrong with the input data.
- **401 Unauthorized**: Authentication failed. Provide a valid API key.
- **500 Internal Server Error**: An error occurred on the server.
```

--------------------------------

### Model Discovery API

Source: https://enter.pollinations.ai/api/docs/index

Retrieve lists of available text and image generation models.

```APIDOC
## Model Discovery Endpoints

### GET /v1/models

#### Description
Get a list of available text generation models (OpenAI-compatible). If an API key with model restrictions is provided, only allowed models are returned.

#### Method
GET

#### Endpoint
`/v1/models`

#### Parameters
No parameters for this endpoint.

#### Request Example
```bash
curl https://gen.pollinations.ai/v1/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

#### Response
##### Success Response (200)
- **object** (string) - The type of object returned ('list').
- **data** (array) - An array of model objects.
  - **id** (string) - The model's unique identifier.
  - **object** (string) - The type of object ('model').
  - **created** (integer) - Timestamp of model creation.

##### Response Example
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1677610602
    }
  ]
}
```

### GET /image/models

#### Description
Get a list of available image generation models with their pricing, capabilities, and metadata. If an API key with model restrictions is provided, only allowed models are returned.

#### Method
GET

#### Endpoint
`/image/models`

#### Parameters
No parameters for this endpoint.

#### Request Example
```bash
curl https://gen.pollinations.ai/image/models \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'
```

#### Response
##### Success Response (200)
- This endpoint returns an array of image model objects.
  - **name** (string) - The model's name.
  - **aliases** (array) - List of alternative names for the model.
  - **pricing** (object) - Pricing details for the model.
    - **propertyName*** (number) - Cost per unit (e.g., per image).
    - **currency** (string) - The currency used for pricing ('pollen').
  - **description** (string) - A description of the model's capabilities.
  - **input_modalities** (array) - List of input types the model accepts.
  - **output_modalities** (array) - List of output types the model produces.
  - **tools** (boolean) - Indicates if the model supports tools.
  - **reasoning** (boolean) - Indicates if the model supports reasoning.
  - **context_window** (integer) - The model's context window size.
  - **voices** (array) - List of available voices (if applicable).
  - **is_specialized** (boolean) - Indicates if the model is specialized.

##### Response Example
```json
[
  {
    "name": "dall-e-3",
    "aliases": ["dalle3"],
    "pricing": {"image": 100, "currency": "pollen"},
    "description": "Generates highly detailed images from text descriptions.",
    "input_modalities": ["text"],
    "output_modalities": ["image"],
    "tools": false,
    "reasoning": false,
    "context_window": 4096,
    "voices": [],
    "is_specialized": false
  }
]
```
```

--------------------------------

Part 1/2