class AnthropicProvider {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  initialize(apiKey) {
    this.apiKey = apiKey;
  }

  getAvailableModels() {
    return [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most capable model, best for complex tasks' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and cost' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and most cost-effective' },
      { id: 'claude-2.1', name: 'Claude 2.1', description: 'Previous generation, still very capable' }
    ];
  }

  async testConnection() {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const response = await this.generateText('Hello, this is a test message.', {
        model: 'claude-3-haiku-20240307',
        maxTokens: 10
      });
      
      return {
        success: true,
        message: 'Anthropic connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Anthropic connection failed: ${error.message}`
      };
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const {
      model = 'claude-3-sonnet-20240229',
      temperature = 0.7,
      maxTokens = 4000,
      systemMessage = 'You are a helpful AI assistant that helps with API development and testing.'
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemMessage,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Invalid response format from Anthropic');
      }

      return data.content[0].text;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Anthropic API');
      }
      throw error;
    }
  }

  // Estimate token count for a given text
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Check if text is within token limits
  isWithinTokenLimit(text, model) {
    const estimatedTokens = this.estimateTokens(text);
    
    const limits = {
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
      'claude-2.1': 100000
    };

    const limit = limits[model] || 100000;
    return estimatedTokens <= limit;
  }
}

export const anthropicProvider = new AnthropicProvider(); 