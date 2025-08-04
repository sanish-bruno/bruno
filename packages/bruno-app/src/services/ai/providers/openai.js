class OpenAIProvider {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  initialize(apiKey) {
    this.apiKey = apiKey;
  }

  getAvailableModels() {
    return [
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model, best for complex tasks' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and more cost-effective than GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective for most tasks' },
      { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', description: 'Same as GPT-3.5 Turbo but with larger context' }
    ];
  }

  async testConnection() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Comprehensive network connectivity test
      console.log('Testing network connectivity...');
      
      // Test 1: Basic DNS resolution
      try {
        console.log('Testing DNS resolution for api.openai.com...');
        const dnsTest = await fetch('https://api.openai.com/v1/models', {
          method: 'HEAD', // Just check if we can reach the server
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        console.log('DNS resolution successful, status:', dnsTest.status);
      } catch (dnsError) {
        console.error('DNS resolution failed:', dnsError);
        throw new Error('DNS resolution failed: Unable to resolve api.openai.com. This might be due to network configuration, firewall, or DNS issues.');
      }

      // Test 2: Check if it's a proxy/firewall issue
      try {
        console.log('Testing direct connection to OpenAI...');
        const directTest = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        console.log('Direct connection successful, status:', directTest.status);
        
        if (directTest.status === 401) {
          // This means we can reach OpenAI but the API key is invalid
          throw new Error('Invalid API key: The connection to OpenAI is working, but your API key appears to be invalid or expired.');
        }
        
      } catch (directError) {
        console.error('Direct connection failed:', directError);
        
        // Test 3: Check if it's a general internet connectivity issue
        try {
          console.log('Testing general internet connectivity...');
          await fetch('https://httpbin.org/get', { method: 'GET' });
          console.log('General internet connectivity is working');
          
          // If we can reach other sites but not OpenAI, it's likely a firewall/proxy issue
          throw new Error('Firewall/Proxy issue: Internet connectivity is working, but access to OpenAI servers is blocked. This might be due to corporate firewall, VPN, or proxy settings.');
        } catch (internetError) {
          console.error('General internet connectivity failed:', internetError);
          throw new Error('General network issue: Unable to connect to any external servers. Please check your internet connection and network settings.');
        }
      }

      // If we get here, the connection is working, so test the actual API
      const response = await this.generateText('Hello, this is a test message.', {
        model: 'gpt-3.5-turbo',
        maxTokens: 10
      });
      
      return {
        success: true,
        message: 'OpenAI connection successful'
      };
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return {
        success: false,
        message: `OpenAI connection failed: ${error.message}`
      };
    }
  }

  async generateText(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      model = 'gpt-4',
      temperature = 0.7,
      maxTokens = 4000,
      systemMessage = 'You are a helpful AI assistant that helps with API development and testing.'
    } = options;

    const messages = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    try {
      console.log('Making OpenAI API request to:', `${this.baseUrl}/chat/completions`);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }

        // Provide more specific error messages
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (response.status === 500) {
          errorMessage = 'OpenAI server error. Please try again later.';
        } else if (response.status === 503) {
          errorMessage = 'OpenAI service temporarily unavailable.';
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      
      // Handle different types of errors
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: The connection to OpenAI API timed out after 30 seconds. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to OpenAI API. Please check your internet connection and try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Failed to connect to OpenAI API. This might be due to a firewall, proxy, or network issue.');
      } else if (error.message.includes('CORS')) {
        throw new Error('CORS error: Unable to connect to OpenAI API. This might be due to browser security restrictions.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timeout: The connection to OpenAI API timed out. Please try again.');
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
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };

    const limit = limits[model] || 4096;
    return estimatedTokens <= limit;
  }
}

export const openaiProvider = new OpenAIProvider(); 