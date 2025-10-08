const DeepSeekProvider = require('./deepseek-provider');

class AiProviderRegistry {
  constructor(settingsStore) {
    this.settingsStore = settingsStore;
    this.providers = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    // Register available providers
    this.providers.set('deepseek', DeepSeekProvider);
    // Future providers can be added here
    // this.providers.set('openai', OpenAIProvider);
    // this.providers.set('anthropic', AnthropicProvider);
  }

  getActiveProvider() {
    const settings = this.settingsStore.getSettings();
    const apiKey = this.settingsStore.getApiKey();

    if (!apiKey) {
      throw new Error('No API key configured. Please set up your API key in settings.');
    }

    const ProviderClass = this.providers.get(settings.provider);
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${settings.provider}`);
    }

    return new ProviderClass(apiKey);
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys()).map((name) => ({
      name,
      displayName: this.getProviderDisplayName(name)
    }));
  }

  getProviderDisplayName(providerName) {
    const displayNames = {
      deepseek: 'DeepSeek',
      openai: 'OpenAI',
      anthropic: 'Anthropic'
    };
    return displayNames[providerName] || providerName;
  }

  async testProvider(providerName, apiKey) {
    const ProviderClass = this.providers.get(providerName);
    if (!ProviderClass) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    const provider = new ProviderClass(apiKey);
    return await provider.testConnection();
  }
}

module.exports = AiProviderRegistry;
