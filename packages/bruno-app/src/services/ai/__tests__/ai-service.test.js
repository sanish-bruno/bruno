import { aiService } from '../index';

// Mock the providers
jest.mock('../providers/openai', () => ({
  openaiProvider: {
    initialize: jest.fn(),
    testConnection: jest.fn(),
    generateText: jest.fn(),
    getAvailableModels: jest.fn(() => [
      { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
    ])
  }
}));

jest.mock('../providers/anthropic', () => ({
  anthropicProvider: {
    initialize: jest.fn(),
    testConnection: jest.fn(),
    generateText: jest.fn(),
    getAvailableModels: jest.fn(() => [
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest and most cost-effective' }
    ])
  }
}));

describe('AIService', () => {
  beforeEach(() => {
    // Reset the service state
    aiService.currentProvider = null;
    aiService.currentModel = null;
  });

  describe('initialization', () => {
    it('should initialize with OpenAI when key is provided', () => {
      const preferences = {
        ai: {
          enabled: true,
          openaiKey: 'sk-test-key',
          defaultOpenaiModel: 'gpt-4'
        }
      };

      const result = aiService.initialize(preferences);
      
      expect(result).toBe(true);
      expect(aiService.currentProvider).toBe('openai');
      expect(aiService.currentModel).toBe('gpt-4');
    });

    it('should initialize with Anthropic when key is provided', () => {
      const preferences = {
        ai: {
          enabled: true,
          anthropicKey: 'sk-ant-test-key',
          defaultAnthropicModel: 'claude-3-sonnet-20240229'
        }
      };

      const result = aiService.initialize(preferences);
      
      expect(result).toBe(true);
      expect(aiService.currentProvider).toBe('anthropic');
      expect(aiService.currentModel).toBe('claude-3-sonnet-20240229');
    });

    it('should not initialize when AI is disabled', () => {
      const preferences = {
        ai: {
          enabled: false,
          openaiKey: 'sk-test-key'
        }
      };

      const result = aiService.initialize(preferences);
      
      expect(result).toBe(false);
      expect(aiService.currentProvider).toBe(null);
      expect(aiService.currentModel).toBe(null);
    });

    it('should not initialize when no keys are provided', () => {
      const preferences = {
        ai: {
          enabled: true
        }
      };

      const result = aiService.initialize(preferences);
      
      expect(result).toBe(false);
      expect(aiService.currentProvider).toBe(null);
      expect(aiService.currentModel).toBe(null);
    });
  });

  describe('provider management', () => {
    it('should get available providers', () => {
      const providers = aiService.getAvailableProviders();
      expect(providers).toEqual(['openai', 'anthropic']);
    });

    it('should get available models for a provider', () => {
      const openaiModels = aiService.getAvailableModels('openai');
      expect(openaiModels).toHaveLength(2);
      expect(openaiModels[0].id).toBe('gpt-4');
    });

    it('should switch provider', () => {
      aiService.currentProvider = 'openai';
      aiService.currentModel = 'gpt-4';

      const result = aiService.switchProvider('anthropic', 'claude-3-sonnet-20240229');
      
      expect(result).toBe(true);
      expect(aiService.currentProvider).toBe('anthropic');
      expect(aiService.currentModel).toBe('claude-3-sonnet-20240229');
    });

    it('should get current provider info', () => {
      aiService.currentProvider = 'openai';
      aiService.currentModel = 'gpt-4';

      const info = aiService.getCurrentProvider();
      
      expect(info).toEqual({
        provider: 'openai',
        model: 'gpt-4'
      });
    });
  });

  describe('response parsing', () => {
    it('should parse valid JSON collection response', () => {
      const response = JSON.stringify({
        name: 'Test API',
        description: 'Test API collection',
        endpoints: [
          {
            name: 'Get Users',
            method: 'GET',
            url: '/api/users',
            headers: [],
            body: null,
            description: 'Get all users'
          }
        ]
      });

      const result = aiService.parseCollectionResponse(response);
      
      expect(result.name).toBe('Test API');
      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0].method).toBe('GET');
    });

    it('should parse valid JSON test response', () => {
      const response = JSON.stringify({
        tests: [
          {
            name: 'Test Status Code',
            code: "test('Should return 200', () => { expect(res.getStatus()).to.equal(200); });",
            description: 'Test response status code'
          }
        ]
      });

      const result = aiService.parseTestResponse(response);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Status Code');
      expect(result[0].code).toContain('expect(res.getStatus())');
    });

    it('should extract endpoints from text response', () => {
      const response = `
GET /api/users
POST /api/users
PUT /api/users/123
      `;

      const result = aiService.extractEndpointsFromText(response);
      
      expect(result.endpoints).toHaveLength(3);
      expect(result.endpoints[0].method).toBe('GET');
      expect(result.endpoints[1].method).toBe('POST');
      expect(result.endpoints[2].method).toBe('PUT');
    });

    it('should extract tests from text response', () => {
      const response = `
test('Should return 200', () => {
  expect(res.getStatus()).to.equal(200);
});

test('Should have user data', () => {
  const body = res.getBody();
  expect(body).to.be.an('object');
});
      `;

      const result = aiService.extractTestsFromText(response);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Should return 200');
      expect(result[1].name).toBe('Should have user data');
    });
  });

  describe('error handling', () => {
    it('should throw error when no provider is configured', async () => {
      aiService.currentProvider = null;

      await expect(aiService.testConnection()).rejects.toThrow('No AI provider configured');
    });

    it('should throw error when generating collection without provider', async () => {
      aiService.currentProvider = null;

      await expect(aiService.generateCollection('test')).rejects.toThrow('No AI provider configured');
    });

    it('should throw error when generating tests without provider', async () => {
      aiService.currentProvider = null;

      await expect(aiService.generateTests({})).rejects.toThrow('No AI provider configured');
    });
  });
}); 