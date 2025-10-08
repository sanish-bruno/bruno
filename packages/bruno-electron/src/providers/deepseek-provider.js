const AiProvider = require('./ai-provider');

class DeepSeekProvider extends AiProvider {
  constructor(apiKey, baseUrl = 'https://api.deepseek.com') {
    super(apiKey, baseUrl);
    this.name = 'deepseek';
  }

  async chat({ messages, model, temperature = 0.3, timeoutMs = 30000 }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages,
          temperature,
          max_tokens: 2000,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from DeepSeek API');
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage ? {
          prompt: data.usage.prompt_tokens || 0,
          completion: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0
        } : undefined
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again or increase timeout in settings');
      }

      throw error;
    }
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
      console.error('DeepSeek connection test failed:', err);
      return false;
    }
  }
}

module.exports = DeepSeekProvider;
