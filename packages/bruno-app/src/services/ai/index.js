import { openaiProvider } from './providers/openai';
import { anthropicProvider } from './providers/anthropic';
import { promptTemplates } from './prompts';

class AIService {
  constructor() {
    this.providers = {
      openai: openaiProvider,
      anthropic: anthropicProvider
    };
    this.currentProvider = null;
    this.currentModel = null;
  }

  // Initialize AI service with user preferences
  initialize(preferences) {
    const { ai } = preferences;
    
    if (!ai || !ai.enabled) {
      this.currentProvider = null;
      this.currentModel = null;
      return false;
    }

    // Set default provider and model
    if (ai.openaiKey) {
      this.currentProvider = 'openai';
      this.currentModel = ai.defaultOpenaiModel || 'gpt-4';
    } else if (ai.anthropicKey) {
      this.currentProvider = 'anthropic';
      this.currentModel = ai.defaultAnthropicModel || 'claude-3-sonnet-20240229';
    } else {
      this.currentProvider = null;
      this.currentModel = null;
      return false;
    }

    // Initialize the selected provider
    const provider = this.providers[this.currentProvider];
    if (provider) {
      provider.initialize(ai[`${this.currentProvider}Key`]);
    }

    return true;
  }

  // Test AI connection
  async testConnection() {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    const provider = this.providers[this.currentProvider];
    
    try {
      console.log(`Testing connection with ${this.currentProvider} provider...`);
      const result = await provider.testConnection();
      console.log('Connection test result:', result);
      return result;
    } catch (error) {
      console.error(`Connection test failed for ${this.currentProvider}:`, error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  // Generate collection from API documentation
  async generateCollection(apiSpec, options = {}) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    const provider = this.providers[this.currentProvider];
    const model = options.model || this.currentModel;
    
    const prompt = promptTemplates.generateCollection(apiSpec, options);
    
    try {
      const response = await provider.generateText(prompt, {
        model,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 4000
      });

      return this.parseCollectionResponse(response);
    } catch (error) {
      throw new Error(`Failed to generate collection: ${error.message}`);
    }
  }

  // Generate tests for a request
  async generateTests(request, response = null, options = {}) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    const provider = this.providers[this.currentProvider];
    const model = options.model || this.currentModel;
    
    const prompt = promptTemplates.generateTests(request, response, options);
    
    try {
      const response = await provider.generateText(prompt, {
        model,
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 2000
      });

      return this.parseTestResponse(response);
    } catch (error) {
      throw new Error(`Failed to generate tests: ${error.message}`);
    }
  }

  // Generate tests for an entire collection
  async generateCollectionTests(collection, options = {}) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    const provider = this.providers[this.currentProvider];
    const model = options.model || this.currentModel;
    
    const prompt = promptTemplates.generateCollectionTests(collection, options);
    
    try {
      const response = await provider.generateText(prompt, {
        model,
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 4000
      });

      return this.parseCollectionTestsResponse(response);
    } catch (error) {
      throw new Error(`Failed to generate collection tests: ${error.message}`);
    }
  }

  // Generate additional tests based on user request
  async generateAdditionalTests(request, response, userRequest, existingTests = '') {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    const provider = this.providers[this.currentProvider];
    const model = this.currentModel;
    
    const prompt = promptTemplates.generateAdditionalTests(request, response, userRequest, existingTests);
    
    try {
      const response = await provider.generateText(prompt, {
        model,
        temperature: 0.3,
        maxTokens: 2000
      });

      return this.parseTestResponse(response);
    } catch (error) {
      throw new Error(`Failed to generate additional tests: ${error.message}`);
    }
  }

  // Parse AI response for collection generation
  parseCollectionResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      if (parsed.endpoints && Array.isArray(parsed.endpoints)) {
        return {
          name: parsed.name || 'AI Generated Collection',
          description: parsed.description || '',
          endpoints: parsed.endpoints.map(endpoint => ({
            name: endpoint.name,
            method: endpoint.method,
            url: endpoint.url,
            headers: endpoint.headers || [],
            body: endpoint.body || null,
            description: endpoint.description || ''
          }))
        };
      }
    } catch (e) {
      // If JSON parsing fails, try to extract from text
      return this.extractEndpointsFromText(response);
    }

    throw new Error('Unable to parse AI response for collection generation');
  }

  // Parse AI response for test generation
  parseTestResponse(response) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      
      if (parsed.tests && Array.isArray(parsed.tests)) {
        return parsed.tests.map(test => ({
          name: test.name,
          code: test.code,
          description: test.description || ''
        }));
      }
    } catch (e) {
      // If JSON parsing fails, extract test code from text
      return this.extractTestsFromText(response);
    }

    throw new Error('Unable to parse AI response for test generation');
  }

  // Parse AI response for collection tests
  parseCollectionTestsResponse(response) {
    try {
      const parsed = JSON.parse(response);
      
      if (parsed.requestTests && typeof parsed.requestTests === 'object') {
        return parsed.requestTests;
      }
    } catch (e) {
      // Fallback to text extraction
      return this.extractCollectionTestsFromText(response);
    }

    throw new Error('Unable to parse AI response for collection tests');
  }

  // Extract endpoints from text response
  extractEndpointsFromText(text) {
    const endpoints = [];
    const lines = text.split('\n');
    
    let currentEndpoint = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for HTTP method patterns
      const methodMatch = trimmed.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/i);
      if (methodMatch) {
        if (currentEndpoint) {
          endpoints.push(currentEndpoint);
        }
        currentEndpoint = {
          method: methodMatch[1].toUpperCase(),
          url: methodMatch[2].trim(),
          name: `Generated ${methodMatch[1]} Request`,
          headers: [],
          body: null,
          description: ''
        };
      }
      
      // Look for URL patterns
      const urlMatch = trimmed.match(/^URL:\s*(.+)$/i);
      if (urlMatch && currentEndpoint) {
        currentEndpoint.url = urlMatch[1].trim();
      }
      
      // Look for name patterns
      const nameMatch = trimmed.match(/^Name:\s*(.+)$/i);
      if (nameMatch && currentEndpoint) {
        currentEndpoint.name = nameMatch[1].trim();
      }
    }
    
    if (currentEndpoint) {
      endpoints.push(currentEndpoint);
    }
    
    return {
      name: 'AI Generated Collection',
      description: 'Generated from API documentation',
      endpoints
    };
  }

  // Extract tests from text response
  extractTestsFromText(text) {
    const tests = [];
    const lines = text.split('\n');
    
    let currentTest = null;
    let inCodeBlock = false;
    let codeLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for test function patterns
      const testMatch = trimmed.match(/^test\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (testMatch) {
        if (currentTest && codeLines.length > 0) {
          currentTest.code = codeLines.join('\n');
          tests.push(currentTest);
        }
        
        currentTest = {
          name: testMatch[1],
          code: '',
          description: testMatch[1]
        };
        codeLines = [];
        inCodeBlock = true;
        continue;
      }
      
      // Look for code block markers
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          if (currentTest) {
            currentTest.code = codeLines.join('\n');
            tests.push(currentTest);
            currentTest = null;
            codeLines = [];
          }
        } else {
          inCodeBlock = true;
        }
        continue;
      }
      
      if (inCodeBlock && currentTest) {
        codeLines.push(line);
      }
    }
    
    // Handle last test
    if (currentTest && codeLines.length > 0) {
      currentTest.code = codeLines.join('\n');
      tests.push(currentTest);
    }
    
    return tests;
  }

  // Extract collection tests from text response
  extractCollectionTestsFromText(text) {
    const requestTests = {};
    const lines = text.split('\n');
    
    let currentRequest = null;
    let currentTests = [];
    let inCodeBlock = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for request identifiers
      const requestMatch = trimmed.match(/^Request:\s*(.+)$/i);
      if (requestMatch) {
        if (currentRequest && currentTests.length > 0) {
          requestTests[currentRequest] = currentTests.join('\n');
        }
        
        currentRequest = requestMatch[1].trim();
        currentTests = [];
        continue;
      }
      
      // Look for code block markers
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      if (inCodeBlock && currentRequest) {
        currentTests.push(line);
      }
    }
    
    // Handle last request
    if (currentRequest && currentTests.length > 0) {
      requestTests[currentRequest] = currentTests.join('\n');
    }
    
    return requestTests;
  }

  // Get available providers
  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  // Get available models for a provider
  getAvailableModels(provider) {
    if (this.providers[provider]) {
      return this.providers[provider].getAvailableModels();
    }
    return [];
  }

  // Switch provider
  switchProvider(provider, model) {
    if (this.providers[provider]) {
      this.currentProvider = provider;
      this.currentModel = model;
      return true;
    }
    return false;
  }

  // Get current provider info
  getCurrentProvider() {
    return {
      provider: this.currentProvider,
      model: this.currentModel
    };
  }
}

export const aiService = new AIService();

// Default export for cleaner imports
export default aiService; 