class AiProvider {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async chat({ messages, model, temperature = 0.3, timeoutMs = 30000 }) {
    throw new Error('chat method must be implemented by subclass');
  }

  async testConnection() {
    try {
      const testMessages = [
        { role: 'user', content: 'Hello' }
      ];
      await this.chat({
        messages: testMessages,
        model: this.model || 'deepseek-chat',
        temperature: 0.1,
        timeoutMs: 5000
      });
      return true;
    } catch (err) {
      console.error('AI Provider connection test failed:', err);
      return false;
    }
  }
}

module.exports = AiProvider;
