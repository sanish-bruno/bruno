const { extractJs, buildUserPrompt, buildConversionPrompt, validateApiKey } = require('../paw-assist-utils');

describe('Paw Assist Utils', () => {
  describe('extractJs', () => {
    it('should extract JavaScript code from markdown fences', () => {
      const input = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const expected = 'const x = 1;\nconsole.log(x);';
      expect(extractJs(input)).toBe(expected);
    });

    it('should extract code from js fence without language specifier', () => {
      const input = '```\nconst x = 1;\nconsole.log(x);\n```';
      const expected = 'const x = 1;\nconsole.log(x);';
      expect(extractJs(input)).toBe(expected);
    });

    it('should return trimmed content if no fences found', () => {
      const input = '  const x = 1;\n  console.log(x);  ';
      const expected = 'const x = 1;\n  console.log(x);';
      expect(extractJs(input)).toBe(expected);
    });

    it('should handle empty or null input', () => {
      expect(extractJs('')).toBe('');
      expect(extractJs(null)).toBe('');
      expect(extractJs(undefined)).toBe('');
    });
  });

  describe('buildUserPrompt', () => {
    it('should build prompt for pre-request script', () => {
      const userPrompt = 'Generate authentication script';
      const scriptType = 'pre';
      const context = {
        goal: 'OAuth2 authentication',
        vars: 'client_id, client_secret',
        notes: 'Use environment variables'
      };

      const result = buildUserPrompt(userPrompt, scriptType, context);
      expect(result).toContain('Generate authentication script');
      expect(result).toContain('Goal: OAuth2 authentication');
      expect(result).toContain('Required variables: client_id, client_secret');
      expect(result).toContain('Notes: Use environment variables');
    });

    it('should build prompt for post-response script', () => {
      const userPrompt = 'Validate response';
      const scriptType = 'post';
      const context = {
        expectations: 'Status 200, valid JSON',
        vars: 'user_id, token'
      };

      const result = buildUserPrompt(userPrompt, scriptType, context);
      expect(result).toContain('Validate response');
      expect(result).toContain('Response expectations: Status 200, valid JSON');
      expect(result).toContain('Variables to set: user_id, token');
    });

    it('should handle missing context gracefully', () => {
      const userPrompt = 'Simple script';
      const scriptType = 'pre';
      const context = {};

      const result = buildUserPrompt(userPrompt, scriptType, context);
      expect(result).toBe('Simple script');
    });
  });

  describe('buildConversionPrompt', () => {
    it('should build conversion prompt for Postman code', () => {
      const postmanCode = 'pm.environment.set("token", "abc123");';
      const contextType = 'pre';

      const result = buildConversionPrompt(postmanCode, contextType);
      expect(result).toContain('Convert this Postman pre script to Bruno syntax');
      expect(result).toContain('pm.environment.set("token", "abc123");');
    });
  });

  describe('validateApiKey', () => {
    it('should validate DeepSeek API key format', () => {
      expect(validateApiKey('sk-1234567890abcdef1234567890abcdef', 'deepseek')).toBe(true);
      expect(validateApiKey('sk-short', 'deepseek')).toBe(false);
      expect(validateApiKey('invalid-key', 'deepseek')).toBe(false);
    });

    it('should validate OpenAI API key format', () => {
      expect(validateApiKey('sk-1234567890abcdef1234567890abcdef', 'openai')).toBe(true);
      expect(validateApiKey('sk-short', 'openai')).toBe(false);
    });

    it('should validate Anthropic API key format', () => {
      expect(validateApiKey('sk-ant-1234567890abcdef1234567890abcdef', 'anthropic')).toBe(true);
      expect(validateApiKey('sk-1234567890abcdef1234567890abcdef', 'anthropic')).toBe(false);
    });

    it('should handle unknown providers with basic validation', () => {
      expect(validateApiKey('valid-long-key-1234567890', 'unknown')).toBe(true);
      expect(validateApiKey('short', 'unknown')).toBe(false);
    });

    it('should handle invalid inputs', () => {
      expect(validateApiKey(null, 'deepseek')).toBe(false);
      expect(validateApiKey(undefined, 'deepseek')).toBe(false);
      expect(validateApiKey('', 'deepseek')).toBe(false);
      expect(validateApiKey(123, 'deepseek')).toBe(false);
    });
  });
});
