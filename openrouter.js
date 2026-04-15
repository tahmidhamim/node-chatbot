import OpenAI from 'openai';

class OpenRouterService {
  constructor(apiKey, model = 'openai/gpt-3.5-turbo') {
    this.model = model;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    // Initialize OpenAI client with OpenRouter base URL
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/tahmidhamim/node-chatbot',
        'X-Title': 'Node Chatbot',
      },
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async chat(messages, tools = null, retryCount = 0) {
    try {
      const params = {
        model: this.model,
        messages: messages,
      };

      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = 'auto';
      }

      const completion = await this.client.chat.completions.create(params);

      return {
        success: true,
        data: completion,
      };

    } catch (error) {
      return this.handleError(error, messages, tools, retryCount);
    }
  }

  async handleError(error, messages, tools, retryCount) {
    const statusCode = error.status;
    const errorMessage = error.message;

    console.error(`✗ API Error (${statusCode || 'Unknown'}): ${errorMessage}`);

    // Rate limit or server error - retry with exponential backoff
    if ([429, 500, 502, 503, 504].includes(statusCode) && retryCount < this.maxRetries) {
      const delay = this.retryDelay * Math.pow(2, retryCount);
      console.log(`⏳ Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/${this.maxRetries})`);
      
      await this.sleep(delay);
      return this.chat(messages, tools, retryCount + 1);
    }

    // Daily limit exceeded (handled by OpenRouter)
    if (statusCode === 402 || errorMessage.includes('insufficient credits')) {
      return {
        success: false,
        error: 'Insufficient credits or daily limit reached on OpenRouter',
        retryable: false,
      };
    }

    // Invalid request
    if (statusCode === 400) {
      return {
        success: false,
        error: `Invalid request: ${errorMessage}`,
        retryable: false,
      };
    }

    // Authentication error
    if (statusCode === 401) {
      return {
        success: false,
        error: 'Invalid API key. Please check your OPENROUTER_API_KEY',
        retryable: false,
      };
    }

    // All retries exhausted
    if (retryCount >= this.maxRetries) {
      return {
        success: false,
        error: `Failed after ${this.maxRetries} retries: ${errorMessage}`,
        retryable: false,
      };
    }

    // Unknown error
    return {
      success: false,
      error: errorMessage,
      retryable: true,
    };
  }

  async listModels() {
    try {
      const models = await this.client.models.list();
      return models.data;
    } catch (error) {
      console.error('Error listing models:', error.message);
      return [];
    }
  }
}

export default OpenRouterService;