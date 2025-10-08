const { ipcMain } = require('electron');
const PawAssistSettingsStore = require('../store/paw-assist-settings');
const AiProviderRegistry = require('../providers/ai-provider-registry');
const { extractJs, buildUserPrompt, buildConversionPrompt, getSystemPrompt, validateApiKey } = require('../utils/paw-assist-utils');

let settingsStore;
let providerRegistry;

function initializePawAssist() {
  settingsStore = new PawAssistSettingsStore();
  providerRegistry = new AiProviderRegistry(settingsStore);
}

// IPC handler for generating AI code
ipcMain.handle('pawAssist:generate', async (event, request) => {
  try {
    console.log('Paw Assist: Starting generation request...');

    if (!settingsStore || !providerRegistry) {
      console.log('Paw Assist: Initializing Paw Assist for generation...');
      initializePawAssist();
    }

    const { messages, model, temperature, contextMeta } = request;
    console.log('Paw Assist: Generation request details:', { model, temperature, contextMeta });

    if (!messages || !Array.isArray(messages)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid messages format'
        }
      };
    }

    console.log('Paw Assist: Getting active provider...');
    const provider = providerRegistry.getActiveProvider();
    console.log('Paw Assist: Provider obtained:', provider.name);

    const settings = settingsStore.getSettings();
    console.log('Paw Assist: Settings loaded:', { model: settings.model, temperature: settings.temperature });

    console.log('Paw Assist: Calling provider chat...');
    const response = await provider.chat({
      messages,
      model: model || settings.model,
      temperature: temperature || settings.temperature,
      timeoutMs: settings.timeoutMs
    });

    const code = extractJs(response.content);

    return {
      ok: true,
      content: code,
      usage: response.usage
    };
  } catch (error) {
    console.error('Paw Assist generation error:', error);
    return {
      ok: false,
      error: {
        code: 'GENERATION_ERROR',
        message: error.message,
        details: error.stack
      }
    };
  }
});

// IPC handler for converting Postman code to Bruno
ipcMain.handle('pawAssist:convertPostman', async (event, request) => {
  try {
    if (!settingsStore || !providerRegistry) {
      initializePawAssist();
    }

    const { code, contextType } = request;

    if (!code || typeof code !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid code format'
        }
      };
    }

    const messages = [
      { role: 'system', content: getSystemPrompt(contextType, true) }, // true for conversion
      { role: 'user', content: buildConversionPrompt(code, contextType) }
    ];

    // Call the generate logic directly
    try {
      console.log('Paw Assist: Starting conversion generation...');

      if (!settingsStore || !providerRegistry) {
        console.log('Paw Assist: Initializing Paw Assist for conversion...');
        initializePawAssist();
      }

      console.log('Paw Assist: Getting active provider...');
      const provider = providerRegistry.getActiveProvider();
      console.log('Paw Assist: Provider obtained:', provider.name);

      const settings = settingsStore.getSettings();
      console.log('Paw Assist: Settings loaded:', { model: settings.model, temperature: settings.temperature });

      console.log('Paw Assist: Calling provider chat...');
      const response = await provider.chat({
        messages,
        model: settings.model,
        temperature: settings.temperature,
        timeoutMs: settings.timeoutMs
      });

      console.log('Paw Assist: Response received:', response.content?.substring(0, 100) + '...');

      const code = extractJs(response.content);
      console.log('Paw Assist: Extracted code:', code?.substring(0, 100) + '...');

      return {
        ok: true,
        content: code,
        usage: response.usage
      };
    } catch (genError) {
      console.error('Paw Assist conversion generation error:', genError);
      return {
        ok: false,
        error: {
          code: 'GENERATION_ERROR',
          message: genError.message,
          details: genError.stack
        }
      };
    }
  } catch (error) {
    console.error('Paw Assist conversion error:', error);
    return {
      ok: false,
      error: {
        code: 'CONVERSION_ERROR',
        message: error.message,
        details: error.stack
      }
    };
  }
});

// IPC handler for getting settings
ipcMain.handle('pawAssist:getSettings', async () => {
  try {
    if (!settingsStore) {
      initializePawAssist();
    }

    const settings = settingsStore.getSettings();
    // Don't expose the encrypted API key
    const { apiKeyEncrypted, ...publicSettings } = settings;

    return {
      ok: true,
      settings: publicSettings,
      isConfigured: settingsStore.isConfigured()
    };
  } catch (error) {
    console.error('Paw Assist get settings error:', error);
    return {
      ok: false,
      error: {
        code: 'SETTINGS_ERROR',
        message: error.message
      }
    };
  }
});

// IPC handler for updating settings
ipcMain.handle('pawAssist:updateSettings', async (event, request) => {
  try {
    if (!settingsStore) {
      initializePawAssist();
    }

    const { settings, apiKey } = request;

    if (apiKey) {
      console.log('Paw Assist: Attempting to save API key for provider:', settings?.provider);

      if (!validateApiKey(apiKey, settings?.provider)) {
        console.error('Paw Assist: Invalid API key format for provider:', settings?.provider);
        return {
          ok: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key format'
          }
        };
      }

      console.log('Paw Assist: API key validation passed, attempting to save...');
      const keySaved = settingsStore.setApiKey(apiKey);
      console.log('Paw Assist: API key save result:', keySaved);

      if (!keySaved) {
        console.error('Paw Assist: Failed to save API key');
        return {
          ok: false,
          error: {
            code: 'SAVE_ERROR',
            message: 'Failed to save API key'
          }
        };
      }
    }

    if (settings) {
      console.log('Paw Assist: Attempting to save settings:', settings);
      const saved = settingsStore.saveSettings(settings);
      console.log('Paw Assist: Settings save result:', saved);

      if (!saved) {
        console.error('Paw Assist: Failed to save settings');
        return {
          ok: false,
          error: {
            code: 'SAVE_ERROR',
            message: 'Failed to save settings'
          }
        };
      }
    }

    return {
      ok: true,
      settings: settingsStore.getSettings()
    };
  } catch (error) {
    console.error('Paw Assist update settings error:', error);
    return {
      ok: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message
      }
    };
  }
});

// IPC handler for testing connection
ipcMain.handle('pawAssist:testConnection', async () => {
  try {
    console.log('Paw Assist: Starting test connection...');

    if (!settingsStore || !providerRegistry) {
      console.log('Paw Assist: Initializing Paw Assist...');
      initializePawAssist();
    }

    console.log('Paw Assist: Getting active provider...');
    const provider = providerRegistry.getActiveProvider();
    console.log('Paw Assist: Provider obtained:', provider.name);

    console.log('Paw Assist: Testing connection...');
    const isConnected = await provider.testConnection();
    console.log('Paw Assist: Connection test result:', isConnected);

    return {
      ok: true,
      connected: isConnected
    };
  } catch (error) {
    console.error('Paw Assist test connection error:', error);
    return {
      ok: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: error.message
      }
    };
  }
});

// IPC handler for getting available providers
ipcMain.handle('pawAssist:getProviders', async () => {
  try {
    if (!providerRegistry) {
      initializePawAssist();
    }

    const providers = providerRegistry.getAvailableProviders();

    return {
      ok: true,
      providers
    };
  } catch (error) {
    console.error('Paw Assist get providers error:', error);
    return {
      ok: false,
      error: {
        code: 'PROVIDERS_ERROR',
        message: error.message
      }
    };
  }
});

function registerPawAssistIpc(mainWindow) {
  // Initialize on first call
  if (!settingsStore || !providerRegistry) {
    initializePawAssist();
  }
}

module.exports = {
  registerPawAssistIpc
};
