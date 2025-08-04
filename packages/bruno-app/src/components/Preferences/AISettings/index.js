import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconBrain, IconKey, IconTestPipe, IconWand } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import aiService from '../../../services/ai';
import ToggleSelector from 'components/RequestPane/Settings/ToggleSelector';
import StyledWrapper from './StyledWrapper';

const AISettings = ({ close }) => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const aiSettings = preferences.ai || {};

  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    openaiKey: '',
    anthropicKey: '',
    defaultOpenaiModel: 'gpt-4',
    defaultAnthropicModel: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 4000,
    ...aiSettings
  });

  useEffect(() => {
    // Initialize AI service with current settings
    aiService.initialize(preferences);
  }, [preferences]);

  // Update local settings when preferences change
  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      ...aiSettings
    }));
  }, [aiSettings]);

  const handleSettingChange = (key, value) => {
    const newSettings = {
      ...localSettings,
      [key]: value
    };
    setLocalSettings(newSettings);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validate the settings before saving
      if (localSettings.enabled && !localSettings.openaiKey && !localSettings.anthropicKey) {
        throw new Error('Please provide at least one API key when AI features are enabled');
      }

      // Ensure the AI settings are properly serialized
      const serializedAISettings = {
        enabled: Boolean(localSettings.enabled),
        openaiKey: String(localSettings.openaiKey || ''),
        anthropicKey: String(localSettings.anthropicKey || ''),
        defaultOpenaiModel: String(localSettings.defaultOpenaiModel || 'gpt-4'),
        defaultAnthropicModel: String(localSettings.defaultAnthropicModel || 'claude-3-sonnet-20240229'),
        temperature: Number(localSettings.temperature || 0.7),
        maxTokens: Number(localSettings.maxTokens || 4000)
      };

      const newPreferences = {
        ...preferences,
        ai: serializedAISettings
      };
      
      await dispatch(savePreferences(newPreferences));
      
      // Re-initialize AI service with new settings
      aiService.initialize(newPreferences);
      
      setTestResult({ success: true, message: 'AI settings saved successfully' });
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      setTestResult({ 
        success: false, 
        message: `Failed to save settings: ${error.message || 'Unknown error occurred'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!localSettings.enabled) {
      setTestResult({ success: false, message: 'Please enable AI features first' });
      return;
    }

    if (!localSettings.openaiKey && !localSettings.anthropicKey) {
      setTestResult({ success: false, message: 'Please provide at least one API key' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testing AI connection with settings:', {
        enabled: localSettings.enabled,
        hasOpenAIKey: !!localSettings.openaiKey,
        hasAnthropicKey: !!localSettings.anthropicKey
      });
      
      const result = await aiService.testConnection();
      console.log('Connection test completed:', result);
      setTestResult(result);
    } catch (error) {
      console.error('Connection test error:', error);
      setTestResult({ 
        success: false, 
        message: `Connection test failed: ${error.message || 'Unknown error occurred'}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNetworkDiagnostic = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('Running network diagnostics...');
      
      const results = [];
      
      // Test 1: Basic internet connectivity
      try {
        const response = await fetch('https://httpbin.org/get');
        results.push('✅ General internet connectivity: Working');
      } catch (error) {
        results.push('❌ General internet connectivity: Failed');
      }
      
      // Test 2: DNS resolution
      try {
        const response = await fetch('https://api.openai.com/v1/models', { method: 'HEAD' });
        results.push('✅ DNS resolution for api.openai.com: Working');
      } catch (error) {
        results.push('❌ DNS resolution for api.openai.com: Failed');
      }
      
      // Test 3: OpenAI API reachability
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localSettings.openaiKey || 'test-key'}`
          }
        });
        if (response.status === 401) {
          results.push('✅ OpenAI API reachability: Working (but API key may be invalid)');
        } else {
          results.push(`✅ OpenAI API reachability: Working (status: ${response.status})`);
        }
      } catch (error) {
        results.push('❌ OpenAI API reachability: Failed');
      }
      
      const diagnosticMessage = results.join('\n');
      setTestResult({
        success: results.every(r => r.startsWith('✅')),
        message: `Network Diagnostic Results:\n\n${diagnosticMessage}`
      });
      
    } catch (error) {
      setTestResult({
        success: false,
        message: `Network diagnostic failed: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearKeys = () => {
    setLocalSettings({
      ...localSettings,
      openaiKey: '',
      anthropicKey: ''
    });
  };

  const getAvailableModels = (provider) => {
    return aiService.getAvailableModels(provider);
  };

  return (
    <StyledWrapper className="w-full h-full flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-4">
        <IconBrain size={20} className="text-blue-600" />
        <h3 className="text-lg font-medium">AI Integration</h3>
      </div>

      <div className="space-y-6">
        {/* Enable/Disable AI */}
        <div className="space-y-4">
          <ToggleSelector
            checked={localSettings.enabled}
            onChange={(enabled) => handleSettingChange('enabled', enabled)}
            label="Enable AI Features"
            description="Allow Bruno to use AI services for generating collections and tests"
            size="medium"
          />
        </div>

        {localSettings.enabled && (
          <>
            {/* OpenAI Settings */}
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <IconKey size={16} />
                <h4 className="font-medium">OpenAI Configuration</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="password"
                    value={localSettings.openaiKey}
                    onChange={(e) => handleSettingChange('openaiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default Model</label>
                  <select
                    value={localSettings.defaultOpenaiModel}
                    onChange={(e) => handleSettingChange('defaultOpenaiModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  >
                    {getAvailableModels('openai').map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Anthropic Settings */}
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <IconKey size={16} />
                <h4 className="font-medium">Anthropic Configuration</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="password"
                    value={localSettings.anthropicKey}
                    onChange={(e) => handleSettingChange('anthropicKey', e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Default Model</label>
                  <select
                    value={localSettings.defaultAnthropicModel}
                    onChange={(e) => handleSettingChange('defaultAnthropicModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  >
                    {getAvailableModels('anthropic').map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <IconWand size={16} />
                <h4 className="font-medium">Advanced Settings</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={localSettings.temperature}
                    onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Focused (0.0)</span>
                    <span>{localSettings.temperature}</span>
                    <span>Creative (2.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="100"
                    max="8000"
                    step="100"
                    value={localSettings.maxTokens}
                    onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Test Connection */}
            <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <IconTestPipe size={16} />
                <h4 className="font-medium">Test Connection</h4>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="btn btn-sm btn-secondary"
                >
                  {isLoading ? 'Testing...' : 'Test AI Connection'}
                </button>
                
                <button
                  onClick={handleNetworkDiagnostic}
                  disabled={isLoading}
                  className="btn btn-sm btn-outline"
                >
                  Network Diagnostic
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-md text-sm ${
                  testResult.success 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  <pre className="whitespace-pre-wrap text-xs">{testResult.message}</pre>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Privacy & Security</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                When using AI features, your API documentation and request data will be sent to the selected AI provider. 
                Bruno does not store this data, but it will be subject to the provider's privacy policy. 
                API keys are stored locally and only sent to the respective providers.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleClearKeys}
          className="btn btn-sm btn-outline"
        >
          Clear API Keys
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={close}
          className="btn btn-sm btn-outline"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="btn btn-sm btn-primary"
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </StyledWrapper>
  );
};

export default AISettings; 