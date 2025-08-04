import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconBrain, IconTestPipe, IconLoader2, IconPlus } from '@tabler/icons';
import aiService from '../../../../services/ai';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const AIGenerateTests = ({ request, response, existingTests, onClose, onTestsGenerated }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const aiSettings = preferences.ai || {};

  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [focusOn, setFocusOn] = useState('');
  const [error, setError] = useState('');
  const [generatedTests, setGeneratedTests] = useState([]);
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Initialize AI service
  React.useEffect(() => {
    aiService.initialize(preferences);
    
    // Set default model
    if (aiSettings.openaiKey) {
      setSelectedModel(aiSettings.defaultOpenaiModel || 'gpt-4');
    } else if (aiSettings.anthropicKey) {
      setSelectedModel(aiSettings.defaultAnthropicModel || 'claude-3-sonnet-20240229');
    }
  }, [preferences, aiSettings]);

  const handleGenerate = async () => {
    if (!aiSettings.enabled) {
      setError('AI features are not enabled. Please enable them in Preferences > AI');
      return;
    }

    if (!aiSettings.openaiKey && !aiSettings.anthropicKey) {
      setError('Please configure at least one AI provider in Preferences > AI');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await aiService.generateTests(request, response, {
        model: selectedModel,
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.maxTokens,
        includeEdgeCases,
        focusOn: focusOn || undefined
      });

      setGeneratedTests(result);
    } catch (error) {
      setError(`Failed to generate tests: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAdditional = async () => {
    if (!additionalPrompt.trim()) {
      setError('Please provide a description of the additional tests you want');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await aiService.generateAdditionalTests(
        request, 
        response, 
        additionalPrompt, 
        existingTests
      );

      setGeneratedTests(result);
    } catch (error) {
      setError(`Failed to generate additional tests: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTests = () => {
    if (generatedTests.length > 0) {
      const testCode = generatedTests.map(test => test.code).join('\n\n');
      onTestsGenerated(testCode);
      onClose();
    }
  };

  const getAvailableModels = () => {
    const models = [];
    
    if (aiSettings.openaiKey) {
      models.push(...aiService.getAvailableModels('openai').map(model => ({
        ...model,
        provider: 'OpenAI'
      })));
    }
    
    if (aiSettings.anthropicKey) {
      models.push(...aiService.getAvailableModels('anthropic').map(model => ({
        ...model,
        provider: 'Anthropic'
      })));
    }
    
    return models;
  };

  const availableModels = getAvailableModels();

  return (
    <StyledWrapper>
      <Modal size="lg" title="Generate Tests with AI" handleCancel={onClose} hideFooter={true}>
        <div className="space-y-6">
          {/* AI Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <IconBrain size={16} className="text-blue-600" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {aiSettings.enabled 
                ? 'AI features are enabled' 
                : 'AI features are disabled. Enable them in Preferences > AI'
              }
            </span>
          </div>

          {/* Request Info */}
          <div className="space-y-3">
            <h4 className="font-medium">Request Details</h4>
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-sm">
                <div><strong>Method:</strong> {request.method}</div>
                <div><strong>URL:</strong> {request.url}</div>
                {request.headers && request.headers.length > 0 && (
                  <div><strong>Headers:</strong> {request.headers.length} headers</div>
                )}
                {request.body && (
                  <div><strong>Body:</strong> Present</div>
                )}
              </div>
            </div>
          </div>

          {/* Generation Options */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.provider} - {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Focus Area (Optional)</label>
                <input
                  type="text"
                  value={focusOn}
                  onChange={(e) => setFocusOn(e.target.value)}
                  placeholder="e.g., authentication, error handling"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeEdgeCases"
                checked={includeEdgeCases}
                onChange={(e) => setIncludeEdgeCases(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="includeEdgeCases" className="text-sm">
                Include edge cases and error scenarios
              </label>
            </div>
          </div>

          {/* Additional Tests Section */}
          <div className="space-y-3">
            <h4 className="font-medium">Generate Additional Tests</h4>
            <div className="space-y-2">
              <textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="Describe additional tests you want (e.g., 'Add tests for 401 unauthorized', 'Test pagination')"
                className="w-full h-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 resize-none"
              />
              <button
                onClick={handleGenerateAdditional}
                disabled={isLoading || !additionalPrompt.trim()}
                className="btn btn-sm btn-outline flex items-center gap-2"
              >
                <IconPlus size={14} />
                Generate Additional Tests
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-md bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Generated Tests Preview */}
          {generatedTests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Generated Tests Preview</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {generatedTests.map((test, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="font-medium text-sm mb-2">{test.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{test.description}</div>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                      <code>{test.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Cancel
            </button>
            
            <div className="flex-1" />
            
            {generatedTests.length === 0 ? (
              <button
                onClick={handleGenerate}
                disabled={isLoading || !aiSettings.enabled}
                className="btn btn-primary flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconTestPipe size={16} />
                    Generate Tests
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyTests}
                className="btn btn-primary flex items-center gap-2"
              >
                <IconTestPipe size={16} />
                Apply Tests
              </button>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default AIGenerateTests; 