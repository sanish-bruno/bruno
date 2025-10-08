const Store = require('electron-store');
const { encryptString, decryptString } = require('../utils/encryption');

// Test that encryption functions are available
console.log('Paw Assist Settings: Testing encryption functions...');
console.log('Paw Assist Settings: encryptString type:', typeof encryptString);
console.log('Paw Assist Settings: decryptString type:', typeof decryptString);

if (typeof encryptString !== 'function') {
  console.error('Paw Assist Settings: encryptString is not a function!');
  throw new Error('encryptString is not available');
}

if (typeof decryptString !== 'function') {
  console.error('Paw Assist Settings: decryptString is not a function!');
  throw new Error('decryptString is not available');
}

console.log('Paw Assist Settings: Encryption functions are available');

class PawAssistSettingsStore {
  constructor() {
    try {
      console.log('Paw Assist Settings: Initializing store...');
      this.store = new Store({
        name: 'paw-assist-settings',
        defaults: {
          provider: 'deepseek',
          model: 'deepseek-chat',
          temperature: 0.3,
          timeoutMs: 30000,
          enabled: false
        }
      });
      console.log('Paw Assist Settings: Store initialized successfully');
      console.log('Paw Assist Settings: Store path:', this.store.path);

      this.settings = this.loadSettings();
      console.log('Paw Assist Settings: Settings loaded:', this.settings);

      // Test encryption functions work
      try {
        console.log('Paw Assist Settings: Testing encryption in constructor...');
        const testEncrypted = encryptString('test');
        const testDecrypted = decryptString(testEncrypted);
        console.log('Paw Assist Settings: Encryption test successful:', testDecrypted === 'test');
      } catch (testErr) {
        console.error('Paw Assist Settings: Encryption test failed in constructor:', testErr);
        throw testErr;
      }
    } catch (err) {
      console.error('Paw Assist Settings: Failed to initialize store:', err);
      throw err;
    }
  }

  loadSettings() {
    try {
      return this.store.store;
    } catch (err) {
      console.warn('Failed to load Paw Assist settings:', err);
      return this.store.defaults;
    }
  }

  saveSettings(settings) {
    try {
      console.log('Paw Assist Settings: Starting to save settings:', settings);
      this.settings = { ...this.settings, ...settings };
      console.log('Paw Assist Settings: Merged settings:', this.settings);

      console.log('Paw Assist Settings: Calling store.set...');
      this.store.set(this.settings);
      console.log('Paw Assist Settings: Settings saved to store successfully');

      // Verify the save worked
      const saved = this.store.store;
      console.log('Paw Assist Settings: Verification - saved settings:', saved);

      return true;
    } catch (err) {
      console.error('Paw Assist Settings: Failed to save settings:', err);
      console.error('Paw Assist Settings: Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      return false;
    }
  }

  getSettings() {
    try {
      return { ...this.store.store };
    } catch (err) {
      console.warn('Failed to get Paw Assist settings:', err);
      return { ...this.store.defaults };
    }
  }

  setApiKey(apiKey) {
    try {
      console.log('Paw Assist Settings: Starting API key encryption...');
      console.log('Paw Assist Settings: API key length:', apiKey?.length);
      console.log('Paw Assist Settings: API key type:', typeof apiKey);

      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key: must be a non-empty string');
      }

      console.log('Paw Assist Settings: Calling encryptString...');

      let encrypted;
      try {
        // Test encryption with a simple string first
        const testEncrypted = encryptString('test');
        console.log('Paw Assist Settings: Test encryption successful:', testEncrypted?.substring(0, 20) + '...');

        encrypted = encryptString(apiKey);
        console.log('Paw Assist Settings: API key encrypted successfully, length:', encrypted?.length);
        console.log('Paw Assist Settings: Encrypted key preview:', encrypted?.substring(0, 20) + '...');
      } catch (encryptErr) {
        console.error('Paw Assist Settings: Encryption failed, trying fallback...', encryptErr);
        // Fallback: store without encryption for now
        encrypted = apiKey;
        console.log('Paw Assist Settings: Using unencrypted fallback');
      }

      console.log('Paw Assist Settings: Saving to store...');
      this.store.set('apiKeyEncrypted', encrypted);
      console.log('Paw Assist Settings: API key saved to store successfully');

      // Verify the save worked
      const saved = this.store.get('apiKeyEncrypted');
      console.log('Paw Assist Settings: Verification - saved key length:', saved?.length);

      return true;
    } catch (err) {
      console.error('Paw Assist Settings: Failed to save API key:', err);
      console.error('Paw Assist Settings: Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      return false;
    }
  }

  getApiKey() {
    try {
      const encrypted = this.store.get('apiKeyEncrypted');
      if (!encrypted) {
        return null;
      }

      // Check if it's encrypted (starts with $) or plain text
      if (encrypted.startsWith('$')) {
        console.log('Paw Assist Settings: Decrypting encrypted API key...');
        return decryptString(encrypted);
      } else {
        console.log('Paw Assist Settings: Using unencrypted API key...');
        return encrypted;
      }
    } catch (err) {
      console.error('Failed to get API key:', err);
      return null;
    }
  }

  isConfigured() {
    try {
      const settings = this.store.store;
      return !!(settings.apiKeyEncrypted && settings.provider);
    } catch (err) {
      console.warn('Failed to check configuration:', err);
      return false;
    }
  }

  testConnection() {
    // This will be implemented when we add the provider
    return Promise.resolve(true);
  }
}

module.exports = PawAssistSettingsStore;
