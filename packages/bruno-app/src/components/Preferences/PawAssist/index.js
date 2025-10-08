import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconRobot } from '@tabler/icons';
import get from 'lodash/get';

const PawAssist = ({ close }) => {
  const { theme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  const [providers, setProviders] = useState([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const result = await window.pawAssist.getProviders();
      if (result.ok) {
        setProviders(result.providers);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const validationSchema = Yup.object().shape({
    provider: Yup.string().required('Provider is required'),
    apiKey: Yup.string().required('API key is required'),
    model: Yup.string().required('Model is required'),
    temperature: Yup.number().min(0).max(1),
    timeoutMs: Yup.number().min(5000).max(120000)
  });

  const formik = useFormik({
    initialValues: {
      provider: get(preferences, 'pawAssist.provider', 'deepseek'),
      apiKey: get(preferences, 'pawAssist.apiKey', ''),
      model: get(preferences, 'pawAssist.model', 'deepseek-chat'),
      temperature: get(preferences, 'pawAssist.temperature', 0.3),
      timeoutMs: get(preferences, 'pawAssist.timeoutMs', 30000),
      enabled: get(preferences, 'pawAssist.enabled', false)
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const validatedValues = await validationSchema.validate(values, { abortEarly: false });
        handleSave(validatedValues);
      } catch (error) {
        console.error('Paw Assist preferences validation error:', error.message);
        setError(error.message);
      }
    }
  });

  const handleSave = async (newPawAssistPreferences) => {
    try {
      // Save to main preferences
      dispatch(savePreferences({
        ...preferences,
        pawAssist: newPawAssistPreferences
      }));

      // Also save to Paw Assist settings store
      const result = await window.pawAssist.updateSettings({
        settings: {
          provider: newPawAssistPreferences.provider,
          model: newPawAssistPreferences.model,
          temperature: newPawAssistPreferences.temperature,
          timeoutMs: newPawAssistPreferences.timeoutMs,
          enabled: newPawAssistPreferences.enabled
        },
        apiKey: newPawAssistPreferences.apiKey
      });

      if (result.ok) {
        toast.success('Paw Assist preferences saved successfully');
        close();
      } else {
        toast.error(result.error.message);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save Paw Assist preferences');
    }
  };

  const handleTestConnection = async () => {
    if (!formik.values.apiKey.trim()) {
      setError('Please enter an API key first');
      return;
    }

    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // First save the API key
      await window.pawAssist.updateSettings({
        settings: {
          provider: formik.values.provider,
          model: formik.values.model,
          temperature: formik.values.temperature,
          timeoutMs: formik.values.timeoutMs,
          enabled: formik.values.enabled
        },
        apiKey: formik.values.apiKey
      });

      // Then test the connection
      const result = await window.pawAssist.testConnection();

      if (result.ok) {
        setTestResult(result.connected ? 'success' : 'failed');
        if (result.connected) {
          toast.success('Connection test successful!');
        } else {
          toast.error('Connection test failed');
        }
      } else {
        setTestResult('failed');
        setError(result.error.message);
        toast.error(result.error.message);
      }
    } catch (err) {
      setTestResult('failed');
      setError('Connection test failed. Please check your API key.');
      toast.error('Connection test failed. Please check your API key.');
      console.error('Test connection error:', err);
    } finally {
      setTesting(false);
    }
  };

  const handleProviderChange = (provider) => {
    formik.setFieldValue('provider', provider);
    // Set default model based on provider
    const defaultModels = {
      deepseek: 'deepseek-chat',
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-sonnet-20240229'
    };
    formik.setFieldValue('model', defaultModels[provider] || 'deepseek-chat');
  };

  return (
    <StyledWrapper theme={theme}>
      <form className="bruno-form" onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <IconRobot size={20} className="mr-2 text-blue-500" />
            <h2 className="text-lg font-semibold">Paw Assist Settings</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-wrap">
            Configure your AI assistant for generating and converting Bruno scripts.
          </p>
        </div>

        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">AI Provider</label>
            <select
              name="provider"
              value={formik.values.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="form-input"
            >
              {providers.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.displayName}
                </option>
              ))}
            </select>
            {formik.errors.provider && formik.touched.provider && (
              <div className="form-error">{formik.errors.provider}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              type="password"
              name="apiKey"
              value={formik.values.apiKey}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Enter your API key"
              className="form-input"
            />
            <div className="form-help">
              Your API key is encrypted and stored locally. It&apos;s never sent to Bruno servers.
            </div>
            {formik.errors.apiKey && formik.touched.apiKey && (
              <div className="form-error">{formik.errors.apiKey}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Model</label>
            <input
              type="text"
              name="model"
              value={formik.values.model}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="form-input"
            />
            {formik.errors.model && formik.touched.model && (
              <div className="form-error">{formik.errors.model}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Temperature: {formik.values.temperature}
            </label>
            <input
              type="range"
              name="temperature"
              min="0"
              max="1"
              step="0.1"
              value={formik.values.temperature}
              onChange={formik.handleChange}
              className="form-slider"
            />
            <div className="form-help">
              Lower values make responses more focused, higher values more creative.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Timeout: {formik.values.timeoutMs / 1000}s
            </label>
            <input
              type="range"
              name="timeoutMs"
              min="5000"
              max="120000"
              step="5000"
              value={formik.values.timeoutMs}
              onChange={(e) => formik.setFieldValue('timeoutMs', parseInt(e.target.value))}
              className="form-slider"
            />
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                name="enabled"
                checked={formik.values.enabled}
                onChange={formik.handleChange}
              />
              Enable Paw Assist
            </label>
          </div>
        </div>

        {error && (
          <div className="form-error-message">
            {error}
          </div>
        )}

        {testResult && (
          <div className={`test-result ${testResult}`}>
            {testResult === 'success' ? '✓ Connection successful!' : '✗ Connection failed'}
          </div>
        )}

        <div className="mt-10 flex gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !formik.values.apiKey.trim()}
            className="btn btn-sm btn-secondary"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button type="submit" className="btn btn-sm btn-primary">
            Save
          </button>
        </div>
      </form>
    </StyledWrapper>
  );
};

export default PawAssist;
