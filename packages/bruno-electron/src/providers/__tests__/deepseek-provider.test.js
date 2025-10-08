const DeepSeekProvider = require('../deepseek-provider');

// Mock fetch for testing
global.fetch = jest.fn();

describe('DeepSeekProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new DeepSeekProvider('test-api-key');
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with API key and default base URL', () => {
      expect(provider.apiKey).toBe('test-api-key');
      expect(provider.baseUrl).toBe('https://api.deepseek.com');
      expect(provider.name).toBe('deepseek');
    });

    it('should allow custom base URL', () => {
      const customProvider = new DeepSeekProvider('test-key', 'https://custom.api.com');
      expect(customProvider.baseUrl).toBe('https://custom.api.com');
    });
  });

  describe('chat', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'const x = 1;'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Generate code' }],
        model: 'deepseek-chat',
        temperature: 0.3
      });

      expect(fetch).toHaveBeenCalledWith('https://api.deepseek.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'Generate code' }],
            temperature: 0.3,
            max_tokens: 2000,
            stream: false
          })
        }));

      expect(result).toEqual({
        content: 'const x = 1;',
        usage: {
          prompt: 10,
          completion: 5,
          total: 15
        }
      });
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Generate code' }]
      })).rejects.toThrow('DeepSeek API error 401: Unauthorized');
    });

    it('should handle timeout', async () => {
      fetch.mockImplementationOnce(() =>
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        }));

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Generate code' }],
        timeoutMs: 50
      })).rejects.toThrow('Request timeout - please try again or increase timeout in settings');
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: []
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Generate code' }]
      })).rejects.toThrow('Invalid response format from DeepSeek API');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection test', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'Hello'
            }
          }]
        })
      };

      fetch.mockResolvedValueOnce(mockResponse);

      const result = await provider.testConnection();
      expect(result).toBe(true);
    });

    it('should return false for failed connection test', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.testConnection();
      expect(result).toBe(false);
    });
  });
});
