import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IconBrain, IconUpload, IconFileText, IconLoader2 } from '@tabler/icons';
import aiService from '../../../../services/ai';
import Modal from 'components/Modal';
import StyledWrapper from './StyledWrapper';

const AIGenerateCollection = ({ onClose, handleSubmit }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const aiSettings = preferences.ai || {};

  const [isLoading, setIsLoading] = useState(false);
  const [apiSpec, setApiSpec] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [error, setError] = useState('');
  const [generatedCollection, setGeneratedCollection] = useState(null);

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
    if (!apiSpec.trim()) {
      setError('Please provide API documentation');
      return;
    }

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
      const result = await aiService.generateCollection(apiSpec, {
        collectionName,
        description,
        model: selectedModel,
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.maxTokens
      });

      setGeneratedCollection(result);
    } catch (error) {
      setError(`Failed to generate collection: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (generatedCollection) {
      // Convert the AI-generated collection to Bruno format
      const brunoCollection = {
        name: generatedCollection.name,
        description: generatedCollection.description,
        items: generatedCollection.endpoints.map(endpoint => ({
          uid: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: endpoint.name,
          type: 'http-request',
          request: {
            method: endpoint.method,
            url: endpoint.url,
            headers: endpoint.headers || [],
            body: endpoint.body ? JSON.stringify(endpoint.body, null, 2) : null,
            auth: { mode: 'none' },
            assertions: [],
            tests: '',
            docs: endpoint.description || '',
            params: [],
            vars: { req: [] }
          }
        }))
      };

      handleSubmit({ collection: brunoCollection });
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
      <Modal size="lg" title="Generate Collection with AI" handleCancel={onClose} hideFooter={true}>
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

          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Documentation</label>
              <textarea
                value={apiSpec}
                onChange={(e) => setApiSpec(e.target.value)}
                placeholder="Paste your OpenAPI/Swagger specification, API documentation, or describe your API..."
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can paste OpenAPI/Swagger JSON/YAML, markdown documentation, or plain text describing your API endpoints.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Collection Name</label>
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="My API Collection"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the API"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-md bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Generated Collection Preview */}
          {generatedCollection && (
            <div className="space-y-3">
              <h4 className="font-medium">Generated Collection Preview</h4>
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="font-medium">{generatedCollection.name}</div>
                {generatedCollection.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {generatedCollection.description}
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  {generatedCollection.endpoints.length} endpoints generated
                </div>
                <div className="mt-2 space-y-1">
                  {generatedCollection.endpoints.slice(0, 5).map((endpoint, index) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                      {endpoint.method} {endpoint.url}
                    </div>
                  ))}
                  {generatedCollection.endpoints.length > 5 && (
                    <div className="text-xs text-gray-500">
                      ... and {generatedCollection.endpoints.length - 5} more
                    </div>
                  )}
                </div>
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
            
            {!generatedCollection ? (
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
                    <IconBrain size={16} />
                    Generate Collection
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="btn btn-primary flex items-center gap-2"
              >
                <IconUpload size={16} />
                Import Collection
              </button>
            )}
          </div>
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default AIGenerateCollection; 